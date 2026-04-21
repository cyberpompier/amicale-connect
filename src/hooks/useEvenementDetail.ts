import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Evenement } from './useEvenements'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Participant {
  id: string
  evenement_id: string
  amicaliste_id: string
  status: 'invited' | 'confirmed' | 'declined'
  paiement: 'en_attente' | 'paye' | 'exonere'
  notes: string | null
  nombre_accompagnants: number
  created_at: string
  amicalistes: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    grade: string | null
  }
}

export interface Invite {
  id: string
  evenement_id: string
  nom: string
  email: string | null
  telephone: string | null
  statut: 'invite' | 'confirme' | 'decline'
  paiement: 'en_attente' | 'paye' | 'exonere'
  notes: string | null
  created_at: string
}

export interface Commentaire {
  id: string
  evenement_id: string
  auteur: string
  contenu: string
  note: number | null
  created_at: string
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEvenementDetail(evenementId: string | undefined) {
  const [evenement, setEvenement] = useState<Evenement | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!evenementId) return
    setLoading(true)
    setError(null)

    try {
      // Événement
      const { data: evt, error: evtErr } = await supabase
        .from('evenements')
        .select('*')
        .eq('id', evenementId)
        .single()

      if (evtErr) throw evtErr
      setEvenement(evt)

      // Participants (membres)
      const { data: parts, error: partsErr } = await supabase
        .from('evenement_participants')
        .select('*, amicalistes(id, first_name, last_name, email, grade)')
        .eq('evenement_id', evenementId)
        .order('created_at', { ascending: true })

      if (!partsErr && parts) setParticipants(parts as unknown as Participant[])

      // Invités externes
      const { data: invs } = await supabase
        .from('evenement_invites')
        .select('*')
        .eq('evenement_id', evenementId)
        .order('created_at', { ascending: true })

      if (invs) setInvites(invs as Invite[])

      // Commentaires
      const { data: comms } = await supabase
        .from('evenement_commentaires')
        .select('*')
        .eq('evenement_id', evenementId)
        .order('created_at', { ascending: false })

      if (comms) setCommentaires(comms as Commentaire[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [evenementId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ─── Participants (membres) ────────────────────────────────────────────────

  const addParticipant = async (amicalisteId: string, status: Participant['status'] = 'confirmed') => {
    if (!evenementId) return
    const { error } = await supabase
      .from('evenement_participants')
      .upsert({
        evenement_id: evenementId,
        amicaliste_id: amicalisteId,
        status,
        paiement: 'en_attente',
        nombre_accompagnants: 0,
      }, { onConflict: 'evenement_id,amicaliste_id' })

    if (error) throw error
    await fetchAll()
  }

  const updateParticipantStatus = async (participantId: string, status: Participant['status']) => {
    const { error } = await supabase
      .from('evenement_participants')
      .update({ status })
      .eq('id', participantId)

    if (error) throw error
    setParticipants((prev) => prev.map((p) => p.id === participantId ? { ...p, status } : p))
  }

  const updateParticipantPaiement = async (participantId: string, paiement: Participant['paiement']) => {
    const participant = participants.find((p) => p.id === participantId)
    const previousPaiement = participant?.paiement

    const { error } = await supabase
      .from('evenement_participants')
      .update({ paiement })
      .eq('id', participantId)

    if (error) throw error

    if (evenement && participant) {
      const nomParticipant = `${participant.amicalistes.first_name} ${participant.amicalistes.last_name}`

      // Passage à "payé" → créer une transaction dans le livre de compte
      if (paiement === 'paye' && evenement.tarif_amicaliste) {
        const { data: { user } } = await supabase.auth.getUser()

        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('association_id', evenement.association_id)
          .ilike('name', 'EVENEMENT')
          .maybeSingle()

        await supabase.from('transactions').insert({
          association_id: evenement.association_id,
          type: 'income',
          amount: evenement.tarif_amicaliste,
          description: evenement.titre,
          date: new Date().toISOString().split('T')[0],
          category_id: cat?.id || null,
          notes: `Paiement de ${nomParticipant} — ${evenement.titre}`,
          created_by: user?.id || null,
          updated_by: user?.id || null,
        })
      }

      // Retour à "en_attente" depuis "payé" → supprimer la transaction
      if (paiement === 'en_attente' && previousPaiement === 'paye') {
        await supabase
          .from('transactions')
          .delete()
          .eq('association_id', evenement.association_id)
          .eq('description', evenement.titre)
          .eq('type', 'income')
          .ilike('notes', `%${nomParticipant}%`)
      }
    }

    setParticipants((prev) => prev.map((p) => p.id === participantId ? { ...p, paiement } : p))
  }

  const updateParticipantAccompagnants = async (participantId: string, nombre: number) => {
    const { error } = await supabase
      .from('evenement_participants')
      .update({ nombre_accompagnants: nombre })
      .eq('id', participantId)

    if (error) throw error
    setParticipants((prev) => prev.map((p) => p.id === participantId ? { ...p, nombre_accompagnants: nombre } : p))
  }

  const removeParticipant = async (participantId: string) => {
    const { error } = await supabase
      .from('evenement_participants')
      .delete()
      .eq('id', participantId)

    if (error) throw error
    setParticipants((prev) => prev.filter((p) => p.id !== participantId))
  }

  // ─── Invités externes ─────────────────────────────────────────────────────

  const addInvite = async (data: { nom: string; email?: string; telephone?: string }) => {
    if (!evenementId) return
    const { data: inv, error } = await supabase
      .from('evenement_invites')
      .insert({
        evenement_id: evenementId,
        nom: data.nom,
        email: data.email || null,
        telephone: data.telephone || null,
        statut: 'invite',
        paiement: 'en_attente',
      })
      .select()
      .single()

    if (error) throw error
    if (inv) setInvites((prev) => [...prev, inv as Invite])
  }

  const updateInviteStatut = async (inviteId: string, statut: Invite['statut']) => {
    const { error } = await supabase
      .from('evenement_invites')
      .update({ statut })
      .eq('id', inviteId)

    if (error) throw error
    setInvites((prev) => prev.map((i) => i.id === inviteId ? { ...i, statut } : i))
  }

  const updateInvitePaiement = async (inviteId: string, paiement: Invite['paiement']) => {
    const invite = invites.find((i) => i.id === inviteId)
    const previousPaiement = invite?.paiement

    const { error } = await supabase
      .from('evenement_invites')
      .update({ paiement })
      .eq('id', inviteId)

    if (error) throw error

    if (evenement && invite) {
      const nomInvite = `${invite.nom} (extérieur)`

      // Passage à "payé" → créer une transaction dans le livre de compte
      if (paiement === 'paye' && evenement.tarif_exterieur) {
        const { data: { user } } = await supabase.auth.getUser()

        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('association_id', evenement.association_id)
          .ilike('name', 'EVENEMENT')
          .maybeSingle()

        await supabase.from('transactions').insert({
          association_id: evenement.association_id,
          type: 'income',
          amount: evenement.tarif_exterieur,
          description: evenement.titre,
          date: new Date().toISOString().split('T')[0],
          category_id: cat?.id || null,
          notes: `Paiement de ${nomInvite} — ${evenement.titre}`,
          created_by: user?.id || null,
          updated_by: user?.id || null,
        })
      }

      // Retour à "en_attente" depuis "payé" → supprimer la transaction
      if (paiement === 'en_attente' && previousPaiement === 'paye') {
        await supabase
          .from('transactions')
          .delete()
          .eq('association_id', evenement.association_id)
          .eq('description', evenement.titre)
          .eq('type', 'income')
          .ilike('notes', `%${invite.nom}%`)
      }
    }

    setInvites((prev) => prev.map((i) => i.id === inviteId ? { ...i, paiement } : i))
  }

  const removeInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('evenement_invites')
      .delete()
      .eq('id', inviteId)

    if (error) throw error
    setInvites((prev) => prev.filter((i) => i.id !== inviteId))
  }

  // ─── Commentaires ─────────────────────────────────────────────────────────

  const addCommentaire = async (data: { auteur: string; contenu: string; note?: number }) => {
    if (!evenementId) return
    const { data: comm, error } = await supabase
      .from('evenement_commentaires')
      .insert({
        evenement_id: evenementId,
        auteur: data.auteur,
        contenu: data.contenu,
        note: data.note ?? null,
      })
      .select()
      .single()

    if (error) throw error
    if (comm) setCommentaires((prev) => [comm as Commentaire, ...prev])
  }

  const deleteCommentaire = async (commentaireId: string) => {
    const { error } = await supabase
      .from('evenement_commentaires')
      .delete()
      .eq('id', commentaireId)

    if (error) throw error
    setCommentaires((prev) => prev.filter((c) => c.id !== commentaireId))
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = {
    confirmes: participants.filter((p) => p.status === 'confirmed').length,
    enAttente: participants.filter((p) => p.status === 'invited').length,
    refuses: participants.filter((p) => p.status === 'declined').length,
    invitesExternesTotal: invites.length,
    invitesConfirmes: invites.filter((i) => i.statut === 'confirme').length,
    totalPresences:
      participants.filter((p) => p.status === 'confirmed').reduce((s, p) => s + 1 + p.nombre_accompagnants, 0) +
      invites.filter((i) => i.statut === 'confirme').length,
    paiementsEnAttente:
      participants.filter((p) => p.paiement === 'en_attente').length +
      invites.filter((i) => i.paiement === 'en_attente').length,
    paiementsReçus:
      participants.filter((p) => p.paiement === 'paye').length +
      invites.filter((i) => i.paiement === 'paye').length,
    notesMoyenne:
      commentaires.length > 0
        ? commentaires.filter((c) => c.note).reduce((s, c) => s + (c.note ?? 0), 0) /
          commentaires.filter((c) => c.note).length
        : 0,
  }

  return {
    evenement,
    participants,
    invites,
    commentaires,
    stats,
    loading,
    error,
    refetch: fetchAll,
    // Participants
    addParticipant,
    updateParticipantStatus,
    updateParticipantPaiement,
    updateParticipantAccompagnants,
    removeParticipant,
    // Invités
    addInvite,
    updateInviteStatut,
    updateInvitePaiement,
    removeInvite,
    // Commentaires
    addCommentaire,
    deleteCommentaire,
  }
}
