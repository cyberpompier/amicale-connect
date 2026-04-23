import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/features/auth/AuthContext'

interface Association {
  id: string
  name: string
  city: string | null
  subscription_status: string
  logo_url: string | null
}

interface AssociationContextType {
  currentAssociation: Association | null
  associations: Association[]
  loading: boolean
  setCurrentAssociation: (association: Association) => void
  refetch: () => Promise<void>
}

const AssociationContext = createContext<AssociationContextType | undefined>(undefined)

export function AssociationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext()
  const [associations, setAssociations] = useState<Association[]>([])
  const [currentAssociation, setCurrentAssociation] = useState<Association | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAssociations = async () => {
    if (!user) {
      setAssociations([])
      setCurrentAssociation(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('associations')
      .select('id, name, city, subscription_status, logo_url')

    if (error) {
      console.error('Erreur chargement associations:', error)
      setLoading(false)
      return
    }

    setAssociations(data || [])
    if (data && data.length > 0 && !currentAssociation) {
      setCurrentAssociation(data[0])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      setAssociations([])
      setCurrentAssociation(null)
      setLoading(false)
      return
    }

    fetchAssociations()
  }, [user])

  return (
    <AssociationContext.Provider
      value={{ currentAssociation, associations, loading, setCurrentAssociation, refetch: fetchAssociations }}
    >
      {children}
    </AssociationContext.Provider>
  )
}

export function useAssociation() {
  const context = useContext(AssociationContext)
  if (context === undefined) {
    throw new Error('useAssociation must be used within an AssociationProvider')
  }
  return context
}
