import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuth } from '@/hooks/useAuth'

export interface Virement {
  id: string
  association_id: string
  compte_source_id: string
  compte_destination_id: string
  montant: number
  date: string
  description: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface VirementAvecComptes extends Virement {
  compte_source?: { nom: string; icone: string; couleur: string }
  compte_destination?: { nom: string; icone: string; couleur: string }
}

export type VirementInput = {
  compte_source_id: string
  compte_destination_id: string
  montant: number
  date: string
  description: string
  notes?: string | null
}

export function useVirements() {
  const { currentAssociation } = useAssociation()
  const { user } = useAuth()
  const [virements, setVirements] = useState<VirementAvecComptes[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVirements = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const { data, error: e } = await supabase
      .from('virements')
      .select(`
        *,
        compte_source:comptes!virements_compte_source_id_fkey(nom, icone, couleur),
        compte_destination:comptes!virements_compte_destination_id_fkey(nom, icone, couleur)
      `)
      .eq('association_id', currentAssociation.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (e) { setError(e.message); setLoading(false); return }
    setVirements((data || []) as VirementAvecComptes[])
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => { fetchVirements() }, [fetchVirements])

  const addVirement = async (input: VirementInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')
    if (input.compte_source_id === input.compte_destination_id)
      throw new Error('Le compte source et destination doivent être différents')
    if (input.montant <= 0) throw new Error('Le montant doit être positif')

    const { error } = await supabase.from('virements').insert({
      ...input,
      association_id: currentAssociation.id,
      created_by: user?.id ?? null,
    })
    if (error) throw error
    await fetchVirements()
  }

  const deleteVirement = async (id: string) => {
    const { error } = await supabase.from('virements').delete().eq('id', id)
    if (error) throw error
    setVirements(prev => prev.filter(v => v.id !== id))
  }

  const totalVirements = virements.reduce((sum, v) => sum + Number(v.montant), 0)

  return { virements, loading, error, totalVirements, refetch: fetchVirements, addVirement, deleteVirement }
}
