import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'

export interface BoutiqueVendor {
  id: string
  association_id: string
  name: string
  description: string | null
  is_primary: boolean
  commission_percent: number
  status: 'active' | 'inactive'
  created_at: string
}

export interface BoutiqueCategory {
  id: string
  association_id: string
  name: string
  description: string | null
  icon_name: string | null
  order: number
  created_at: string
}

export interface BoutiqueVariante {
  id: string
  produit_id: string
  type: 'size' | 'color' | 'material' | 'custom'
  value: string
  stock_qty: number
  sku_variant: string | null
  price_modifier: number
  created_at: string
}

export interface BoutiqueProduit {
  id: string
  association_id: string
  vendor_id: string
  category_id: string | null
  name: string
  description: string | null
  image_url: string | null
  base_price: number
  stock_status: 'in_stock' | 'out_of_stock' | 'coming_soon'
  payment_type: 'stripe' | 'manual' | 'both'
  sku: string | null
  badges: string[]
  discount_percent: number
  created_by: string | null
  created_at: string
  updated_at: string
  boutique_vendors?: BoutiqueVendor
  boutique_categories?: BoutiqueCategory
  boutique_produit_variantes?: BoutiqueVariante[]
}

export type BoutiqueProduitInput = {
  vendor_id: string
  category_id: string | null
  name: string
  description: string | null
  image_url: string | null
  base_price: number
  stock_status: 'in_stock' | 'out_of_stock' | 'coming_soon'
  payment_type: 'stripe' | 'manual' | 'both'
  sku: string | null
  badges?: string[]
  discount_percent?: number
  variantes?: Omit<BoutiqueVariante, 'id' | 'produit_id' | 'created_at'>[]
}

export function useBoutiqueProduits() {
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const [produits, setProduits] = useState<BoutiqueProduit[]>([])
  const [vendors, setVendors] = useState<BoutiqueVendor[]>([])
  const [categories, setCategories] = useState<BoutiqueCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const [produitsRes, vendorsRes, categoriesRes] = await Promise.all([
      supabase
        .from('boutique_produits')
        .select(`*, boutique_vendors(*), boutique_categories(*), boutique_produit_variantes(*)`)
        .eq('association_id', currentAssociation.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('boutique_vendors')
        .select('*')
        .eq('association_id', currentAssociation.id)
        .eq('status', 'active')
        .order('is_primary', { ascending: false }),
      supabase
        .from('boutique_categories')
        .select('*')
        .eq('association_id', currentAssociation.id)
        .order('order', { ascending: true }),
    ])

    if (produitsRes.error) setError(produitsRes.error.message)
    else setProduits(produitsRes.data || [])

    if (!vendorsRes.error) setVendors(vendorsRes.data || [])
    if (!categoriesRes.error) setCategories(categoriesRes.data || [])

    setLoading(false)
  }, [currentAssociation])

  useEffect(() => { fetchAll() }, [fetchAll])

  const getPrimaryVendor = () => vendors.find((v) => v.is_primary) ?? null

  const ensurePrimaryVendor = async () => {
    if (!currentAssociation) return null
    const existing = vendors.find((v) => v.is_primary)
    if (existing) return existing

    const { data, error } = await supabase
      .from('boutique_vendors')
      .insert({
        association_id: currentAssociation.id,
        name: currentAssociation.name,
        is_primary: true,
        commission_percent: 5,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error
    await fetchAll()
    return data
  }

  const addProduit = async (input: BoutiqueProduitInput) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    const { variantes, ...produitData } = input

    const { data: produit, error: pErr } = await supabase
      .from('boutique_produits')
      .insert({
        ...produitData,
        association_id: currentAssociation.id,
        created_by: user.id,
      })
      .select()
      .single()

    if (pErr) throw pErr

    if (variantes && variantes.length > 0) {
      const { error: vErr } = await supabase
        .from('boutique_produit_variantes')
        .insert(variantes.map((v) => ({ ...v, produit_id: produit.id })))
      if (vErr) throw vErr
    }

    await fetchAll()
    return produit
  }

  const updateProduit = async (id: string, updates: Partial<BoutiqueProduitInput>) => {
    const { variantes, ...produitData } = updates

    const { error } = await supabase
      .from('boutique_produits')
      .update({ ...produitData, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    await fetchAll()
  }

  const deleteProduit = async (id: string) => {
    const { error } = await supabase.from('boutique_produits').delete().eq('id', id)
    if (error) throw error
    setProduits((prev) => prev.filter((p) => p.id !== id))
  }

  const addVariante = async (produitId: string, variante: Omit<BoutiqueVariante, 'id' | 'produit_id' | 'created_at'>) => {
    const { error } = await supabase
      .from('boutique_produit_variantes')
      .insert({ ...variante, produit_id: produitId })
    if (error) throw error
    await fetchAll()
  }

  const updateVariante = async (id: string, updates: Partial<BoutiqueVariante>) => {
    const { error } = await supabase
      .from('boutique_produit_variantes')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  const deleteVariante = async (id: string) => {
    const { error } = await supabase.from('boutique_produit_variantes').delete().eq('id', id)
    if (error) throw error
    await fetchAll()
  }

  const addCategory = async (name: string, description?: string) => {
    if (!currentAssociation) return
    const { error } = await supabase
      .from('boutique_categories')
      .insert({ association_id: currentAssociation.id, name, description: description || null })
    if (error) throw error
    await fetchAll()
  }

  return {
    produits,
    vendors,
    categories,
    loading,
    error,
    refetch: fetchAll,
    getPrimaryVendor,
    ensurePrimaryVendor,
    addProduit,
    updateProduit,
    deleteProduit,
    addVariante,
    updateVariante,
    deleteVariante,
    addCategory,
  }
}
