import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface BureauPosition {
  id: string
  association_id: string
  amicaliste_id: string
  position: string
  start_date: string
  end_date: string | null
  is_current: boolean
  created_at: string
}

export type BureauPositionInput = Omit<BureauPosition, 'id' | 'created_at' | 'association_id' | 'is_current'>

export function useBureauPositions() {
  const { currentAssociation } = useAssociation()
  const [positions, setPositions] = useState<BureauPosition[]>([])
  const [history, setHistory] = useState<BureauPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPositions = useCallback(async () => {
    if (!currentAssociation) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('bureau_positions')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .is('end_date', null)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setPositions(data || [])
    }
    setLoading(false)
  }, [currentAssociation])

  const fetchHistory = useCallback(async () => {
    if (!currentAssociation) return

    const { data, error: fetchError } = await supabase
      .from('bureau_positions')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .not('end_date', 'is', null)
      .order('start_date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setHistory(data || [])
    }
  }, [currentAssociation])

  useEffect(() => {
    fetchPositions()
    fetchHistory()
  }, [fetchPositions, fetchHistory])

  const addPosition = async (input: BureauPositionInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { error } = await supabase
      .from('bureau_positions')
      .insert({
        ...input,
        association_id: currentAssociation.id,
      })

    if (error) throw error
    await fetchPositions()
  }

  const updatePosition = async (id: string, updates: Partial<BureauPositionInput>) => {
    const { error } = await supabase
      .from('bureau_positions')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    await fetchPositions()
    await fetchHistory()
  }

  const endMandate = async (id: string) => {
    const today = new Date().toISOString().split('T')[0]
    await updatePosition(id, { end_date: today })
  }

  const deletePosition = async (id: string) => {
    const { error } = await supabase
      .from('bureau_positions')
      .delete()
      .eq('id', id)

    if (error) throw error
    setPositions((prev) => prev.filter((p) => p.id !== id))
    await fetchHistory()
  }

  return {
    positions,
    history,
    loading,
    error,
    refetch: fetchPositions,
    addPosition,
    updatePosition,
    endMandate,
    deletePosition,
  }
}
