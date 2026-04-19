import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface Transaction {
  id: string
  association_id: string
  category_id: string | null
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
  created_at: string
  updated_at: string
}

export interface TransactionWithCategory extends Transaction {
  categories?: {
    name: string
  } | null
}

export type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'association_id'>

export function useTransactions(dateRange?: { from: string; to: string }) {
  const { currentAssociation } = useAssociation()
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
      setTransactions((data as TransactionWithCategory[]) || [])
    }
    setLoading(false)
  }, [currentAssociation, dateRange?.from, dateRange?.to])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = async (input: TransactionInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { error } = await supabase
      .from('transactions')
      .insert({
        ...input,
        association_id: currentAssociation.id,
      })

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
    deleteTransaction,
  }
}
