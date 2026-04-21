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
    // Get the cotisation to retrieve amicaliste_id and amount
    const cotisation = cotisations.find((c) => c.id === id)
    if (!cotisation) throw new Error('Cotisation not found')

    // Update cotisation status
    await updateCotisation(id, {
      status: 'paid',
      paid_at: new Date().toISOString(),
    })

    // Automatically create a transaction for the paid amount
    if (currentAssociation) {
      // Find or create a "Cotisations" category for income
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('association_id', currentAssociation.id)
        .eq('name', 'Cotisations')
        .single()

      let categoryId = categories?.id || null

      // If category doesn't exist, we'll create transaction without category
      // (it will use null which is allowed)

      // Create the transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          association_id: currentAssociation.id,
          type: 'income',
          amount: cotisation.amount,
          description: `Cotisation ${new Date().getFullYear()} - ${cotisation.amicalistes.first_name} ${cotisation.amicalistes.last_name}`,
          category_id: categoryId,
          date: new Date().toISOString().split('T')[0],
        })

      if (transactionError) {
        console.error('Erreur lors de la création de la transaction:', transactionError)
        // Don't throw error, as cotisation was already marked as paid
      }
    }
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
