import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'

export interface CalendrierSecteurRue {
  id: string
  secteur_id: string
  name: string
  order: number
  created_at: string
}

export interface CalendrierSecteurEquipier {
  id: string
  secteur_id: string
  amicaliste_id: string
  role: 'responsable' | 'equipier'
  assigned_at: string
  amicalistes?: {
    id: string
    first_name: string
    last_name: string
    grade: string | null
  }
}

export interface CalendrierStock {
  id: string
  secteur_id: string
  allocated_qty: number
  used_qty: number
  returned_qty: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CalendrierSecteur {
  id: string
  association_id: string
  campagne_id: string
  name: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  objective_amount: number
  objective_calendriers: number
  color: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  calendrier_secteur_rues?: CalendrierSecteurRue[]
  calendrier_secteur_equipiers?: CalendrierSecteurEquipier[]
  calendrier_stocks?: CalendrierStock
  // Calculated fields
  total_collected?: number
  total_calendriers_sold?: number
  progression_percent?: number
}

export type CalendrierSecteurInput = {
  campagne_id: string
  name: string
  description?: string | null
  objective_amount?: number
  objective_calendriers?: number
  color?: string
  rues?: string[]
  equipiers?: Array<{ amicaliste_id: string; role?: 'responsable' | 'equipier' }>
  allocated_qty?: number
}

export function useCalendrierSecteurs(campagneId?: string) {
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const [secteurs, setSecteurs] = useState<CalendrierSecteur[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSecteurs = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)

    let query = supabase
      .from('calendrier_secteurs')
      .select(`
        *,
        calendrier_secteur_rues(*),
        calendrier_secteur_equipiers(
          *,
          amicalistes(id, first_name, last_name, grade)
        ),
        calendrier_stocks(*)
      `)
      .eq('association_id', currentAssociation.id)

    if (campagneId) {
      query = query.eq('campagne_id', campagneId)
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (!error && data) {
      // Calcul des totaux depuis les ventes
      const secteurIds = data.map((s) => s.id)
      if (secteurIds.length > 0) {
        const { data: ventes } = await supabase
          .from('calendrier_ventes')
          .select('secteur_id, amount, quantity')
          .in('secteur_id', secteurIds)

        const enriched = data.map((secteur: any) => {
          const secteurVentes = (ventes || []).filter((v: any) => v.secteur_id === secteur.id)
          const total_collected = secteurVentes.reduce((sum: number, v: any) => sum + Number(v.amount), 0)
          const total_calendriers_sold = secteurVentes.reduce((sum: number, v: any) => sum + v.quantity, 0)
          // Normalize calendrier_stocks: Supabase returns array even when UNIQUE
          const stockArr = Array.isArray(secteur.calendrier_stocks) ? secteur.calendrier_stocks : (secteur.calendrier_stocks ? [secteur.calendrier_stocks] : [])
          const stock = stockArr[0] ?? null
          const progression_percent = secteur.objective_amount > 0
            ? Math.min(100, (total_collected / Number(secteur.objective_amount)) * 100)
            : 0
          return { ...secteur, calendrier_stocks: stock, total_collected, total_calendriers_sold, progression_percent }
        })

        setSecteurs(enriched as CalendrierSecteur[])
      } else {
        setSecteurs([])
      }
    }
    setLoading(false)
  }, [currentAssociation, campagneId])

  useEffect(() => { fetchSecteurs() }, [fetchSecteurs])

  const createSecteur = async (input: CalendrierSecteurInput) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    const { rues, equipiers, allocated_qty, ...secteurData } = input

    // Insérer le secteur
    const { data: secteur, error: sErr } = await supabase
      .from('calendrier_secteurs')
      .insert({
        association_id: currentAssociation.id,
        ...secteurData,
        created_by: user.id,
      })
      .select()
      .single()

    if (sErr) throw sErr

    // Insérer les rues
    if (rues && rues.length > 0) {
      const ruesData = rues.filter((r) => r.trim()).map((name, index) => ({
        secteur_id: secteur.id,
        name: name.trim(),
        order: index,
      }))
      if (ruesData.length > 0) {
        const { error: rErr } = await supabase.from('calendrier_secteur_rues').insert(ruesData)
        if (rErr) console.error('Erreur rues:', rErr)
      }
    }

    // Insérer les équipiers
    if (equipiers && equipiers.length > 0) {
      const equipiersData = equipiers.map((e) => ({
        secteur_id: secteur.id,
        amicaliste_id: e.amicaliste_id,
        role: e.role ?? 'equipier',
      }))
      const { error: eErr } = await supabase.from('calendrier_secteur_equipiers').insert(equipiersData)
      if (eErr) console.error('Erreur équipiers:', eErr)
    }

    // Créer le stock
    if (allocated_qty !== undefined && allocated_qty > 0) {
      const { error: stErr } = await supabase.from('calendrier_stocks').insert({
        secteur_id: secteur.id,
        allocated_qty,
        used_qty: 0,
        returned_qty: 0,
        updated_by: user.id,
      })
      if (stErr) console.error('Erreur stock:', stErr)
    }

    await fetchSecteurs()
    return secteur
  }

  const updateSecteur = async (id: string, updates: Partial<CalendrierSecteurInput>) => {
    const { rues, equipiers, allocated_qty, ...secteurData } = updates

    const { error } = await supabase
      .from('calendrier_secteurs')
      .update({ ...secteurData, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    // Update des rues si fourni
    if (rues !== undefined) {
      await supabase.from('calendrier_secteur_rues').delete().eq('secteur_id', id)
      if (rues.length > 0) {
        const ruesData = rues.filter((r) => r.trim()).map((name, index) => ({
          secteur_id: id,
          name: name.trim(),
          order: index,
        }))
        if (ruesData.length > 0) {
          await supabase.from('calendrier_secteur_rues').insert(ruesData)
        }
      }
    }

    // Update des équipiers si fourni
    if (equipiers !== undefined) {
      await supabase.from('calendrier_secteur_equipiers').delete().eq('secteur_id', id)
      if (equipiers.length > 0) {
        const equipiersData = equipiers.map((e) => ({
          secteur_id: id,
          amicaliste_id: e.amicaliste_id,
          role: e.role ?? 'equipier',
        }))
        await supabase.from('calendrier_secteur_equipiers').insert(equipiersData)
      }
    }

    // Update du stock si fourni
    if (allocated_qty !== undefined && user) {
      const { data: existing } = await supabase
        .from('calendrier_stocks')
        .select('id')
        .eq('secteur_id', id)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('calendrier_stocks')
          .update({ allocated_qty, updated_by: user.id, updated_at: new Date().toISOString() })
          .eq('secteur_id', id)
      } else {
        await supabase.from('calendrier_stocks').insert({
          secteur_id: id,
          allocated_qty,
          used_qty: 0,
          returned_qty: 0,
          updated_by: user.id,
        })
      }
    }

    await fetchSecteurs()
  }

  const updateStatus = async (id: string, status: CalendrierSecteur['status']) => {
    const { error } = await supabase
      .from('calendrier_secteurs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
    await fetchSecteurs()
  }

  const deleteSecteur = async (id: string) => {
    const { error } = await supabase.from('calendrier_secteurs').delete().eq('id', id)
    if (error) throw error
    await fetchSecteurs()
  }

  return {
    secteurs,
    loading,
    refetch: fetchSecteurs,
    createSecteur,
    updateSecteur,
    updateStatus,
    deleteSecteur,
  }
}
