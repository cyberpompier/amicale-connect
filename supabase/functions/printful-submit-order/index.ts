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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Non authentifié' }, 401)

  const { commande_id } = await req.json().catch(() => ({}))
  if (!commande_id) return json({ error: 'commande_id manquant' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: commande, error: commandeErr } = await supabase
    .from('boutique_commandes')
    .select(`
      id, association_id, payment_status, printful_order_id,
      user_name, user_email, user_phone,
      shipping_name, shipping_address1, shipping_address2, shipping_city, shipping_zip, shipping_country,
      boutique_commande_items(
        id, quantity, variante_id,
        boutique_produits(global_produit_id),
        boutique_produit_variantes(type, value)
      )
    `)
    .eq('id', commande_id)
    .maybeSingle()

  if (commandeErr || !commande) return json({ error: 'Commande introuvable' }, 404)

  const { data: isManager, error: roleErr } = await supabase.rpc('has_role_in_association', {
    _association_id: commande.association_id,
    _roles: ['owner', 'admin'],
  })
  if (roleErr || !isManager) return json({ error: 'Accès refusé' }, 403)

  if (commande.payment_status !== 'completed') {
    return json({ error: 'La commande doit être payée avant envoi à Printful' }, 400)
  }
  if (commande.printful_order_id) {
    return json({ error: 'Cette commande a déjà été envoyée à Printful' }, 400)
  }
  if (!commande.shipping_address1 || !commande.shipping_city || !commande.shipping_zip) {
    return json({ error: 'Adresse de livraison incomplète pour cette commande' }, 400)
  }

  const items = (commande.boutique_commande_items ?? []) as any[]
  const printfulItems: { global_produit_id: string; quantity: number; type: string | null; value: string | null }[] = []

  for (const item of items) {
    const globalProduitId = item.boutique_produits?.global_produit_id
    if (!globalProduitId) continue
    printfulItems.push({
      global_produit_id: globalProduitId,
      quantity: item.quantity,
      type: item.boutique_produit_variantes?.type ?? null,
      value: item.boutique_produit_variantes?.value ?? null,
    })
  }

  if (printfulItems.length === 0) {
    return json({ error: 'Aucun produit du catalogue partagé (dropshipping) dans cette commande' }, 400)
  }

  const globalProduitIds = [...new Set(printfulItems.map((i) => i.global_produit_id))]

  const { data: globalProduits } = await supabase
    .from('boutique_global_produits')
    .select('id, name, sku, printful_sync_variant_id, boutique_global_produit_variantes(type, value, printful_variant_id)')
    .in('id', globalProduitIds)

  const globalProduitMap = new Map((globalProduits ?? []).map((g: any) => [g.id, g]))

  const orderItems: { sync_variant_id: number; quantity: number }[] = []
  const unresolved: string[] = []

  for (const item of printfulItems) {
    const gp: any = globalProduitMap.get(item.global_produit_id)
    if (!gp || !gp.sku?.startsWith('printful:')) continue

    let syncVariantId: number | null = null
    if (item.type && item.value) {
      const match = (gp.boutique_global_produit_variantes ?? []).find(
        (v: any) => v.type === item.type && v.value === item.value
      )
      syncVariantId = match?.printful_variant_id ?? null
    } else {
      syncVariantId = gp.printful_sync_variant_id ?? null
    }

    if (!syncVariantId) {
      unresolved.push(`${gp.name}${item.value ? ` (${item.value})` : ''}`)
      continue
    }

    orderItems.push({ sync_variant_id: syncVariantId, quantity: item.quantity })
  }

  if (orderItems.length === 0) {
    return json({ error: 'Aucun produit Printful (catalogue dropshipping) dans cette commande' }, 400)
  }
  if (unresolved.length > 0) {
    return json({ error: `Variante Printful introuvable pour : ${unresolved.join(', ')}` }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: settingRow } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'printful_api_key')
    .maybeSingle()

  const apiKey = settingRow?.value
  if (!apiKey) return json({ error: 'Clé API Printful non configurée' }, 400)

  const payload = {
    recipient: {
      name: commande.shipping_name || commande.user_name,
      address1: commande.shipping_address1,
      address2: commande.shipping_address2 || undefined,
      city: commande.shipping_city,
      zip: commande.shipping_zip,
      country_code: commande.shipping_country || 'FR',
      phone: commande.user_phone || undefined,
      email: commande.user_email,
    },
    items: orderItems,
    confirm: false,
  }

  const orderRes = await fetch(`${PRINTFUL_API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const orderJson = await orderRes.json()
  if (!orderRes.ok) {
    return json({ error: `Erreur Printful (${orderRes.status}) : ${orderJson?.error?.message ?? orderRes.statusText}` }, 502)
  }

  const printfulOrderId = String(orderJson.result.id)
  const printfulStatus = orderJson.result.status as string

  await admin
    .from('boutique_commandes')
    .update({
      printful_order_id: printfulOrderId,
      printful_status: printfulStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commande_id)

  return json({ printful_order_id: printfulOrderId, printful_status: printfulStatus })
})
