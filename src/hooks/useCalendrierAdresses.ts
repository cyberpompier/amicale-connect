import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface CalendrierAdresse {
  id: string
  secteur_id: string
  street_name: string
  number: string | null
  building: string | null
  status: 'todo' | 'done' | 'absent' | 'refuse' | 'skip'
  visited_at: string | null
  visited_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CalendrierAdresseInput = {
  secteur_id: string
  street_name: string
  number?: string | null
  building?: string | null
  notes?: string | null
}

export function useCalendrierAdresses(secteurId?: string) {
  const [adresses, setAdresses] = useState<CalendrierAdresse[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAdresses = useCallback(async () => {
    if (!secteurId) { setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('calendrier_adresses')
      .select('*')
      .eq('secteur_id', secteurId)
      .order('street_name', { ascending: true })
      .order('number', { ascending: true })

    if (!error && data) setAdresses(data)
    setLoading(false)
  }, [secteurId])

  useEffect(() => { fetchAdresses() }, [fetchAdresses])

  const createAdresse = async (input: CalendrierAdresseInput) => {
    const { data, error } = await supabase
      .from('calendrier_adresses')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    await fetchAdresses()
    return data
  }

  const updateAdresse = async (id: string, updates: Partial<CalendrierAdresse>) => {
    const { error } = await supabase
      .from('calendrier_adresses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchAdresses()
  }

  const updateStatus = async (id: string, status: CalendrierAdresse['status']) => {
    const { error } = await supabase
      .from('calendrier_adresses')
      .update({
        status,
        visited_at: status !== 'todo' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
    await fetchAdresses()
  }

  const deleteAdresse = async (id: string) => {
    const { error } = await supabase.from('calendrier_adresses').delete().eq('id', id)
    if (error) throw error
    await fetchAdresses()
  }

  // Vérifier si une adresse a déjà été visitée (évite re-vente)
  const checkAddressAlreadyVisited = async (
    secteurIdCheck: string,
    streetName: string,
    number: string | null
  ): Promise<CalendrierAdresse | null> => {
    const normalizedStreet = streetName.trim().toLowerCase()
    const normalizedNumber = number?.trim() || null

    let query = supabase
      .from('calendrier_adresses')
      .select('*')
      .eq('secteur_id', secteurIdCheck)
      .ilike('street_name', normalizedStreet)
      .neq('status', 'todo')

    if (normalizedNumber) {
      query = query.eq('number', normalizedNumber)
    }

    const { data } = await query.maybeSingle()
    return data as CalendrierAdresse | null
  }

  const doneCount = adresses.filter((a) => a.status === 'done').length
  const todoCount = adresses.filter((a) => a.status === 'todo').length
  const totalCount = adresses.length

  return {
    adresses,
    loading,
    doneCount,
    todoCount,
    totalCount,
    refetch: fetchAdresses,
    createAdresse,
    updateAdresse,
    updateStatus,
    deleteAdresse,
    checkAddressAlreadyVisited,
  }
}
