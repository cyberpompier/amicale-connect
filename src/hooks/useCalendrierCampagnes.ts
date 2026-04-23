import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'

export interface CalendrierCampagne {
  id: string
  association_id: string
  name: string
  year: number
  objective_amount: number
  objective_calendriers: number
  unit_price: number
  start_date: string | null
  end_date: string | null
  status: 'active' | 'closed' | 'archived'
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CalendrierCampagneInput = {
  name: string
  year: number
  objective_amount: number
  objective_calendriers: number
  unit_price: number
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
}

export function useCalendrierCampagnes() {
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const [campagnes, setCampagnes] = useState<CalendrierCampagne[]>([])
  const [activeCampagne, setActiveCampagne] = useState<CalendrierCampagne | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCampagnes = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('calendrier_campagnes')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setCampagnes(data)
      // Campagne active = la plus récente avec status 'active'
      const active = data.find((c) => c.status === 'active')
      setActiveCampagne(active ?? null)
    }
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => { fetchCampagnes() }, [fetchCampagnes])

  const createCampagne = async (input: CalendrierCampagneInput) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('calendrier_campagnes')
      .insert({
        association_id: currentAssociation.id,
        ...input,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    await fetchCampagnes()
    return data
  }

  const updateCampagne = async (id: string, updates: Partial<CalendrierCampagneInput>) => {
    const { error } = await supabase
      .from('calendrier_campagnes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchCampagnes()
  }

  const closeCampagne = async (id: string) => {
    const { error } = await supabase
      .from('calendrier_campagnes')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchCampagnes()
  }

  const archiveCampagne = async (id: string) => {
    const { error } = await supabase
      .from('calendrier_campagnes')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchCampagnes()
  }

  const reactivateCampagne = async (id: string) => {
    const { error } = await supabase
      .from('calendrier_campagnes')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchCampagnes()
  }

  const deleteCampagne = async (id: string) => {
    const { error } = await supabase.from('calendrier_campagnes').delete().eq('id', id)
    if (error) throw error
    await fetchCampagnes()
  }

  // Créer ou récupérer la campagne de l'année en cours
  const ensureCurrentCampagne = async () => {
    if (!currentAssociation || !user) return null
    const year = new Date().getFullYear()

    const existing = campagnes.find((c) => c.year === year && c.status === 'active')
    if (existing) return existing

    return await createCampagne({
      name: `Tournée ${year}`,
      year,
      objective_amount: 15000,
      objective_calendriers: 1500,
      unit_price: 10,
      notes: null,
    })
  }

  return {
    campagnes,
    activeCampagne,
    loading,
    refetch: fetchCampagnes,
    createCampagne,
    updateCampagne,
    closeCampagne,
    archiveCampagne,
    reactivateCampagne,
    deleteCampagne,
    ensureCurrentCampagne,
  }
}
