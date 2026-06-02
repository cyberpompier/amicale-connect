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

  // Recherche des infos donateur par adresse (toutes campagnes confondues)
  const lookupDonorByAddress = useCallback(
    async (streetName: string, streetNumber: string | null) => {
      if (!currentAssociation || !streetName.trim()) return null

      // Trouver les adresses correspondantes dans tous les secteurs de l'association
      let adressesQuery = supabase
        .from('calendrier_adresses')
        .select('id, calendrier_secteurs!inner(association_id)')
        .eq('calendrier_secteurs.association_id', currentAssociation.id)
        .ilike('street_name', streetName.trim())

      if (streetNumber?.trim()) {
        adressesQuery = adressesQuery.eq('number', streetNumber.trim())
      }

      const { data: adresses } = await adressesQuery

      if (!adresses || adresses.length === 0) return null

      const adresseIds = adresses.map((a: any) => a.id)

      const { data } = await supabase
        .from('calendrier_ventes')
        .select(
          'donor_name, donor_email, donor_phone, donor_address, sale_date, calendrier_campagnes(name, year)'
        )
        .eq('association_id', currentAssociation.id)
        .in('adresse_id', adresseIds)
        .or('donor_name.not.is.null,donor_email.not.is.null,donor_phone.not.is.null')
        .order('created_at', { ascending: false })
        .limit(1)
      if (!data || data.length === 0) return null

      const v = data[0] as any
      return {
        donor_name: v.donor_name as string | null,
        donor_email: v.donor_email as string | null,
        donor_phone: v.donor_phone as string | null,
        donor_address: v.donor_address as string | null,
        campagne_name: v.calendrier_campagnes?.name as string | null,
        campagne_year: v.calendrier_campagnes?.year as number | null,
        sale_date: v.sale_date as string,
      }
    },
    [currentAssociation]
  )

  // Export CSV des contacts donateurs (dédupliqués par email ou nom+téléphone)
  const exportContactsCSV = useCallback(
    async (campagneId?: string) => {
      if (!currentAssociation) return

      let query = supabase
        .from('calendrier_ventes')
        .select('donor_name, donor_email, donor_phone, donor_address, sale_date')
        .eq('association_id', currentAssociation.id)
        .or('donor_name.not.is.null,donor_email.not.is.null,donor_phone.not.is.null')
        .order('sale_date', { ascending: false })

      if (campagneId) query = query.eq('campagne_id', campagneId)

      const { data } = await query
      if (!data || data.length === 0) return

      // Déduplication par email (priorité) ou par nom+téléphone
      const seen = new Set<string>()
      const unique = data.filter((v: any) => {
        const key = v.donor_email?.trim().toLowerCase() || `${v.donor_name}|${v.donor_phone}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const header = 'Nom,Email,Téléphone,Adresse,Dernière vente'
      const rows = unique.map((v: any) =>
        [
          `"${(v.donor_name ?? '').replace(/"/g, '""')}"`,
          `"${(v.donor_email ?? '').replace(/"/g, '""')}"`,
          `"${(v.donor_phone ?? '').replace(/"/g, '""')}"`,
          `"${(v.donor_address ?? '').replace(/"/g, '""')}"`,
          `"${v.sale_date ?? ''}"`,
        ].join(',')
      )

      const csv = [header, ...rows].join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contacts-donateurs${campagneId ? `-${campagneId.slice(0, 8)}` : ''}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
    [currentAssociation]
  )

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
    lookupDonorByAddress,
    exportContactsCSV,
  }
}
