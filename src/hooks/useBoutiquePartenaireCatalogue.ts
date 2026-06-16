import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import type { BoutiqueGlobalProduit } from '@/hooks/useBoutiqueGlobalCatalogue'

export interface BoutiqueAssociationProduitPartenaire {
  id: string
  association_id: string
  global_produit_id: string
  produit_id: string | null
  is_active: boolean
  custom_price: number | null
  activated_at: string
}

export function useBoutiquePartenaireCatalogue() {
  const { currentAssociation } = useAssociation()
  const [catalogue, setCatalogue] = useState<BoutiqueGlobalProduit[]>([])
  const [activations, setActivations] = useState<BoutiqueAssociationProduitPartenaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const [catalogueRes, activationsRes] = await Promise.all([
      supabase
        .from('boutique_global_produits')
        .select('*, boutique_global_produit_variantes(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('boutique_association_produits_partenaires')
        .select('*')
        .eq('association_id', currentAssociation.id),
    ])

    if (catalogueRes.error) setError(catalogueRes.error.message)
    else setCatalogue(catalogueRes.data || [])

    if (!activationsRes.error) setActivations(activationsRes.data || [])

    setLoading(false)
  }, [currentAssociation])

  useEffect(() => { fetchAll() }, [fetchAll])

  const getActivation = (globalProduitId: string) =>
    activations.find((a) => a.global_produit_id === globalProduitId) ?? null

  const activate = async (globalProduitId: string, customPrice?: number | null) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { error: err } = await supabase.rpc('activate_global_produit', {
      p_association_id: currentAssociation.id,
      p_global_produit_id: globalProduitId,
      p_custom_price: customPrice ?? null,
    })
    if (err) throw err
    await fetchAll()
  }

  const deactivate = async (globalProduitId: string) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { error: err } = await supabase.rpc('deactivate_global_produit', {
      p_association_id: currentAssociation.id,
      p_global_produit_id: globalProduitId,
    })
    if (err) throw err
    await fetchAll()
  }

  const resync = async (globalProduitId: string) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { error: err } = await supabase.rpc('resync_global_produit', {
      p_association_id: currentAssociation.id,
      p_global_produit_id: globalProduitId,
    })
    if (err) throw err
    await fetchAll()
  }

  return {
    catalogue,
    activations,
    loading,
    error,
    refetch: fetchAll,
    getActivation,
    activate,
    deactivate,
    resync,
  }
}
