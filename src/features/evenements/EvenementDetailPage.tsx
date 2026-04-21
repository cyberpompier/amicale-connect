import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Clock, Users, MessageSquare, Star,
  Check, X, HelpCircle, Plus, Pencil, Trash2, Share2,
  Link2, Phone, Mail, ChevronDown, ChevronUp, UserPlus,
  CheckCircle2, AlertCircle, UserMinus, Copy,
} from 'lucide-react'
import { useEvenementDetail, type Participant, type Invite } from '@/hooks/useEvenementDetail'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { cn, formatDateShort } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(prenom: string, nom: string) {
  return (prenom[0] + nom[0]).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
]
function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ prenom, nom, size = 'md' }: { prenom: string; nom: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold text-white flex-shrink-0', sizeClass, avatarColor(prenom + nom))}>
      {getInitials(prenom, nom)}
    </div>
  )
}


function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cn('transition-colors', readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110')}
        >
          <Star
            className={cn(
              'w-5 h-5 transition-colors',
              (hovered || value) >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'
            )}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function EvenementDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    evenement, participants, invites, commentaires, stats,
    loading, error,
    addParticipant, updateParticipantStatus, updateParticipantPaiement,
    updateParticipantAccompagnants, removeParticipant,
    addInvite, updateInviteStatut, updateInvitePaiement, removeInvite,
    addCommentaire, deleteCommentaire,
  } = useEvenementDetail(id)
  const { amicalistes } = useAmicalistes()

  // UI state
  const [showAddMember, setShowAddMember]   = useState(false)
  const [showAddInvite, setShowAddInvite]   = useState(false)
  const [showAddComment, setShowAddComment] = useState(false)
  const [memberSearch, setMemberSearch]     = useState('')
  const [expandParticipants, setExpandParticipants] = useState(true)
  const [expandInvites, setExpandInvites]   = useState(true)
  const [expandComments, setExpandComments] = useState(true)
  const [copied, setCopied]                 = useState(false)

  // Forms
  const [inviteForm, setInviteForm] = useState({ nom: '', email: '', telephone: '' })
  const [commentForm, setCommentForm] = useState({ auteur: '', contenu: '', note: 0 })
  const [savingInvite, setSavingInvite]   = useState(false)
  const [savingComment, setSavingComment] = useState(false)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAddMember = async (amicalisteId: string) => {
    try {
      await addParticipant(amicalisteId, 'confirmed')
      setMemberSearch('')
      setShowAddMember(false)
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  const handleAddInvite = async (e: FormEvent) => {
    e.preventDefault()
    if (!inviteForm.nom.trim()) return
    setSavingInvite(true)
    try {
      await addInvite(inviteForm)
      setInviteForm({ nom: '', email: '', telephone: '' })
      setShowAddInvite(false)
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
    setSavingInvite(false)
  }

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault()
    if (!commentForm.auteur.trim() || !commentForm.contenu.trim()) return
    setSavingComment(true)
    try {
      await addCommentaire(commentForm)
      setCommentForm({ auteur: '', contenu: '', note: 0 })
      setShowAddComment(false)
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
    setSavingComment(false)
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleParticipantPaiement = async (p: Participant, next: Participant['paiement']) => {
    if (next === p.paiement) return
    const nom = `${p.amicalistes.first_name} ${p.amicalistes.last_name}`
    const messages: Record<Participant['paiement'], string> = {
      paye: `Confirmer le paiement de ${nom} ?\nUne recette sera créée dans le livre de compte.`,
      exonere: `Marquer ${nom} comme exonéré de paiement ?`,
      en_attente: `Annuler le paiement de ${nom} ?\nL'entrée dans le livre de compte sera supprimée.`,
    }
    if (!confirm(messages[next])) return
    try { await updateParticipantPaiement(p.id, next) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  const handleInvitePaiement = async (inv: Invite, next: Invite['paiement']) => {
    if (next === inv.paiement) return
    const messages: Record<Invite['paiement'], string> = {
      paye: `Confirmer le paiement de ${inv.nom} ?\nUne recette sera créée dans le livre de compte.`,
      exonere: `Marquer ${inv.nom} comme exonéré de paiement ?`,
      en_attente: `Annuler le paiement de ${inv.nom} ?\nL'entrée dans le livre de compte sera supprimée.`,
    }
    if (!confirm(messages[next])) return
    try { await updateInvitePaiement(inv.id, next) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const alreadyAdded = new Set(participants.map((p) => p.amicaliste_id))
  const filteredAmicalistes = amicalistes.filter(
    (a) => !alreadyAdded.has(a.id) &&
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const confirmes = participants.filter((p) => p.status === 'confirmed')
  const enAttente = participants.filter((p) => p.status === 'invited')
  const refuses   = participants.filter((p) => p.status === 'declined')

  const isUpcoming = evenement ? evenement.date >= new Date().toISOString().split('T')[0] : false

  // ── Event date display ────────────────────────────────────────────────────

  const dateObj = evenement ? new Date(evenement.date + 'T00:00:00') : null
  const dayNum   = dateObj?.getDate()
  const monthStr = dateObj?.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()
  const weekday  = dateObj?.toLocaleDateString('fr-FR', { weekday: 'long' })

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !evenement) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)]">{error || 'Événement introuvable'}</p>
        <button onClick={() => navigate('/evenements')} className="mt-4 text-sm text-[var(--color-primary)] hover:underline">
          Retour aux événements
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      {/* ── Barre de navigation ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/evenements')}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Événements
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
              copied
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:text-[var(--color-text)] hover:border-gray-300'
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
            {copied ? 'Copié !' : 'Partager'}
          </button>
          <button
            onClick={() => navigate(`/evenements/creer?id=${evenement.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier
          </button>
        </div>
      </div>

      {/* ── Bannière image ──────────────────────────────────────────────── */}
      {evenement.image_url && (
        <div className="w-full h-64 rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow)]">
          <img
            src={evenement.image_url}
            alt={evenement.titre}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* ── Hero card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
        {/* Bande couleur en haut */}
        <div className={cn('h-2', isUpcoming ? 'bg-[var(--color-primary)]' : 'bg-gray-300')} />

        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Date badge */}
            <div className={cn(
              'flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2',
              isUpcoming ? 'bg-[var(--color-primary-light)] border-red-200' : 'bg-gray-100 border-gray-200'
            )}>
              <span className={cn('text-xs font-bold uppercase leading-none', isUpcoming ? 'text-[var(--color-primary)]' : 'text-gray-400')}>
                {monthStr}
              </span>
              <span className={cn('text-4xl font-bold leading-tight', isUpcoming ? 'text-[var(--color-primary)]' : 'text-gray-400')}>
                {dayNum}
              </span>
            </div>

            {/* Infos */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--color-text)] leading-snug">{evenement.titre}</h1>
              <p className="text-sm text-[var(--color-text-muted)] capitalize mt-0.5">{weekday} {formatDateShort(evenement.date)}</p>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {evenement.heure && (
                  <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                    <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                    {evenement.heure}
                  </span>
                )}
                {evenement.lieu && (
                  <a
                    href={`https://maps.google.com?q=${encodeURIComponent(evenement.lieu)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
                    {evenement.lieu}
                  </a>
                )}
              </div>

              {evenement.description && (
                <p className="text-sm text-[var(--color-text-muted)] mt-3 leading-relaxed line-clamp-3">
                  {evenement.description}
                </p>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-2 mt-5 pt-5 border-t border-[var(--color-border)]">
            {[
              { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, value: stats.confirmes, label: 'Confirmés', color: 'text-green-600' },
              { icon: <HelpCircle className="w-4 h-4 text-amber-500" />, value: stats.enAttente, label: 'En attente', color: 'text-amber-600' },
              { icon: <UserMinus className="w-4 h-4 text-red-400" />, value: stats.invitesConfirmes, label: 'Invités', color: 'text-gray-500' },
              { icon: <MessageSquare className="w-4 h-4 text-blue-500" />, value: commentaires.length, label: 'Avis', color: 'text-blue-600' },
            ].map(({ icon, value, label, color }) => (
              <div key={label} className="text-center">
                <div className="flex justify-center mb-1">{icon}</div>
                <div className={cn('text-lg font-bold', color)}>{value}</div>
                <div className="text-xs text-[var(--color-text-muted)] leading-none">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Présences totales ───────────────────────────────────────────── */}
      {stats.totalPresences > 0 && (
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-red-700 rounded-xl p-4 text-white shadow-[var(--shadow)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-100">Total des présences attendues</p>
              <p className="text-3xl font-bold mt-0.5">{stats.totalPresences} personnes</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-red-100">Paiements reçus</p>
              <p className="text-2xl font-bold">{stats.paiementsReçus}</p>
            </div>
          </div>
          {/* Avatars stack */}
          {confirmes.length > 0 && (
            <div className="flex items-center gap-1 mt-3">
              <div className="flex -space-x-2">
                {confirmes.slice(0, 7).map((p) => (
                  <div
                    key={p.id}
                    className={cn('w-8 h-8 rounded-full border-2 border-red-600 flex items-center justify-center text-xs font-bold text-white', avatarColor(p.amicalistes.first_name + p.amicalistes.last_name))}
                    title={`${p.amicalistes.first_name} ${p.amicalistes.last_name}`}
                  >
                    {getInitials(p.amicalistes.first_name, p.amicalistes.last_name)}
                  </div>
                ))}
              </div>
              {confirmes.length > 7 && (
                <span className="text-xs text-red-100 ml-1">+{confirmes.length - 7} autres</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Participants (membres) ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        {/* Header section */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <button
            onClick={() => setExpandParticipants(!expandParticipants)}
            className="flex items-center gap-2 font-semibold text-[var(--color-text)]"
          >
            <Users className="w-4 h-4 text-[var(--color-primary)]" />
            Participants membres
            <span className="text-xs text-[var(--color-text-muted)] font-normal">({participants.length})</span>
            {expandParticipants ? <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />}
          </button>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Inscrire
          </button>
        </div>

        {/* Formulaire ajout membre */}
        {showAddMember && (
          <div className="border-b border-[var(--color-border)] p-4 bg-[var(--color-bg-secondary)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Rechercher un membre</p>
            <input
              type="text"
              placeholder="Nom du membre..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
            {memberSearch && (
              <div className="mt-2 bg-white rounded-lg border border-[var(--color-border)] divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto">
                {filteredAmicalistes.length === 0 ? (
                  <p className="px-3 py-2.5 text-sm text-[var(--color-text-muted)]">Aucun membre trouvé</p>
                ) : filteredAmicalistes.slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleAddMember(a.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
                  >
                    <Avatar prenom={a.first_name} nom={a.last_name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{a.last_name} {a.first_name}</p>
                      {a.grade && <p className="text-xs text-[var(--color-text-muted)]">{a.grade}</p>}
                    </div>
                    <Plus className="w-4 h-4 text-[var(--color-primary)] ml-auto" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {expandParticipants && (
          <div>
            {/* Confirmés */}
            {confirmes.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-green-50 border-b border-green-100">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">✅ Confirmés — {confirmes.length}</p>
                </div>
                {confirmes.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    onStatusChange={(s) => updateParticipantStatus(p.id, s)}
                    onPaiementChange={(next) => handleParticipantPaiement(p, next)}
                    onAccompagnantsChange={(n) => updateParticipantAccompagnants(p.id, n)}
                    onRemove={() => { if (confirm(`Retirer ${p.amicalistes.first_name} ?`)) removeParticipant(p.id) }}
                  />
                ))}
              </div>
            )}

            {/* En attente */}
            {enAttente.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-amber-50 border-b border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">⏳ En attente — {enAttente.length}</p>
                </div>
                {enAttente.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    onStatusChange={(s) => updateParticipantStatus(p.id, s)}
                    onPaiementChange={(next) => handleParticipantPaiement(p, next)}
                    onAccompagnantsChange={(n) => updateParticipantAccompagnants(p.id, n)}
                    onRemove={() => { if (confirm(`Retirer ${p.amicalistes.first_name} ?`)) removeParticipant(p.id) }}
                  />
                ))}
              </div>
            )}

            {/* Refusés */}
            {refuses.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-red-50 border-b border-red-100">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">❌ Refusés — {refuses.length}</p>
                </div>
                {refuses.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    onStatusChange={(s) => updateParticipantStatus(p.id, s)}
                    onPaiementChange={(next) => handleParticipantPaiement(p, next)}
                    onAccompagnantsChange={(n) => updateParticipantAccompagnants(p.id, n)}
                    onRemove={() => { if (confirm(`Retirer ${p.amicalistes.first_name} ?`)) removeParticipant(p.id) }}
                  />
                ))}
              </div>
            )}

            {participants.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
                Aucun membre inscrit. Cliquez sur &quot;Inscrire&quot; pour ajouter des participants.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Invités externes ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <button
            onClick={() => setExpandInvites(!expandInvites)}
            className="flex items-center gap-2 font-semibold text-[var(--color-text)]"
          >
            <UserPlus className="w-4 h-4 text-indigo-500" />
            Invités externes
            <span className="text-xs text-[var(--color-text-muted)] font-normal">({invites.length})</span>
            {expandInvites ? <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />}
          </button>
          <button
            onClick={() => setShowAddInvite(!showAddInvite)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Inviter
          </button>
        </div>

        {/* Formulaire invitation */}
        {showAddInvite && (
          <div className="border-b border-[var(--color-border)] p-4 bg-[var(--color-bg-secondary)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Ajouter un invité externe</p>
            <form onSubmit={handleAddInvite} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Nom complet *"
                value={inviteForm.nom}
                onChange={(e) => setInviteForm((p) => ({ ...p, nom: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="tel"
                    placeholder="Téléphone"
                    value={inviteForm.telephone}
                    onChange={(e) => setInviteForm((p) => ({ ...p, telephone: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={savingInvite}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {savingInvite ? 'Ajout...' : 'Ajouter'}
                </button>
                <button type="button" onClick={() => setShowAddInvite(false)}
                  className="px-4 py-2 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-white transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {expandInvites && (
          <div>
            {invites.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
                Aucun invité externe. Cliquez sur &quot;Inviter&quot; pour ajouter des personnes extérieures.
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {invites.map((inv) => (
                  <InviteRow
                    key={inv.id}
                    invite={inv}
                    onStatutChange={(s) => updateInviteStatut(inv.id, s)}
                    onPaiementChange={(next) => handleInvitePaiement(inv, next)}
                    onRemove={() => { if (confirm(`Retirer ${inv.nom} ?`)) removeInvite(inv.id) }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Commentaires & Notes ─────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <button
            onClick={() => setExpandComments(!expandComments)}
            className="flex items-center gap-2 font-semibold text-[var(--color-text)]"
          >
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Commentaires & Notes
            {stats.notesMoyenne > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {stats.notesMoyenne.toFixed(1)}
              </span>
            )}
            <span className="text-xs text-[var(--color-text-muted)] font-normal">({commentaires.length})</span>
            {expandComments ? <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />}
          </button>
          <button
            onClick={() => setShowAddComment(!showAddComment)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        </div>

        {showAddComment && (
          <div className="border-b border-[var(--color-border)] p-4 bg-[var(--color-bg-secondary)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Nouveau commentaire</p>
            <form onSubmit={handleAddComment} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Votre nom *"
                value={commentForm.auteur}
                onChange={(e) => setCommentForm((p) => ({ ...p, auteur: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400"
              />
              <div>
                <p className="text-xs text-[var(--color-text-muted)] mb-1.5">Note (optionnel)</p>
                <StarRating value={commentForm.note} onChange={(v) => setCommentForm((p) => ({ ...p, note: v }))} />
              </div>
              <textarea
                required
                placeholder="Votre commentaire *"
                rows={3}
                value={commentForm.contenu}
                onChange={(e) => setCommentForm((p) => ({ ...p, contenu: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 resize-none"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={savingComment}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {savingComment ? 'Publication...' : 'Publier'}
                </button>
                <button type="button" onClick={() => setShowAddComment(false)}
                  className="px-4 py-2 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-white transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {expandComments && (
          <div>
            {commentaires.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-[var(--color-text-muted)]">
                Aucun commentaire. Soyez le premier à laisser un avis !
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {commentaires.map((c) => (
                  <div key={c.id} className="px-5 py-4 group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0', avatarColor(c.auteur))}>
                          {c.auteur.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[var(--color-text)]">{c.auteur}</span>
                            {c.note && <StarRating value={c.note} readonly />}
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--color-text)] mt-1 leading-relaxed">{c.contenu}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm('Supprimer ce commentaire ?')) deleteCommentaire(c.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Partage ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="font-semibold text-[var(--color-text)]">Partager cet événement</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-muted)] truncate">
            {window.location.href}
          </div>
          <button
            onClick={handleCopyLink}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0',
              copied
                ? 'bg-green-500 text-white'
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white'
            )}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
      </div>

    </div>
  )
}

// ─── ParticipantRow ───────────────────────────────────────────────────────────

function ParticipantRow({
  participant: p,
  onStatusChange,
  onPaiementChange,
  onAccompagnantsChange,
  onRemove,
}: {
  participant: Participant
  onStatusChange: (s: Participant['status']) => void
  onPaiementChange: (next: Participant['paiement']) => void
  onAccompagnantsChange: (n: number) => void
  onRemove: () => void
}) {
  const [showAccomp, setShowAccomp] = useState(false)
  const fullName = `${p.amicalistes.last_name} ${p.amicalistes.first_name}`

  return (
    <div className="px-4 py-3.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] transition-colors group">
      <Avatar prenom={p.amicalistes.first_name} nom={p.amicalistes.last_name} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">{fullName}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {p.amicalistes.grade && (
            <span className="text-xs text-[var(--color-text-muted)]">{p.amicalistes.grade}</span>
          )}
          {p.nombre_accompagnants > 0 && (
            <span className="text-xs text-indigo-500">+{p.nombre_accompagnants} acc.</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Status selector */}
        <select
          value={p.status}
          onChange={(e) => onStatusChange(e.target.value as Participant['status'])}
          className="text-xs border border-[var(--color-border)] rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 cursor-pointer"
        >
          <option value="confirmed">✅ Confirmé</option>
          <option value="invited">⏳ En attente</option>
          <option value="declined">❌ Refusé</option>
        </select>

        {/* Payment selector */}
        <select
          value={p.paiement}
          onChange={(e) => onPaiementChange(e.target.value as Participant['paiement'])}
          className={cn(
            'text-xs border rounded-lg px-2 py-1 font-semibold focus:outline-none focus:ring-1 cursor-pointer',
            p.paiement === 'paye'    ? 'bg-green-50 text-green-600 border-green-200 focus:ring-green-300' :
            p.paiement === 'exonere' ? 'bg-blue-50 text-blue-600 border-blue-200 focus:ring-blue-300' :
                                       'bg-amber-50 text-amber-600 border-amber-200 focus:ring-amber-300'
          )}
        >
          <option value="en_attente">⏳ En attente</option>
          <option value="paye">✅ Payé</option>
          <option value="exonere">🔵 Exonéré</option>
        </select>

        {/* Accompagnants */}
        <button
          onClick={() => setShowAccomp(!showAccomp)}
          title="Accompagnants"
          className="p-1.5 text-[var(--color-text-muted)] hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
        </button>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Accompagnants inline */}
      {showAccomp && (
        <div className="absolute right-16 bg-white border border-[var(--color-border)] rounded-lg shadow-lg p-3 z-10 flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">Accompagnants :</span>
          <button onClick={() => onAccompagnantsChange(Math.max(0, p.nombre_accompagnants - 1))}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center">−</button>
          <span className="text-sm font-semibold w-4 text-center">{p.nombre_accompagnants}</span>
          <button onClick={() => onAccompagnantsChange(p.nombre_accompagnants + 1)}
            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center">+</button>
          <button onClick={() => setShowAccomp(false)} className="ml-1 text-[var(--color-text-muted)]"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  )
}

// ─── InviteRow ────────────────────────────────────────────────────────────────

function InviteRow({
  invite: inv,
  onStatutChange,
  onPaiementChange,
  onRemove,
}: {
  invite: Invite
  onStatutChange: (s: Invite['statut']) => void
  onPaiementChange: (next: Invite['paiement']) => void
  onRemove: () => void
}) {
  return (
    <div className="px-4 py-3.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] transition-colors group">
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0', avatarColor(inv.nom))}>
        {inv.nom.slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">{inv.nom}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {inv.email && (
            <a href={`mailto:${inv.email}`} className="flex items-center gap-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
              <Mail className="w-3 h-3" /> {inv.email}
            </a>
          )}
          {inv.telephone && (
            <a href={`tel:${inv.telephone}`} className="flex items-center gap-0.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
              <Phone className="w-3 h-3" /> {inv.telephone}
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <select
          value={inv.statut}
          onChange={(e) => onStatutChange(e.target.value as Invite['statut'])}
          className="text-xs border border-[var(--color-border)] rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 cursor-pointer"
        >
          <option value="invite">📨 Invité</option>
          <option value="confirme">✅ Confirmé</option>
          <option value="decline">❌ Décliné</option>
        </select>

        <select
          value={inv.paiement}
          onChange={(e) => onPaiementChange(e.target.value as Invite['paiement'])}
          className={cn(
            'text-xs border rounded-lg px-2 py-1 font-semibold focus:outline-none focus:ring-1 cursor-pointer',
            inv.paiement === 'paye'    ? 'bg-green-50 text-green-600 border-green-200 focus:ring-green-300' :
            inv.paiement === 'exonere' ? 'bg-blue-50 text-blue-600 border-blue-200 focus:ring-blue-300' :
                                         'bg-amber-50 text-amber-600 border-amber-200 focus:ring-amber-300'
          )}
        >
          <option value="en_attente">⏳ En attente</option>
          <option value="paye">✅ Payé</option>
          <option value="exonere">🔵 Exonéré</option>
        </select>

        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
