import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'

export interface Secteur {
  id: string
  name: string
  color: string
  city: string | null
  objective_amount: number
  objective_calendriers: number
  status: string
  campagne_id: string
}

interface SecteurContextType {
  currentSecteur: Secteur | null
  secteurs: Secteur[]
  loading: boolean
  setCurrentSecteur: (secteur: Secteur) => void
  refetch: () => Promise<void>
}

const SecteurContext = createContext<SecteurContextType | undefined>(undefined)

export function SecteurProvider({ children }: { children: ReactNode }) {
  const { activeCampagne } = useCalendrierCampagnes()
  const [secteurs, setSecteurs] = useState<Secteur[]>([])
  const [currentSecteur, setCurrentSecteur] = useState<Secteur | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSecteurs = async () => {
    if (!activeCampagne) {
      setSecteurs([])
      setCurrentSecteur(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('calendrier_secteurs')
      .select('id, name, color, city, objective_amount, objective_calendriers, status, campagne_id')
      .eq('campagne_id', activeCampagne.id)
      .order('name')

    if (error) {
      console.error('Erreur chargement secteurs:', error)
      setLoading(false)
      return
    }

    setSecteurs(data || [])
    if (data && data.length > 0 && !currentSecteur) {
      setCurrentSecteur(data[0])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSecteurs()
  }, [activeCampagne])

  const contextValue = useMemo(
    () => ({ currentSecteur, secteurs, loading, setCurrentSecteur, refetch: fetchSecteurs }),
    [currentSecteur, secteurs, loading]
  )

  return (
    <SecteurContext.Provider value={contextValue}>
      {children}
    </SecteurContext.Provider>
  )
}

export function useSecteur() {
  const context = useContext(SecteurContext)
  if (context === undefined) {
    throw new Error('useSecteur must be used within a SecteurProvider')
  }
  return context
}
