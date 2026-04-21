import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

export interface SondageOption {
  id: string
  sondage_id: string
  texte: string
  ordre: number
}

export interface SondageVote {
  id: string
  sondage_id: string
  option_id: string
  user_id: string
  created_at: string
}

export interface Sondage {
  id: string
  association_id: string
  titre: string
  description: string | null
  type: 'unique' | 'multiple'
  statut: 'actif' | 'termine'
  date_fin: string | null
  image_url: string | null
  created_at: string
  sondage_options?: SondageOption[]
  sondage_votes?: SondageVote[]
}

export interface SondageWithStats extends Sondage {
  options: (SondageOption & { votes: number; pourcentage: number })[]
  totalVotes: number
  participants: SondageVote[]
}

export type SondageInput = {
  titre: string
  description: string | null
  type: 'unique' | 'multiple'
  date_fin: string | null
  image_url: string | null
  options: string[]
}

export function useSondages() {
  const { currentAssociation } = useAssociation()
  const [sondages, setSondages] = useState<SondageWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSondages = useCallback(async () => {
    if (!currentAssociation) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('sondages')
      .select(`
        *,
        sondage_options(id, sondage_id, texte, ordre),
        sondage_votes(id, sondage_id, option_id, user_id, created_at)
      `)
      .eq('association_id', currentAssociation.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const enriched: SondageWithStats[] = (data || []).map((s: Sondage) => {
      const opts = (s.sondage_options || []).sort((a, b) => a.ordre - b.ordre)
      const votes = s.sondage_votes || []
      const total = votes.length

      const options = opts.map((opt) => {
        const count = votes.filter((v) => v.option_id === opt.id).length
        return {
          ...opt,
          votes: count,
          pourcentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }
      })

      return {
        ...s,
        options,
        totalVotes: total,
        participants: votes,
      }
    })

    setSondages(enriched)
    setLoading(false)
  }, [currentAssociation])

  useEffect(() => { fetchSondages() }, [fetchSondages])

  const addSondage = async (input: SondageInput) => {
    if (!currentAssociation) throw new Error('Aucune association sélectionnée')

    const { data: sondage, error: sErr } = await supabase
      .from('sondages')
      .insert({
        association_id: currentAssociation.id,
        titre: input.titre,
        description: input.description,
        type: input.type,
        date_fin: input.date_fin,
        image_url: input.image_url,
        statut: 'actif',
      })
      .select()
      .single()

    if (sErr) throw sErr

    const optionsToInsert = input.options
      .filter((o) => o.trim())
      .map((texte, i) => ({ sondage_id: sondage.id, texte: texte.trim(), ordre: i }))

    if (optionsToInsert.length > 0) {
      const { error: oErr } = await supabase.from('sondage_options').insert(optionsToInsert)
      if (oErr) throw oErr
    }

    await fetchSondages()
    return sondage
  }

  const terminerSondage = async (id: string) => {
    const { error } = await supabase
      .from('sondages')
      .update({ statut: 'termine' })
      .eq('id', id)
    if (error) throw error
    await fetchSondages()
  }

  const deleteSondage = async (id: string) => {
    const { error } = await supabase.from('sondages').delete().eq('id', id)
    if (error) throw error
    setSondages((prev) => prev.filter((s) => s.id !== id))
  }

  const voter = async (sondageId: string, optionId: string, userId: string) => {
    // Vérifier si déjà voté (mode unique)
    const sondage = sondages.find((s) => s.id === sondageId)
    if (sondage?.type === 'unique') {
      const dejaVote = sondage.participants.find((v) => v.user_id === userId)
      if (dejaVote) {
        // Supprimer l'ancien vote
        await supabase.from('sondage_votes').delete().eq('id', dejaVote.id)
      }
    }

    const { error } = await supabase.from('sondage_votes').insert({
      sondage_id: sondageId,
      option_id: optionId,
      user_id: userId,
    })
    if (error) throw error
    await fetchSondages()
  }

  return {
    sondages,
    loading,
    error,
    refetch: fetchSondages,
    addSondage,
    terminerSondage,
    deleteSondage,
    voter,
  }
}
