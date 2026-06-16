import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface BoutiqueGlobalVariante {
  id: string
  global_produit_id: string
  type: 'size' | 'color' | 'material' | 'custom'
  value: string
  price_modifier: number
  printful_variant_id: number | null
  created_at: string
}

export interface BoutiqueGlobalProduit {
  id: string
  name: string
  description: string | null
  image_url: string | null
  category_name: string | null
  base_price: number
  commission_percent: number
  cost_price: number | null
  sku: string | null
  printful_sync_variant_id: number | null
  stock_status: 'in_stock' | 'out_of_stock' | 'coming_soon'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  boutique_global_produit_variantes?: BoutiqueGlobalVariante[]
}

export type BoutiqueGlobalProduitInput = {
  name: string
  description: string | null
  image_url: string | null
  category_name: string | null
  base_price: number
  commission_percent: number
  cost_price: number | null
  sku: string | null
  stock_status: 'in_stock' | 'out_of_stock' | 'coming_soon'
  status: 'active' | 'inactive'
  variantes?: Omit<BoutiqueGlobalVariante, 'id' | 'global_produit_id' | 'created_at'>[]
}

export function useBoutiqueGlobalCatalogue() {
  const [produits, setProduits] = useState<BoutiqueGlobalProduit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('boutique_global_produits')
      .select('*, boutique_global_produit_variantes(*)')
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    else setProduits(data || [])

    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const addProduit = async (input: BoutiqueGlobalProduitInput) => {
    const { variantes, ...produitData } = input

    const { data: produit, error: pErr } = await supabase
      .from('boutique_global_produits')
      .insert(produitData)
      .select()
      .single()

    if (pErr) throw pErr

    if (variantes && variantes.length > 0) {
      const { error: vErr } = await supabase
        .from('boutique_global_produit_variantes')
        .insert(variantes.map((v) => ({ ...v, global_produit_id: produit.id })))
      if (vErr) throw vErr
    }

    await fetchAll()
    return produit
  }

  const updateProduit = async (id: string, updates: Partial<BoutiqueGlobalProduitInput>) => {
    const { variantes, ...produitData } = updates

    const { error: err } = await supabase
      .from('boutique_global_produits')
      .update({ ...produitData, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err

    if (variantes) {
      const { error: delErr } = await supabase
        .from('boutique_global_produit_variantes')
        .delete()
        .eq('global_produit_id', id)
      if (delErr) throw delErr

      if (variantes.length > 0) {
        const { error: vErr } = await supabase
          .from('boutique_global_produit_variantes')
          .insert(variantes.map((v) => ({ ...v, global_produit_id: id })))
        if (vErr) throw vErr
      }
    }

    await fetchAll()
  }

  const deleteProduit = async (id: string) => {
    const { error: err } = await supabase.from('boutique_global_produits').delete().eq('id', id)
    if (err) throw err
    setProduits((prev) => prev.filter((p) => p.id !== id))
  }

  const addVariante = async (globalProduitId: string, variante: Omit<BoutiqueGlobalVariante, 'id' | 'global_produit_id' | 'created_at'>) => {
    const { error: err } = await supabase
      .from('boutique_global_produit_variantes')
      .insert({ ...variante, global_produit_id: globalProduitId })
    if (err) throw err
    await fetchAll()
  }

  const deleteVariante = async (id: string) => {
    const { error: err } = await supabase.from('boutique_global_produit_variantes').delete().eq('id', id)
    if (err) throw err
    await fetchAll()
  }

  return {
    produits,
    loading,
    error,
    refetch: fetchAll,
    addProduit,
    updateProduit,
    deleteProduit,
    addVariante,
    deleteVariante,
  }
}
