import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  MapPin,
  CheckCircle2,
  Clock,
  Circle,
  ChevronRight,
  Plus,
  Users,
  Settings,
  X,
  FileArchive,
  RotateCcw,
  Package,
} from 'lucide-react'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierSecteurs, type CalendrierSecteur } from '@/hooks/useCalendrierSecteurs'
import { useCalendrierVentes } from '@/hooks/useCalendrierVentes'
import { formatDateShort } from '@/lib/utils'

type StatusFilter = 'toutes' | 'todo' | 'in_progress' | 'done'

const STATUS_CONFIG: Record<CalendrierSecteur['status'], { label: string; icon: any; class: string; iconClass: string }> = {
  todo: { label: 'TODO', icon: Circle, class: 'bg-gray-100 text-gray-600', iconClass: 'text-gray-400' },
  in_progress: { label: 'EN COURS', icon: Clock, class: 'bg-amber-100 text-amber-700', iconClass: 'text-amber-500' },
  done: { label: 'TERMINÉ', icon: CheckCircle2, class: 'bg-green-100 text-green-700', iconClass: 'text-green-600' },
}

export function CalendriersPage() {
  const navigate = useNavigate()
  const { activeCampagne, loading: campLoading, ensureCurrentCampagne } = useCalendrierCampagnes()
  const { secteurs, loading: secLoading, updateStatus } = useCalendrierSecteurs(activeCampagne?.id)
  const { ventes } = useCalendrierVentes(activeCampagne?.id)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('toutes')
  const [selectedSecteurId, setSelectedSecteurId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'current' | 'history'>('current')
  const [creating, setCreating] = useState(false)

  const selectedSecteur = useMemo(
    () => secteurs.find((s) => s.id === selectedSecteurId) ?? null,
    [secteurs, selectedSecteurId]
  )

  const secteurVentes = useMemo(() => {
    if (!selectedSecteurId) return []
    return ventes.filter((v) => v.secteur_id === selectedSecteurId)
  }, [ventes, selectedSecteurId])

  const totalCollected = useMemo(
    () => ventes.reduce((sum, v) => sum + Number(v.amount), 0),
    [ventes]
  )
  const totalCalendriers = useMemo(
    () => ventes.reduce((sum, v) => sum + v.quantity, 0),
    [ventes]
  )

  const progressionGlobale = useMemo(() => {
    if (!activeCampagne || activeCampagne.objective_amount === 0) return 0
    return Math.min(100, (totalCollected / activeCampagne.objective_amount) * 100)
  }, [activeCampagne, totalCollected])

  const filteredSecteurs = useMemo(() => {
    return secteurs.filter((s) => {
      const matchSearch = !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.calendrier_secteur_rues?.some((r) => r.name.toLowerCase().includes(search.toLowerCase()))
      const matchStatus = statusFilter === 'toutes' || s.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [secteurs, search, statusFilter])

  const handleCreateCampagne = async () => {
    setCreating(true)
    try {
      await ensureCurrentCampagne()
    } catch (err) {
      console.error(err)
    }
    setCreating(false)
  }

  if (campLoading || secLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  // Aucune campagne active → Proposer d'en créer une
  if (!activeCampagne) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 mx-auto flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">
            Démarrer la tournée {new Date().getFullYear()}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            Aucune campagne de calendriers n'est active. Lancez votre tournée annuelle pour commencer à enregistrer les ventes.
          </p>
          <button
            onClick={handleCreateCampagne}
            disabled={creating}
            className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {creating ? 'Création...' : 'Lancer une nouvelle campagne'}
          </button>
        </div>
      </div>
    )
  }

  const stockSelected = selectedSecteur?.calendrier_stocks
  const calendriersSold = selectedSecteur?.total_calendriers_sold ?? 0
  const objectifCal = selectedSecteur?.objective_calendriers ?? 30

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Colonne principale */}
      <div className="flex-1 min-w-0">
        {/* Header: Progression de la Tournée */}
        <div className="bg-gradient-to-br from-white to-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 mb-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                {activeCampagne.name}
              </p>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">
                Progression de la Tournée
              </h1>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-2 text-center">
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Collecté
                </p>
                <p className="text-lg font-bold text-green-600">
                  {totalCollected.toFixed(0)}€
                </p>
              </div>
              <div className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-2 text-center">
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Calendriers
                </p>
                <p className="text-lg font-bold text-[var(--color-text)]">{totalCalendriers}</p>
              </div>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-primary)] to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progressionGlobale}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wide">
              Objectif collecte : <span className="text-[var(--color-text)]">{Number(activeCampagne.objective_amount).toFixed(0)}€</span>
            </span>
            <span className="font-bold text-[var(--color-primary)]">
              {progressionGlobale.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Barre de recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Chercher un secteur ou une rue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="flex gap-1 bg-white border border-[var(--color-border)] rounded-lg p-1">
            {(['toutes', 'todo', 'in_progress', 'done'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors uppercase ${
                  statusFilter === status
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {status === 'toutes' ? 'Toutes' : status === 'todo' ? 'Todo' : status === 'in_progress' ? 'En cours' : 'Terminé'}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/calendriers/secteurs/creer')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Secteur
          </button>
        </div>

        {/* Liste des secteurs */}
        {filteredSecteurs.length === 0 ? (
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
          <div className="space-y-3">
            {filteredSecteurs.map((secteur) => {
              const status = STATUS_CONFIG[secteur.status]
              const StatusIcon = status.icon
              const isSelected = selectedSecteurId === secteur.id
              const progression = secteur.progression_percent ?? 0

              return (
                <button
                  key={secteur.id}
                  onClick={() => setSelectedSecteurId(secteur.id)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all ${
                    isSelected
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icône statut */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        secteur.status === 'done'
                          ? 'bg-green-100'
                          : secteur.status === 'in_progress'
                          ? 'bg-amber-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      <StatusIcon className={`w-5 h-5 ${status.iconClass}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className={`font-semibold text-[var(--color-text)] ${secteur.status === 'todo' && progression === 0 ? 'text-red-500' : ''}`}>
                            {secteur.name}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {secteur.calendrier_secteur_equipiers?.length ?? 0}
                            </span>
                            <span className="flex items-center gap-1 text-green-600 font-semibold">
                              € {(secteur.total_collected ?? 0).toFixed(0)}€
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-[var(--color-text)]">
                            {progression.toFixed(0)}%
                          </span>
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                        </div>
                      </div>

                      {/* Barre de progression */}
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
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Panneau latéral (détail secteur) */}
      {selectedSecteur && (
        <aside className="lg:w-[360px] flex-shrink-0">
          <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm sticky top-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 border-b border-[var(--color-border)]">
              <div className="min-w-0">
                <h2 className="font-bold text-[var(--color-text)] truncate">{selectedSecteur.name}</h2>
                <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_CONFIG[selectedSecteur.status].class}`}>
                  {STATUS_CONFIG[selectedSecteur.status].label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/calendriers/secteurs/${selectedSecteur.id}/editer`)}
                  className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
                  title="Éditer"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedSecteurId(null)}
                  className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-[var(--color-border)]">
              <button
                onClick={() => setDetailTab('current')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                  detailTab === 'current'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'
                }`}
              >
                Campagne Actuelle
              </button>
              <button
                onClick={() => setDetailTab('history')}
                className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                  detailTab === 'history'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]'
                }`}
              >
                Historique
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {detailTab === 'current' ? (
                <>
                  {/* Rues du secteur */}
                  <div>
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3" />
                      Rues du secteur
                    </p>
                    {selectedSecteur.calendrier_secteur_rues && selectedSecteur.calendrier_secteur_rues.length > 0 ? (
                      <ul className="space-y-1 text-sm text-[var(--color-text)]">
                        {selectedSecteur.calendrier_secteur_rues.map((r) => (
                          <li key={r.id} className="flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                            <span>{r.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[var(--color-text-muted)] italic">Aucune rue définie</p>
                    )}
                  </div>

                  {/* Équipe sur zone */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Équipe sur zone
                      </p>
                      <button
                        onClick={() => navigate(`/calendriers/secteurs/${selectedSecteur.id}/editer`)}
                        className="text-[10px] font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] uppercase"
                      >
                        + Gérer
                      </button>
                    </div>
                    {selectedSecteur.calendrier_secteur_equipiers && selectedSecteur.calendrier_secteur_equipiers.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedSecteur.calendrier_secteur_equipiers.map((eq) => (
                          <div key={eq.id} className="flex items-center gap-2 p-2 bg-[var(--color-bg-secondary)] rounded-lg">
                            <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-xs font-bold">
                              {eq.amicalistes?.first_name?.[0]}{eq.amicalistes?.last_name?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[var(--color-text)] truncate">
                                {eq.amicalistes?.first_name} {eq.amicalistes?.last_name}
                              </p>
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                {eq.role === 'responsable' ? '★ Responsable' : 'Équipier'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-text-muted)] italic">Aucun équipier assigné.</p>
                    )}
                  </div>

                  {/* Stats collecté / calendriers */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">
                          €
                        </div>
                      </div>
                      <p className="text-xl font-bold text-green-700">
                        {(selectedSecteur.total_collected ?? 0).toFixed(0)}€
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide font-bold">
                        Collecté
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xl font-bold text-[var(--color-text)]">
                        {calendriersSold}
                        <span className="text-xs text-[var(--color-text-muted)] font-normal">
                          {' '}/ {stockSelected?.allocated_qty ?? objectifCal}
                        </span>
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide font-bold">
                        Calendriers
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate(`/calendriers/secteurs/${selectedSecteur.id}/vente`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-bold transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Saisir un don
                    </button>

                    {selectedSecteur.status === 'done' ? (
                      <button
                        onClick={() => updateStatus(selectedSecteur.id, 'in_progress')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-sm font-semibold transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Repasser en cours
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(selectedSecteur.id, 'done')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Marquer comme terminé
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/calendriers/secteurs/${selectedSecteur.id}`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-sm font-semibold transition-colors"
                    >
                      <FileArchive className="w-4 h-4" />
                      Voir le détail complet
                    </button>
                  </div>

                  {/* Ventes récentes */}
                  <div>
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                      Ventes récentes
                    </p>
                    {secteurVentes.slice(0, 5).length === 0 ? (
                      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 text-center">
                        <Package className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-semibold">
                          Aucune vente enregistrée
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-1.5">
                        {secteurVentes.slice(0, 5).map((v) => (
                          <li key={v.id} className="flex items-center justify-between p-2 bg-[var(--color-bg-secondary)] rounded-lg">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[var(--color-text)] truncate">
                                {v.donor_name || 'Don anonyme'}
                              </p>
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                {formatDateShort(v.sale_date)} · {v.quantity} calendrier{v.quantity > 1 ? 's' : ''}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-green-600 flex-shrink-0">
                              {Number(v.amount).toFixed(0)}€
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <FileArchive className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-semibold">
                    Historique à venir
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Les campagnes archivées apparaîtront ici
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
