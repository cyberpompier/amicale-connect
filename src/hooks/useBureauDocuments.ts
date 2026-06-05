import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface BureauDocument {
  id: string
  association_id: string
  titre: string
  description: string | null
  type: 'pv' | 'statuts' | 'reglement' | 'procedure' | 'autre'
  date_document: string
  url: string
  icone: string
  order: number
  created_at: string
  updated_at: string
}

export type DocumentInput = Omit<BureauDocument, 'id' | 'created_at' | 'updated_at' | 'association_id'>

const DOCUMENT_TYPES = {
  pv: { label: 'Procès-verbal', color: 'bg-blue-100 text-blue-700', icon: '📋' },
  statuts: { label: 'Statuts', color: 'bg-purple-100 text-purple-700', icon: '📜' },
  reglement: { label: 'Règlement intérieur', color: 'bg-green-100 text-green-700', icon: '📘' },
  procedure: { label: 'Procédure', color: 'bg-amber-100 text-amber-700', icon: '⚙️' },
  autre: { label: 'Autre', color: 'bg-gray-100 text-gray-700', icon: '📄' },
}

export function useBureauDocuments() {
  const { currentAssociation } = useAssociation()
  const [documents, setDocuments] = useState<BureauDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!currentAssociation) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('bureau_documents')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .order('order', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setDocuments(data || [])
    }
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const addDocument = async (input: DocumentInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { error } = await supabase
      .from('bureau_documents')
      .insert({
        ...input,
        association_id: currentAssociation.id,
      })

    if (error) throw error
    await fetchDocuments()
  }

  const updateDocument = async (id: string, updates: Partial<DocumentInput>) => {
    const { error } = await supabase
      .from('bureau_documents')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    await fetchDocuments()
  }

  const deleteDocument = async (id: string) => {
    const { error } = await supabase
      .from('bureau_documents')
      .delete()
      .eq('id', id)

    if (error) throw error
    await fetchDocuments()
  }

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    addDocument,
    updateDocument,
    deleteDocument,
    DOCUMENT_TYPES,
  }
}
