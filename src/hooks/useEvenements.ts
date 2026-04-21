import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface Evenement {
  id: string
  association_id: string
  titre: string
  description: string
  date: string
  heure: string | null
  lieu: string
  image_url: string | null
  tarif_amicaliste: number | null
  tarif_exterieur: number | null
  created_at: string
  updated_at: string
}

export type EvenementInput = Omit<Evenement, 'id' | 'created_at' | 'updated_at' | 'association_id'>

export function useEvenements() {
  const { currentAssociation } = useAssociation()
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvenements = useCallback(async () => {
    if (!currentAssociation) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('evenements')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .order('date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEvenements(data || [])
    }
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => {
    fetchEvenements()
  }, [fetchEvenements])

  const addEvenement = async (input: EvenementInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { error } = await supabase
      .from('evenements')
      .insert({
        ...input,
        association_id: currentAssociation.id,
      })

    if (error) throw error
    await fetchEvenements()
  }

  const updateEvenement = async (id: string, updates: Partial<EvenementInput>) => {
    const { error } = await supabase
      .from('evenements')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    await fetchEvenements()
  }

  const deleteEvenement = async (id: string) => {
    await supabase
      .from('evenement_participants')
      .delete()
      .eq('evenement_id', id)

    const { error } = await supabase
      .from('evenements')
      .delete()
      .eq('id', id)

    if (error) throw error
    setEvenements((prev) => prev.filter((e) => e.id !== id))
  }

  const getUpcoming = () => {
    const today = new Date().toISOString().split('T')[0]
    return evenements
      .filter((e) => e.date >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const getPast = () => {
    const today = new Date().toISOString().split('T')[0]
    return evenements
      .filter((e) => e.date < today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  return {
    evenements,
    loading,
    error,
    refetch: fetchEvenements,
    addEvenement,
    updateEvenement,
    deleteEvenement,
    getUpcoming,
    getPast,
  }
}
