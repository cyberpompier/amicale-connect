import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface BureauDriveLink {
  id: string
  association_id: string
  title: string
  url: string
  icon: string
  order: number
  created_at: string
  updated_at: string
}

export type BureauDriveLinkInput = Omit<BureauDriveLink, 'id' | 'association_id' | 'created_at' | 'updated_at'>

export function useBureauDriveLinks() {
  const { currentAssociation } = useAssociation()
  const [links, setLinks] = useState<BureauDriveLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLinks = useCallback(async () => {
    if (!currentAssociation) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('bureau_drive_links')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .order('order', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setLinks(data || [])
    }
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const addLink = async (input: BureauDriveLinkInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { data, error } = await supabase
      .from('bureau_drive_links')
      .insert({
        ...input,
        association_id: currentAssociation.id,
        order: links.length,
      })
      .select()
      .single()

    if (error) throw error
    setLinks((prev) => [...prev, data])
    return data
  }

  const updateLink = async (id: string, input: Partial<BureauDriveLinkInput>) => {
    const { data, error } = await supabase
      .from('bureau_drive_links')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    setLinks((prev) => prev.map((l) => (l.id === id ? data : l)))
    return data
  }

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from('bureau_drive_links').delete().eq('id', id)
    if (error) throw error
    setLinks((prev) => prev.filter((l) => l.id !== id))
  }

  return {
    links,
    loading,
    error,
    refetch: fetchLinks,
    addLink,
    updateLink,
    deleteLink,
  }
}
