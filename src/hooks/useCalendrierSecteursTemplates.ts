import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAuthContext } from '@/features/auth/AuthContext'

export interface CalendrierSecteurTemplate {
  id: string
  association_id: string
  name: string
  description: string | null
  city: string | null
  objective_amount: number
  objective_calendriers: number
  color: string
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  calendrier_secteurs_templates_rues?: Array<{ id: string; name: string; order: number }>
}

export type CalendrierSecteurTemplateInput = {
  name: string
  description?: string | null
  city?: string | null
  objective_amount?: number
  objective_calendriers?: number
  color?: string
  rues?: string[]
  notes?: string | null
}

export function useCalendrierSecteursTemplates() {
  const { currentAssociation } = useAssociation()
  const { user } = useAuthContext()
  const [templates, setTemplates] = useState<CalendrierSecteurTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('calendrier_secteurs_templates')
      .select(`
        *,
        calendrier_secteurs_templates_rues(*)
      `)
      .eq('association_id', currentAssociation.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setTemplates(data as CalendrierSecteurTemplate[])
    }
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const createTemplate = async (input: CalendrierSecteurTemplateInput) => {
    if (!currentAssociation || !user) throw new Error('Non authentifié')

    const { rues, ...templateData } = input

    // Créer le template
    const { data: template, error: tErr } = await supabase
      .from('calendrier_secteurs_templates')
      .insert({
        association_id: currentAssociation.id,
        name: templateData.name,
        description: templateData.description,
        objective_amount: templateData.objective_amount ?? 0,
        objective_calendriers: templateData.objective_calendriers ?? 0,
        color: templateData.color ?? '#3B82F6',
        notes: templateData.notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (tErr) throw tErr

    // Ajouter les rues
    if (rues && rues.length > 0) {
      const ruesData = rues.filter((r) => r.trim()).map((name, index) => ({
        template_id: template.id,
        name: name.trim(),
        order: index,
      }))
      if (ruesData.length > 0) {
        const { error: rErr } = await supabase.from('calendrier_secteurs_templates_rues').insert(ruesData)
        if (rErr) console.error('Erreur rues:', rErr)
      }
    }

    await fetchTemplates()
    return template
  }

  const updateTemplate = async (id: string, updates: Partial<CalendrierSecteurTemplateInput>) => {
    const { rues, ...templateData } = updates

    const { error } = await supabase
      .from('calendrier_secteurs_templates')
      .update({ ...templateData, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    // Mettre à jour les rues si fournies
    if (rues !== undefined) {
      await supabase.from('calendrier_secteurs_templates_rues').delete().eq('template_id', id)
      if (rues.length > 0) {
        const ruesData = rues.filter((r) => r.trim()).map((name, index) => ({
          template_id: id,
          name: name.trim(),
          order: index,
        }))
        if (ruesData.length > 0) {
          await supabase.from('calendrier_secteurs_templates_rues').insert(ruesData)
        }
      }
    }

    await fetchTemplates()
  }

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from('calendrier_secteurs_templates').delete().eq('id', id)
    if (error) throw error
    await fetchTemplates()
  }

  return {
    templates,
    loading,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  }
}
