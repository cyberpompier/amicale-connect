import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface AmicalisteChild {
  id: string
  amicaliste_id: string
  first_name: string
  last_name: string | null
  birth_date: string | null
}

export type ChildInput = Omit<AmicalisteChild, 'id' | 'amicaliste_id'>

export function useAmicalisteChildren(amicalisteId: string | null) {
  const [children, setChildren] = useState<AmicalisteChild[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!amicalisteId) return
    setLoading(true)
    const { data } = await supabase
      .from('amicaliste_children')
      .select('*')
      .eq('amicaliste_id', amicalisteId)
      .order('birth_date', { ascending: true })
    setChildren(data || [])
    setLoading(false)
  }, [amicalisteId])

  useEffect(() => { fetch() }, [fetch])

  const addChild = async (input: ChildInput) => {
    if (!amicalisteId) throw new Error('Pas d\'amicaliste sélectionné')
    const { data, error } = await supabase
      .from('amicaliste_children')
      .insert({ ...input, amicaliste_id: amicalisteId })
      .select().single()
    if (error) throw error
    setChildren(prev => [...prev, data])
    return data
  }

  const removeChild = async (id: string) => {
    const { error } = await supabase.from('amicaliste_children').delete().eq('id', id)
    if (error) throw error
    setChildren(prev => prev.filter(c => c.id !== id))
  }

  const saveAll = async (amicId: string, inputs: ChildInput[]) => {
    await supabase.from('amicaliste_children').delete().eq('amicaliste_id', amicId)
    if (inputs.length === 0) return
    const rows = inputs.map(c => ({ ...c, amicaliste_id: amicId }))
    const { error } = await supabase.from('amicaliste_children').insert(rows)
    if (error) throw error
  }

  return { children, loading, addChild, removeChild, saveAll, refetch: fetch }
}
