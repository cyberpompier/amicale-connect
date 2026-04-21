import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuth } from '@/hooks/useAuth'

export interface Transaction {
  id: string
  association_id: string
  category_id: string | null
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface TransactionWithCategory extends Transaction {
  categories?: {
    name: string
  } | null
  created_by_profile?: {
    full_name: string
    avatar_url: string | null
  } | null
  updated_by_profile?: {
    full_name: string
    avatar_url: string | null
  } | null
}

export type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by' | 'association_id'>

export function useTransactions(dateRange?: { from: string; to: string }) {
  const { currentAssociation } = useAssociation()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    if (!currentAssociation) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let query = supabase
      .from('transactions')
      .select('*, categories(name)')
      .eq('association_id', currentAssociation.id)
      .order('date', { ascending: false })

    if (dateRange) {
      query = query
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
    } else {
      const transactions = (data || []) as TransactionWithCategory[]

      // Récupérer les IDs uniques des créateurs et modificateurs
      const profileIds = new Set<string>()
      transactions.forEach(t => {
        if (t.created_by) profileIds.add(t.created_by)
        if (t.updated_by) profileIds.add(t.updated_by)
      })

      // Fetcher les profils si nécessaire
      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(profileIds))

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

        // Enrichir les transactions avec les données du profil
        const enrichedTransactions = transactions.map(t => {
          const enriched = { ...t }
          if (t.created_by && profileMap.has(t.created_by)) {
            const profile = profileMap.get(t.created_by)!
            enriched.created_by_profile = {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            }
          }
          if (t.updated_by && profileMap.has(t.updated_by)) {
            const profile = profileMap.get(t.updated_by)!
            enriched.updated_by_profile = {
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            }
          }
          return enriched
        })
        setTransactions(enrichedTransactions)
      } else {
        setTransactions(transactions)
      }
    }
    setLoading(false)
  }, [currentAssociation, dateRange?.from, dateRange?.to])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = async (input: TransactionInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')
    if (!user) throw new Error('Utilisateur non authentifié')

    const { error } = await supabase
      .from('transactions')
      .insert({
        ...input,
        association_id: currentAssociation.id,
        created_by: user.id,
        updated_by: user.id,
      })

    if (error) throw error
    await fetchTransactions()
  }

  const updateTransaction = async (id: string, input: Partial<TransactionInput>) => {
    if (!user) throw new Error('Utilisateur non authentifié')

    const { error } = await supabase
      .from('transactions')
      .update({
        ...input,
        updated_by: user.id,
      })
      .eq('id', id)

    if (error) throw error
    await fetchTransactions()
  }

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const stats = {
    totalIncome: transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    totalExpense: transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    balance: transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) -
      transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0),
  }

  return {
    transactions,
    loading,
    error,
    stats,
    refetch: fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
