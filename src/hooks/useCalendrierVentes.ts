import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'

export interface CalendrierVente {
  id: string
  association_id: string
  campagne_id: string
  secteur_id: string
  amicaliste_id: string | null
  adresse_id: string | null
  amount: number
  quantity: number
  payment_method: 'cash' | 'check' | 'card' | 'transfer' | 'other'
  donor_name: string | null
  donor_email: string | null
  donor_phone: string | null
  donor_address: string | null
  notes: string | null
  sale_date: string
  created_by: string | null
  created_at: string
  updated_at: string
  amicalistes?: { id: string; first_name: string; last_name: string; grade: string | null }
  calendrier_secteurs?: { id: string; name: string }
  calendrier_adresses?: { id: string; street_name: string; number: string | null }
}

export type CalendrierVenteInput = {
  campagne_id: string
  secteur_id: string
  amicaliste_id?: string | null
  adresse_id?: string | null
  amount: number
  quantity: number
  payment_method: CalendrierVente['payment_method']
  donor_name?: string | null
  donor_email?: string | null
  donor_phone?: string | null
  donor_address?: string | null
  notes?: string | null
  sale_date?: string
}

export function useCalendrierVentes(campagneId?: string, secteurId?: string, limit?: number) {
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const [ventes, setVentes] = useState<CalendrierVente[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVentes = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)

    let query = supabase
      .from('calendrier_ventes')
      .select(`
        *,
        amicalistes(id, first_name, last_name, grade),
        calendrier_secteurs(id, name),
        calendrier_adresses(id, street_name, number)
      `)
      .eq('association_id', currentAssociation.id)

    if (campagneId) query = query.eq('campagne_id', campagneId)
    if (secteurId) query = query.eq('secteur_id', secteurId)

    let finalQuery = query.order('created_at', { ascending: false })
    if (limit) finalQuery = finalQuery.limit(limit)
    const { data, error } = await finalQuery

    if (!error && data) setVentes(data as any)
    setLoading(false)
  }, [currentAssociation, campagneId, secteurId])

  useEffect(() => { fetchVentes() }, [fetchVentes])

  const createVente = async (input: CalendrierVenteInput) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    const { data, error } = await supabase
      .from('calendrier_ventes')
      .insert({
        association_id: currentAssociation.id,
        ...input,
        sale_date: input.sale_date ?? new Date().toISOString().split('T')[0],
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Incrémenter le stock utilisé
    const { data: stock } = await supabase
      .from('calendrier_stocks')
      .select('id, used_qty')
      .eq('secteur_id', input.secteur_id)
      .maybeSingle()

    if (stock) {
      await supabase
        .from('calendrier_stocks')
        .update({
          used_qty: stock.used_qty + input.quantity,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stock.id)
    }

    await fetchVentes()
    return data
  }

  const updateVente = async (id: string, updates: Partial<CalendrierVenteInput>) => {
    const { error } = await supabase
      .from('calendrier_ventes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchVentes()
  }

  const deleteVente = async (id: string) => {
    // Récupérer la vente pour décrémenter le stock
    const vente = ventes.find((v) => v.id === id)
    const { error } = await supabase.from('calendrier_ventes').delete().eq('id', id)
    if (error) throw error

    if (vente && user) {
      const { data: stock } = await supabase
        .from('calendrier_stocks')
        .select('id, used_qty')
        .eq('secteur_id', vente.secteur_id)
        .maybeSingle()

      if (stock) {
        await supabase
          .from('calendrier_stocks')
          .update({
            used_qty: Math.max(0, stock.used_qty - vente.quantity),
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', stock.id)
      }
    }

    await fetchVentes()
  }

  // Stats
  const totalAmount = ventes.reduce((sum, v) => sum + Number(v.amount), 0)
  const totalQuantity = ventes.reduce((sum, v) => sum + v.quantity, 0)

  return {
    ventes,
    loading,
    totalAmount,
    totalQuantity,
    refetch: fetchVentes,
    createVente,
    updateVente,
    deleteVente,
  }
}
