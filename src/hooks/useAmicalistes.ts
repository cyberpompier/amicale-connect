import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface Amicaliste {
  id: string
  association_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  grade: string | null
  status: string
  join_date: string
  notes: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type AmicalisteInput = Omit<Amicaliste, 'id' | 'association_id' | 'created_at' | 'updated_at'>

export function useAmicalistes() {
  const { currentAssociation } = useAssociation()
  const [amicalistes, setAmicalistes] = useState<Amicaliste[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAmicalistes = useCallback(async () => {
    if (!currentAssociation) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('amicalistes')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .order('last_name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setAmicalistes(data || [])
    }
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => {
    fetchAmicalistes()
  }, [fetchAmicalistes])

  const addAmicaliste = async (input: AmicalisteInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { data, error } = await supabase
      .from('amicalistes')
      .insert({
        ...input,
        association_id: currentAssociation.id,
      })
      .select()
      .single()

    if (error) throw error
    setAmicalistes((prev) => [...prev, data].sort((a, b) => a.last_name.localeCompare(b.last_name)))
    return data
  }

  const updateAmicaliste = async (id: string, input: Partial<AmicalisteInput>) => {
    const { data, error } = await supabase
      .from('amicalistes')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setAmicalistes((prev) =>
      prev.map((a) => (a.id === id ? data : a)).sort((a, b) => a.last_name.localeCompare(b.last_name))
    )
    return data
  }

  const deleteAmicaliste = async (id: string) => {
    const { error } = await supabase.from('amicalistes').delete().eq('id', id)
    if (error) throw error
    setAmicalistes((prev) => prev.filter((a) => a.id !== id))
  }

  return {
    amicalistes,
    loading,
    error,
    refetch: fetchAmicalistes,
    addAmicaliste,
    updateAmicaliste,
    deleteAmicaliste,
  }
}
