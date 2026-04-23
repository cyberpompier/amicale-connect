import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  Edit,
  Package,
} from 'lucide-react'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierSecteurs, type CalendrierSecteur } from '@/hooks/useCalendrierSecteurs'

const STATUS_CONFIG: Record<
  CalendrierSecteur['status'],
  { label: string; icon: any; class: string; iconClass: string; bg: string }
> = {
  todo: {
    label: 'À faire',
    icon: Circle,
    class: 'bg-gray-100 text-gray-700',
    iconClass: 'text-gray-400',
    bg: 'bg-gray-100',
  },
  in_progress: {
    label: 'En cours',
    icon: Clock,
    class: 'bg-amber-100 text-amber-700',
    iconClass: 'text-amber-500',
    bg: 'bg-amber-100',
  },
  done: {
    label: 'Terminé',
    icon: CheckCircle2,
    class: 'bg-green-100 text-green-700',
    iconClass: 'text-green-600',
    bg: 'bg-green-100',
  },
}

export function CalendriersSecteursPage() {
  const navigate = useNavigate()
  const { activeCampagne, loading: campLoading } = useCalendrierCampagnes()
  const { secteurs, loading: secLoading, deleteSecteur } = useCalendrierSecteurs(activeCampagne?.id)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return secteurs
    const q = search.toLowerCase()
    return secteurs.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.calendrier_secteur_rues?.some((r) => r.name.toLowerCase().includes(q))
    )
  }, [secteurs, search])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer le secteur "${name}" ? Toutes les ventes associées seront supprimées.`)) return
    try {
      await deleteSecteur(id)
    } catch (err: any) {
      alert(err?.message ?? 'Erreur lors de la suppression')
    }
  }

  if (campLoading || secLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!activeCampagne) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
        <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)] font-medium">
          Aucune campagne active. Rendez-vous sur la page Tournée pour en créer une.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Secteurs</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Gestion des secteurs pour {activeCampagne.name}
          </p>
        </div>
        <button
          onClick={() => navigate('/calendriers/secteurs/creer')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau secteur
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Chercher un secteur, une rue..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
        />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] font-medium mb-4">
            {secteurs.length === 0 ? 'Aucun secteur créé' : 'Aucun secteur ne correspond à votre recherche'}
          </p>
          {secteurs.length === 0 && (
            <button
              onClick={() => navigate('/calendriers/secteurs/creer')}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Créer le premier secteur
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((secteur) => {
            const status = STATUS_CONFIG[secteur.status]
            const StatusIcon = status.icon
            const progression = secteur.progression_percent ?? 0
            const stock = secteur.calendrier_stocks
            return (
              <div
                key={secteur.id}
                className="bg-white rounded-2xl border border-[var(--color-border)] p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${status.bg}`}
                  >
                    <StatusIcon className={`w-5 h-5 ${status.iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate(`/calendriers/secteurs/${secteur.id}`)}
                      className="font-semibold text-[var(--color-text)] truncate hover:text-[var(--color-primary)] transition-colors block text-left"
                    >
                      {secteur.name}
                    </button>
                    <span
                      className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${status.class}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">Collecté</p>
                    <p className="font-bold text-green-600">{(secteur.total_collected ?? 0).toFixed(0)}€</p>
                  </div>
                  <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">Vendus</p>
                    <p className="font-bold text-[var(--color-text)]">
                      {secteur.total_calendriers_sold ?? 0}
                      {stock ? <span className="text-[10px] text-[var(--color-text-muted)] font-normal"> / {stock.allocated_qty}</span> : null}
                    </p>
                  </div>
                  <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">Équipe</p>
                    <p className="font-bold text-[var(--color-text)]">
                      {secteur.calendrier_secteur_equipiers?.length ?? 0}
                    </p>
                  </div>
                </div>

                {/* Progression */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                    <span>Progression</span>
                    <span className="text-[var(--color-primary)]">{progression.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        secteur.status === 'done'
                          ? 'bg-green-500'
                          : progression > 0
                          ? 'bg-amber-500'
                          : 'bg-gray-200'
                      }`}
                      style={{ width: `${progression}%` }}
                    />
                  </div>
                </div>

                {/* Rues */}
                {secteur.calendrier_secteur_rues && secteur.calendrier_secteur_rues.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Rues
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {secteur.calendrier_secteur_rues.slice(0, 3).map((r) => (
                        <span
                          key={r.id}
                          className="text-[11px] bg-[var(--color-bg-secondary)] px-2 py-0.5 rounded-md text-[var(--color-text-muted)]"
                        >
                          {r.name}
                        </span>
                      ))}
                      {secteur.calendrier_secteur_rues.length > 3 && (
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          +{secteur.calendrier_secteur_rues.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Équipe */}
                {secteur.calendrier_secteur_equipiers && secteur.calendrier_secteur_equipiers.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Équipe
                    </p>
                    <div className="flex -space-x-1">
                      {secteur.calendrier_secteur_equipiers.slice(0, 4).map((eq) => (
                        <div
                          key={eq.id}
                          title={`${eq.amicalistes?.first_name} ${eq.amicalistes?.last_name}`}
                          className="w-6 h-6 rounded-full bg-[var(--color-primary)]/10 border-2 border-white flex items-center justify-center text-[var(--color-primary)] text-[10px] font-bold"
                        >
                          {eq.amicalistes?.first_name?.[0]}
                          {eq.amicalistes?.last_name?.[0]}
                        </div>
                      ))}
                      {secteur.calendrier_secteur_equipiers.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border-2 border-white flex items-center justify-center text-[var(--color-text-muted)] text-[10px] font-bold">
                          +{secteur.calendrier_secteur_equipiers.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 pt-3 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => navigate(`/calendriers/secteurs/${secteur.id}/vente`)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-md text-xs font-bold transition-colors"
                  >
                    <Package className="w-3 h-3" /> Vente
                  </button>
                  <button
                    onClick={() => navigate(`/calendriers/secteurs/${secteur.id}/editer`)}
                    className="px-2 py-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] rounded-md transition-colors"
                    title="Éditer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(secteur.id, secteur.name)}
                    className="px-2 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
