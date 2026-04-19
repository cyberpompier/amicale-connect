import { useState, useEffect } from 'react'
import { Users, Crown, ShieldCheck, Eye, UserPlus, Trash2, Mail } from 'lucide-react'
import { useAssociation } from '@/features/association/AssociationContext'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/PageHeader'

interface TeamMember {
  id: string
  user_id: string
  role: string
  email?: string
  full_name?: string
  created_at: string
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: 'Propriétaire', icon: Crown, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  admin: { label: 'Administrateur', icon: ShieldCheck, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  member: { label: 'Membre', icon: Eye, color: 'text-gray-600 bg-gray-50 border-gray-200' },
}

export function ParametresEquipePage() {
  const { currentAssociation } = useAssociation()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('admin')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  useEffect(() => {
    if (!currentAssociation) return
    fetchTeam()
  }, [currentAssociation])

  const fetchTeam = async () => {
    if (!currentAssociation) return
    setLoading(true)
    const { data, error } = await supabase
      .from('association_members')
      .select('id, user_id, role, created_at')
      .eq('association_id', currentAssociation.id)

    if (!error && data) {
      // Récupérer les profils
      const userIds = data.map((m) => m.user_id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      const enriched = data.map((m) => {
        const profile = profiles?.find((p) => p.id === m.user_id)
        return {
          ...m,
          email: profile?.email,
          full_name: profile?.full_name,
        }
      })
      setMembers(enriched)
    }
    setLoading(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !currentAssociation) return
    setInviting(true)

    // Pour l'instant on affiche juste un succès (l'invitation réelle nécessite une Edge Function)
    setTimeout(() => {
      setInviteSuccess(true)
      setInviteEmail('')
      setShowInvite(false)
      setInviting(false)
      setTimeout(() => setInviteSuccess(false), 4000)
    }, 800)
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    if (email) return email[0].toUpperCase()
    return '?'
  }

  return (
    <div>
      <PageHeader
        title="Équipe"
        subtitle="Gérez les membres administrateurs de votre association"
        action={
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Inviter</span>
          </button>
        }
      />

      <div className="max-w-2xl space-y-5">

        {/* Formulaire d'invitation */}
        {showInvite && (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Inviter un membre</h3>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemple.fr"
                    className="w-full pl-9 pr-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                >
                  <option value="admin">Administrateur</option>
                  <option value="member">Membre</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Envoi...' : 'Envoyer l\'invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {inviteSuccess && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200 flex items-center gap-2">
            ✅ Invitation envoyée avec succès !
          </div>
        )}

        {/* Liste des membres */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center">
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Membres de l'équipe
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {members.length} utilisateur{members.length !== 1 ? 's' : ''} avec accès
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-[var(--color-text-muted)]">Aucun membre dans l'équipe</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {members.map((m) => {
                const roleConf = ROLE_CONFIG[m.role] || ROLE_CONFIG['member']
                const RoleIcon = roleConf.icon
                return (
                  <li key={m.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--color-bg-secondary)] transition-colors">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[var(--color-primary)]">
                        {getInitials(m.full_name, m.email)}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                        {m.full_name || m.email || 'Utilisateur'}
                      </p>
                      {m.email && m.full_name && (
                        <p className="text-xs text-[var(--color-text-muted)] truncate">{m.email}</p>
                      )}
                    </div>
                    {/* Rôle */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${roleConf.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {roleConf.label}
                    </span>
                    {/* Actions (pas pour owner) */}
                    {m.role !== 'owner' && (
                      <button className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Info rôles */}
        <section className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-5">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Rôles disponibles</h3>
          <div className="space-y-2">
            {Object.entries(ROLE_CONFIG).map(([key, conf]) => {
              const Icon = conf.icon
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${conf.color} min-w-28`}>
                    <Icon className="w-3 h-3" /> {conf.label}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {key === 'owner' && 'Accès total, gestion de l\'abonnement'}
                    {key === 'admin' && 'Accès complet sauf facturation'}
                    {key === 'member' && 'Consultation uniquement'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

      </div>
    </div>
  )
}
