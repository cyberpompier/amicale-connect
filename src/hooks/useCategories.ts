import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface Category {
  id: string
  association_id: string
  name: string
  type: 'income' | 'expense'
  created_at: string
}

export type CategoryInput = Omit<Category, 'id' | 'created_at' | 'association_id'>

export function useCategories() {
  const { currentAssociation } = useAssociation()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    if (!currentAssociation) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setCategories(data || [])
    }
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const addCategory = async (input: CategoryInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: input.name,
        type: input.type,
        association_id: currentAssociation.id,
      })
      .select()
      .single()

    if (error) throw error
    setCategories((prev) => [...prev, data])
    return data
  }

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  return { categories, loading, error, refetch: fetchCategories, addCategory, deleteCategory }
}
