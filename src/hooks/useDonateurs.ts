import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'

export interface Donateur {
  id: string
  association_id: string
  nom: string
  prenom: string | null
  email: string | null
  telephone: string | null
  adresse: string | null
  code_postal: string | null
  ville: string
  total_dons: number
  nombre_dons: number
  derniere_donation: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DonateurInput = {
  nom: string
  prenom?: string | null
  email?: string | null
  telephone?: string | null
  adresse?: string | null
  code_postal?: string | null
  ville: string
  notes?: string | null
}

export interface DonVente {
  id: string
  amount: number
  quantity: number
  payment_method: string
  sale_date: string
  donor_name: string | null
  donor_email: string | null
}

export function useDonateurs() {
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const [donateurs, setDonateurs] = useState<Donateur[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDonateurs = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('donateurs')
      .select('*')
      .eq('association_id', currentAssociation.id)
      .order('derniere_donation', { ascending: false })

    if (!error && data) {
      setDonateurs(data)
    }
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => { fetchDonateurs() }, [fetchDonateurs])

  const createDonateur = async (input: DonateurInput) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('donateurs')
      .insert({
        association_id: currentAssociation.id,
        ...input,
      })
      .select()
      .single()

    if (error) throw error
    await fetchDonateurs()
    return data
  }

  const updateDonateur = async (id: string, updates: Partial<DonateurInput>) => {
    const { error } = await supabase
      .from('donateurs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchDonateurs()
  }

  const deleteDonateur = async (id: string) => {
    const { error } = await supabase
      .from('donateurs')
      .delete()
      .eq('id', id)

    if (error) throw error
    await fetchDonateurs()
  }

  // Récupère les dons individuels (ventes de calendriers) d'un donateur
  const fetchDonsForDonateur = async (donateur: Donateur): Promise<DonVente[]> => {
    if (!currentAssociation) return []

    const fullName = `${donateur.prenom} ${donateur.nom}`.trim()

    let query = supabase
      .from('calendrier_ventes')
      .select('id, amount, quantity, payment_method, sale_date, donor_name, donor_email')
      .eq('association_id', currentAssociation.id)
      .order('sale_date', { ascending: false })

    // Match par email si disponible, sinon par nom
    if (donateur.email) {
      query = query.eq('donor_email', donateur.email)
    } else {
      query = query.ilike('donor_name', fullName || donateur.nom)
    }

    const { data, error } = await query
    if (error || !data) return []
    return data as DonVente[]
  }

  return {
    donateurs,
    loading,
    refetch: fetchDonateurs,
    createDonateur,
    updateDonateur,
    deleteDonateur,
    fetchDonsForDonateur,
  }
}
