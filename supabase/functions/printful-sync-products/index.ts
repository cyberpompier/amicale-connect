import { createClient } from 'jsr:@supabase/supabase-js@2'

const PRINTFUL_API = 'https://api.printful.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface PrintfulSyncProduct {
  id: number
  name: string
  thumbnail_url?: string
}

interface PrintfulSyncVariant {
  id: number
  name: string
  retail_price: string
}

function pickSyncVariantId(syncVariants: PrintfulSyncVariant[]): number | null {
  return syncVariants.length === 1 ? syncVariants[0].id : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: isAdmin, error: adminErr } = await supabase.rpc('is_platform_admin')
  if (adminErr || !isAdmin) return json({ error: 'Accès refusé' }, 403)

  const { data: settingRow } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'printful_api_key')
    .maybeSingle()

  const apiKey = settingRow?.value
  if (!apiKey) return json({ error: 'Clé API Printful non configurée' }, 400)

  const listRes = await fetch(`${PRINTFUL_API}/store/products`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!listRes.ok) {
    return json({ error: `Erreur Printful (${listRes.status}) : ${await listRes.text()}` }, 502)
  }
  const listJson = await listRes.json()
  const products = (listJson.result ?? []) as PrintfulSyncProduct[]

  let imported = 0
  let updated = 0
  const errors: string[] = []

  for (const product of products) {
    try {
      const detailRes = await fetch(`${PRINTFUL_API}/store/products/${product.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!detailRes.ok) {
        errors.push(`${product.name} : erreur Printful (${detailRes.status})`)
        continue
      }
      const detailJson = await detailRes.json()
      const syncProduct = detailJson.result.sync_product as PrintfulSyncProduct
      const syncVariants = (detailJson.result.sync_variants ?? []) as PrintfulSyncVariant[]
      if (syncVariants.length === 0) continue

      const basePrice = Math.min(...syncVariants.map((v) => parseFloat(v.retail_price)))
      const sku = `printful:${syncProduct.id}`

      const { data: existing } = await supabase
        .from('boutique_global_produits')
        .select('id')
        .eq('sku', sku)
        .maybeSingle()

      let globalProduitId: string

      const syncVariantId = pickSyncVariantId(syncVariants)

      if (existing) {
        globalProduitId = existing.id
        await supabase
          .from('boutique_global_produits')
          .update({
            name: syncProduct.name,
            image_url: syncProduct.thumbnail_url ?? null,
            base_price: basePrice,
            printful_sync_variant_id: syncVariantId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', globalProduitId)

        await supabase
          .from('boutique_global_produit_variantes')
          .delete()
          .eq('global_produit_id', globalProduitId)

        updated++
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from('boutique_global_produits')
          .insert({
            name: syncProduct.name,
            image_url: syncProduct.thumbnail_url ?? null,
            base_price: basePrice,
            printful_sync_variant_id: syncVariantId,
            sku,
            status: 'inactive',
          })
          .select('id')
          .single()

        if (insErr || !inserted) {
          errors.push(`${syncProduct.name} : ${insErr?.message ?? 'insertion échouée'}`)
          continue
        }
        globalProduitId = inserted.id
        imported++
      }

      if (syncVariants.length > 1) {
        const prefix = `${syncProduct.name} / `
        const variantRows = syncVariants.map((v) => ({
          global_produit_id: globalProduitId,
          type: 'custom',
          value: v.name.startsWith(prefix) ? v.name.slice(prefix.length) : v.name,
          price_modifier: parseFloat(v.retail_price) - basePrice,
          printful_variant_id: v.id,
        }))
        await supabase.from('boutique_global_produit_variantes').insert(variantRows)
      }
    } catch (e) {
      errors.push(`${product.name} : ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return json({ total: products.length, imported, updated, errors })
})
