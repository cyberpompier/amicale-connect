import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface Cotisation {
  id: string
  association_id: string
  amicaliste_id: string
  year: number
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  paid_at: string | null
  created_at: string
}

export interface CotisationWithMember extends Cotisation {
  amicalistes: {
    first_name: string
    last_name: string
  }
}

export type CotisationInput = {
  amicaliste_id: string
  year: number
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  paid_at?: string | null
}

export function useCotisations(year?: number) {
  const { currentAssociation } = useAssociation()
  const [cotisations, setCotisations] = useState<CotisationWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCotisations = useCallback(async () => {
    if (!currentAssociation) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let query = supabase
      .from('cotisations')
      .select('*, amicalistes(first_name, last_name)')
      .eq('association_id', currentAssociation.id)
      .order('year', { ascending: false })

    if (year) {
      query = query.eq('year', year)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setCotisations((data as CotisationWithMember[]) || [])
    }
    setLoading(false)
  }, [currentAssociation, year])

  useEffect(() => {
    fetchCotisations()
  }, [fetchCotisations])

  const addCotisation = async (input: CotisationInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { error } = await supabase
      .from('cotisations')
      .insert({
        ...input,
        association_id: currentAssociation.id,
      })

    if (error) throw error
    await fetchCotisations()
  }

  const updateCotisation = async (id: string, input: Partial<CotisationInput>) => {
    const { error } = await supabase
      .from('cotisations')
      .update(input)
      .eq('id', id)

    if (error) throw error
    await fetchCotisations()
  }

  const markAsPaid = async (id: string) => {
    await updateCotisation(id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
  }

  return {
    cotisations,
    loading,
    error,
    refetch: fetchCotisations,
    addCotisation,
    updateCotisation,
    markAsPaid,
  }
}
