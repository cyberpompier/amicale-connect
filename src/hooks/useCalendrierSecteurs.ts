import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'

export interface CalendrierSecteurRue {
  id: string
  secteur_id: string
  name: string
  city: string | null
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
    avatar_url: string | null
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
  city: string | null
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
  city?: string | null
  objective_amount?: number
  objective_calendriers?: number
  color?: string
  rues?: Array<{ name: string; city?: string | null }>
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
    // Sans campagneId, ne rien charger — évite de mélanger des secteurs de plusieurs campagnes
    if (!campagneId) { setSecteurs([]); setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('calendrier_secteurs')
      .select(`
        *,
        calendrier_secteur_rues(*),
        calendrier_secteur_equipiers(
          *,
          amicalistes(id, first_name, last_name, grade, avatar_url)
        ),
        calendrier_stocks(*)
      `)
      .eq('association_id', currentAssociation.id)
      .eq('campagne_id', campagneId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      // Calcul des totaux depuis les ventes — filtré strictement par campagne ET secteur
      const secteurIds = data.map((s) => s.id)
      if (secteurIds.length > 0) {
        const { data: ventes } = await supabase
          .from('calendrier_ventes')
          .select('secteur_id, amount, quantity')
          .eq('campagne_id', campagneId)
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
      const ruesData = rues
        .filter((r) => r.name.trim())
        .map((r, index) => ({
          secteur_id: secteur.id,
          name: r.name.trim(),
          city: r.city?.trim() || null,
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
        const ruesData = rues
          .filter((r) => r.name.trim())
          .map((r, index) => ({
            secteur_id: id,
            name: r.name.trim(),
            city: r.city?.trim() || null,
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

  const copySecteursFromPreviousCampagne = async (fromCampagneId: string, toCampagneId: string) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    // Récupérer les secteurs de l'ancienne campagne
    const { data: oldSecteurs } = await supabase
      .from('calendrier_secteurs')
      .select(`
        *,
        calendrier_secteur_rues(*),
        calendrier_secteur_equipiers(*),
        calendrier_stocks(*)
      `)
      .eq('campagne_id', fromCampagneId)

    if (!oldSecteurs || oldSecteurs.length === 0) return

    // Copier chaque secteur
    for (const oldSecteur of oldSecteurs) {
      const {
        id,
        association_id,
        created_at,
        updated_at,
        calendrier_secteur_rues,
        calendrier_secteur_equipiers,
        calendrier_stocks,
        // Exclure les champs calculés
        total_collected,
        total_calendriers_sold,
        progression_percent,
        ...secteurData
      } = oldSecteur

      // Créer le nouveau secteur avec les champs sélectionnés
      const { data: newSecteur, error: sErr } = await supabase
        .from('calendrier_secteurs')
        .insert({
          association_id: currentAssociation.id,
          campagne_id: toCampagneId,
          name: secteurData.name,
          description: secteurData.description,
          objective_amount: secteurData.objective_amount,
          objective_calendriers: secteurData.objective_calendriers,
          color: secteurData.color,
          notes: secteurData.notes,
          status: 'todo', // Réinitialiser le statut
          created_by: user.id,
        })
        .select()
        .single()

      if (sErr) {
        console.error('Erreur création secteur:', sErr)
        continue
      }

      // Copier les rues
      if (calendrier_secteur_rues && calendrier_secteur_rues.length > 0) {
        const ruesData = calendrier_secteur_rues.map((r: any) => ({
          secteur_id: newSecteur.id,
          name: r.name,
          city: r.city ?? null,
          order: r.order,
        }))
        const { error: rErr } = await supabase.from('calendrier_secteur_rues').insert(ruesData)
        if (rErr) console.error('Erreur copie rues:', rErr)
      }

      // Copier les équipiers
      if (calendrier_secteur_equipiers && calendrier_secteur_equipiers.length > 0) {
        const equipiersData = calendrier_secteur_equipiers.map((e: any) => ({
          secteur_id: newSecteur.id,
          amicaliste_id: e.amicaliste_id,
          role: e.role,
        }))
        const { error: eErr } = await supabase.from('calendrier_secteur_equipiers').insert(equipiersData)
        if (eErr) console.error('Erreur copie équipiers:', eErr)
      }

      // Copier le stock avec used_qty et returned_qty réinitialisés
      if (calendrier_stocks && calendrier_stocks.length > 0) {
        const stock = calendrier_stocks[0]
        const { error: stErr } = await supabase.from('calendrier_stocks').insert({
          secteur_id: newSecteur.id,
          allocated_qty: stock.allocated_qty,
          used_qty: 0,
          returned_qty: 0,
          updated_by: user.id,
        })
        if (stErr) console.error('Erreur copie stock:', stErr)
      }
    }

    // Note: Don't call fetchSecteurs() here - let the parent component refetch
    // with the correct campagneId context after activeCampagne is updated
  }

  const copySecteursFromTemplates = async (toCampagneId: string) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    // Récupérer les templates de l'association
    const { data: templates } = await supabase
      .from('calendrier_secteurs_templates')
      .select(`
        *,
        calendrier_secteurs_templates_rues(*)
      `)
      .eq('association_id', currentAssociation.id)

    if (!templates || templates.length === 0) return

    // Copier chaque template
    for (const template of templates) {
      const { id, association_id, created_at, updated_at, calendrier_secteurs_templates_rues, ...templateData } = template as any

      // Créer le nouveau secteur
      const { data: newSecteur, error: sErr } = await supabase
        .from('calendrier_secteurs')
        .insert({
          association_id: currentAssociation.id,
          campagne_id: toCampagneId,
          name: templateData.name,
          description: templateData.description,
          objective_amount: templateData.objective_amount,
          objective_calendriers: templateData.objective_calendriers,
          color: templateData.color,
          notes: templateData.notes,
          status: 'todo',
          created_by: user.id,
        })
        .select()
        .single()

      if (sErr) {
        console.error('Erreur création secteur depuis template:', sErr)
        continue
      }

      // Copier les rues du template
      if (calendrier_secteurs_templates_rues && calendrier_secteurs_templates_rues.length > 0) {
        const ruesData = calendrier_secteurs_templates_rues.map((r: any) => ({
          secteur_id: newSecteur.id,
          name: r.name,
          order: r.order,
        }))
        const { error: rErr } = await supabase.from('calendrier_secteur_rues').insert(ruesData)
        if (rErr) console.error('Erreur copie rues:', rErr)
      }
    }
  }

  return {
    secteurs,
    loading,
    refetch: fetchSecteurs,
    createSecteur,
    updateSecteur,
    updateStatus,
    deleteSecteur,
    copySecteursFromPreviousCampagne,
    copySecteursFromTemplates,
  }
}
