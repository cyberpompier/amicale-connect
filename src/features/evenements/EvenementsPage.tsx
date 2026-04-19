import { useEvenements } from '@/hooks/useEvenements'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, MapPin, Clock, Trash2, Pencil, ChevronRight, CalendarDays, Flame } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function groupByMonth(events: ReturnType<typeof useEvenements>['evenements']) {
  const groups: Record<string, typeof events> = {}
  events.forEach((e) => {
    const key = new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  return groups
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EvenementsPage() {
  const { loading, deleteEvenement, getUpcoming } = useEvenements()
  const navigate = useNavigate()

  const upcoming = getUpcoming()
  const next = upcoming[0]
  const thisMonth = upcoming.filter((e) => {
    const d = new Date(e.date + 'T00:00:00')
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const groupedUpcoming = groupByMonth(upcoming)

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return
    try {
      await deleteEvenement(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Événements"
        subtitle={`${upcoming.length} événement${upcoming.length !== 1 ? 's' : ''} à venir`}
        action={
          <button
            onClick={() => navigate('/evenements/creer')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Créer un événement</span>
            <span className="sm:hidden">Créer</span>
          </button>
        }
      />

      {/* ── Bannière prochain événement ──────────────────────── */}
      {next && (
        <div
          className="relative overflow-hidden bg-gradient-to-r from-[var(--color-primary)] to-red-700 rounded-2xl p-5 text-white cursor-pointer shadow-[var(--shadow-md)] group"
          onClick={() => navigate(`/evenements/${next.id}`)}
        >
          {/* Décorations */}
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -right-2 -bottom-10 w-28 h-28 bg-white/5 rounded-full" />

          <div className="relative flex items-start gap-4">
            {/* Date badge */}
            <div className="flex-shrink-0 bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-center border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wide text-red-100">
                {new Date(next.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
              </p>
              <p className="text-3xl font-bold leading-none mt-0.5">
                {new Date(next.date + 'T00:00:00').getDate()}
              </p>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                  <Flame className="w-3 h-3" />
                  Prochain événement
                </span>
              </div>
              <h2 className="text-lg font-bold leading-snug truncate group-hover:underline">{next.titre}</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {next.heure && (
                  <span className="flex items-center gap-1 text-sm text-red-100">
                    <Clock className="w-3.5 h-3.5" /> {next.heure}
                  </span>
                )}
                {next.lieu && (
                  <span className="flex items-center gap-1 text-sm text-red-100">
                    <MapPin className="w-3.5 h-3.5" /> {next.lieu}
                  </span>
                )}
              </div>
            </div>

            {/* Jours restants */}
            <div className="flex-shrink-0 text-right">
              {(() => {
                const d = daysUntil(next.date)
                return (
                  <div>
                    <p className="text-3xl font-bold">{d === 0 ? '🎉' : d}</p>
                    <p className="text-xs text-red-100">{d === 0 ? "Aujourd'hui !" : d === 1 ? 'demain' : 'jours'}</p>
                  </div>
                )
              })()}
            </div>
          </div>

          <div className="relative mt-4 flex items-center gap-1.5 text-sm text-red-100 group-hover:text-white transition-colors">
            Voir les détails <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      )}

      {/* ── Stats rapides ────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <CalendarDays className="w-5 h-5 text-[var(--color-primary)]" />, value: upcoming.length, label: 'À venir', bg: 'bg-red-50' },
            { icon: <Calendar className="w-5 h-5 text-indigo-500" />, value: thisMonth.length, label: 'Ce mois-ci', bg: 'bg-indigo-50' },
            { icon: <Flame className="w-5 h-5 text-amber-500" />, value: next ? daysUntil(next.date) : 0, label: 'Jours avant', bg: 'bg-amber-50' },
          ].map(({ icon, value, label, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-3 text-center border border-white`}>
              <div className="flex justify-center mb-1">{icon}</div>
              <p className="text-xl font-bold text-[var(--color-text)]">{value}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Liste groupée par mois ───────────────────────────── */}
      {upcoming.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun événement prévu</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Planifiez vos prochains rassemblements et activités.
          </p>
          <button
            onClick={() => navigate('/evenements/creer')}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Créer le premier événement
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedUpcoming).map(([month, events]) => (
            <div key={month}>
              {/* En-tête de mois */}
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] capitalize">
                  {month}
                </h3>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span className="text-xs text-[var(--color-text-muted)]">{events.length} événement{events.length > 1 ? 's' : ''}</span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {events.map((evt) => {
                  const days = daysUntil(evt.date)
                  const isToday = days === 0
                  const isTomorrow = days === 1
                  const isSoon = days <= 7

                  return (
                    <div
                      key={evt.id}
                      className="rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] hover:border-red-200 transition-all cursor-pointer group overflow-hidden"
                      onClick={() => navigate(`/evenements/${evt.id}`)}
                    >
                      {/* Image banner si elle existe */}
                      {evt.image_url && (
                        <div className="h-24 overflow-hidden bg-gray-200">
                          <img
                            src={evt.image_url}
                            alt={evt.titre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}

                      {/* Barre de couleur latérale */}
                      <div className="flex bg-white">
                        <div className={`w-1 flex-shrink-0 ${isToday ? 'bg-green-500' : isSoon ? 'bg-amber-400' : 'bg-[var(--color-primary)]'}`} />

                        <div className="flex-1 p-4 flex items-center gap-4">
                          {/* Date badge */}
                          <div className="flex-shrink-0 w-12 h-12 bg-[var(--color-primary-light)] rounded-xl flex flex-col items-center justify-center border border-red-100 group-hover:scale-105 transition-transform">
                            <span className="text-xs font-bold text-[var(--color-primary)] uppercase leading-none">
                              {new Date(evt.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                            </span>
                            <span className="text-xl font-bold text-[var(--color-primary)] leading-tight">
                              {new Date(evt.date + 'T00:00:00').getDate()}
                            </span>
                          </div>

                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                {evt.titre}
                              </h3>
                              {isToday && (
                                <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Aujourd'hui !</span>
                              )}
                              {isTomorrow && (
                                <span className="inline-flex px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Demain</span>
                              )}
                              {isSoon && !isToday && !isTomorrow && (
                                <span className="inline-flex px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">Dans {days}j</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                              {evt.heure && (
                                <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                                  <Clock className="w-3 h-3" /> {evt.heure}
                                </span>
                              )}
                              {evt.lieu && (
                                <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                                  <MapPin className="w-3 h-3" /> {evt.lieu}
                                </span>
                              )}
                              {!evt.heure && !evt.lieu && (
                                <span className="text-xs text-[var(--color-text-muted)]">{formatDateShort(evt.date)}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions + flèche */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/evenements/creer?id=${evt.id}`) }}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Modifier"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(evt.id, e)}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
