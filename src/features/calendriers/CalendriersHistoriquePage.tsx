import { useEffect, useMemo, useState } from 'react'
import {
  FileArchive,
  CheckCircle2,
  RotateCcw,
  Archive,
  Trash2,
  Calendar,
  Package,
  Euro,
  PlayCircle,
  BarChart3,
  TrendingUp,
  Download,
  Users,
} from 'lucide-react'
import {
  useCalendrierCampagnes,
  type CalendrierCampagne,
} from '@/hooks/useCalendrierCampagnes'
import { useCalendrierVentes } from '@/hooks/useCalendrierVentes'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAssociation } from '@/features/association/AssociationContext'

const STATUS_CONFIG: Record<
  CalendrierCampagne['status'],
  { label: string; class: string; icon: any }
> = {
  active: { label: 'Active', class: 'bg-green-100 text-green-700', icon: PlayCircle },
  closed: { label: 'Clôturée', class: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  archived: { label: 'Archivée', class: 'bg-gray-100 text-gray-700', icon: Archive },
}

export function CalendriersHistoriquePage() {
  const { currentAssociation } = useAssociation()
  const {
    campagnes,
    loading,
    closeCampagne,
    archiveCampagne,
    reactivateCampagne,
    deleteCampagne,
  } = useCalendrierCampagnes()

  const { exportContactsCSV } = useCalendrierVentes()
  const [filter, setFilter] = useState<'all' | 'active' | 'closed' | 'archived'>('all')
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { collected: number; calendriers: number }>>({})

  // Charger les résultats (ventes) pour chaque campagne
  useEffect(() => {
    const fetchResults = async () => {
      if (!currentAssociation || campagnes.length === 0) return

      const { data: ventes } = await supabase
        .from('calendrier_ventes')
        .select('campagne_id, amount, quantity')
        .eq('association_id', currentAssociation.id)

      if (ventes) {
        const resultsMap: Record<string, { collected: number; calendriers: number }> = {}
        ventes.forEach((v) => {
          if (!resultsMap[v.campagne_id]) {
            resultsMap[v.campagne_id] = { collected: 0, calendriers: 0 }
          }
          resultsMap[v.campagne_id].collected += Number(v.amount)
          resultsMap[v.campagne_id].calendriers += v.quantity
        })
        setResults(resultsMap)
      }
    }
    fetchResults()
  }, [currentAssociation, campagnes.length])

  const filtered = useMemo(
    () => (filter === 'all' ? campagnes : campagnes.filter((c) => c.status === filter)),
    [campagnes, filter]
  )

  // Statistiques
  const stats = useMemo(() => {
    const total = campagnes.length
    const active = campagnes.filter((c) => c.status === 'active').length
    const closed = campagnes.filter((c) => c.status === 'closed').length
    const archived = campagnes.filter((c) => c.status === 'archived').length
    const totalObjectiveAmount = campagnes.reduce((sum, c) => sum + Number(c.objective_amount), 0)
    const totalObjectiveCalendriers = campagnes.reduce((sum, c) => sum + c.objective_calendriers, 0)

    return {
      total,
      active,
      closed,
      archived,
      totalObjectiveAmount,
      totalObjectiveCalendriers,
    }
  }, [campagnes])

  const handleClose = async (c: CalendrierCampagne) => {
    if (!confirm(`Clôturer la campagne "${c.name}" ? Elle pourra être réactivée.`)) return
    try {
      await closeCampagne(c.id)
    } catch (err: any) {
      alert(err?.message ?? 'Erreur')
    }
  }

  const handleArchive = async (c: CalendrierCampagne) => {
    if (!confirm(`Archiver définitivement "${c.name}" ?`)) return
    try {
      await archiveCampagne(c.id)
    } catch (err: any) {
      alert(err?.message ?? 'Erreur')
    }
  }

  const handleReactivate = async (c: CalendrierCampagne) => {
    if (!confirm(`Réactiver "${c.name}" ?`)) return
    try {
      await reactivateCampagne(c.id)
    } catch (err: any) {
      alert(err?.message ?? 'Erreur')
    }
  }

  const handleDelete = async (c: CalendrierCampagne) => {
    if (
      !confirm(
        `Supprimer définitivement "${c.name}" ? Toutes les ventes, secteurs et adresses associés seront supprimés.`
      )
    )
      return
    try {
      await deleteCampagne(c.id)
    } catch (err: any) {
      alert(err?.message ?? 'Erreur')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Historique des tournées</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Campagnes actives, clôturées et archivées
          </p>
        </div>
        <button
          onClick={async () => {
            setExportingId('all')
            await exportContactsCSV()
            setExportingId(null)
          }}
          disabled={exportingId === 'all' || campagnes.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
          title="Exporter tous les contacts donateurs (CSV)"
        >
          <Users className="w-4 h-4 text-[var(--color-primary)]" />
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Contacts</span>
        </button>
      </div>

      {/* Statistiques */}
      {campagnes.length > 0 && (
        <div className="bg-gradient-to-br from-white to-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold text-[var(--color-text)]">Vue d'ensemble</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total campagnes */}
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Total campagnes
              </p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.total}</p>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-green-600 font-semibold">{stats.active} actives</span>
                <span className="text-blue-600 font-semibold">{stats.closed} clôturées</span>
                <span className="text-gray-600 font-semibold">{stats.archived} archivées</span>
              </div>
            </div>

            {/* Campagnes actives */}
            <div className="bg-white rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1">
                Campagnes actives
              </p>
              <p className="text-2xl font-bold text-green-700">{stats.active}</p>
            </div>

            {/* Objectif total collecte */}
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
              <div className="flex items-center gap-2 mb-1">
                <Euro className="w-4 h-4 text-green-600" />
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Objectif collecte
                </p>
              </div>
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {(stats.totalObjectiveAmount / 1000).toFixed(0)}k€
              </p>
            </div>

            {/* Objectif calendriers */}
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-blue-600" />
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Objectif calendriers
                </p>
              </div>
              <p className="text-2xl font-bold text-[var(--color-text)]">
                {(stats.totalObjectiveCalendriers / 1000).toFixed(1)}k
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-1 bg-white border border-[var(--color-border)] rounded-lg p-1 w-fit">
        {(['all', 'active', 'closed', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors uppercase ${
              filter === f
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {f === 'all'
              ? 'Toutes'
              : f === 'active'
              ? 'Actives'
              : f === 'closed'
              ? 'Clôturées'
              : 'Archivées'}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <FileArchive className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] font-medium">
            {campagnes.length === 0
              ? 'Aucune campagne enregistrée.'
              : 'Aucune campagne ne correspond au filtre.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const status = STATUS_CONFIG[c.status]
            const StatusIcon = status.icon
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-text)] truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">Année {c.year}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${status.class}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>

                {/* Stats rapide - Objectifs et Résultats */}
                <div className="space-y-3 mb-3">
                  {/* Collecte */}
                  <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Euro className="w-3 h-3 text-green-600" />
                      <p className="text-[10px] font-bold text-green-700 uppercase">Collecte</p>
                    </div>
                    <p className="text-sm font-bold text-[var(--color-text)]">
                      {formatCurrency(results[c.id]?.collected ?? 0)}
                      <span className="text-[11px] text-[var(--color-text-muted)] font-normal"> / {formatCurrency(Number(c.objective_amount))}</span>
                    </p>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, ((results[c.id]?.collected ?? 0) / Number(c.objective_amount)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Calendriers */}
                  <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Package className="w-3 h-3 text-blue-600" />
                      <p className="text-[10px] font-bold text-blue-700 uppercase">Calendriers</p>
                    </div>
                    <p className="text-sm font-bold text-[var(--color-text)]">
                      {results[c.id]?.calendriers ?? 0}
                      <span className="text-[11px] text-[var(--color-text-muted)] font-normal"> / {c.objective_calendriers}</span>
                    </p>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, ((results[c.id]?.calendriers ?? 0) / c.objective_calendriers) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)] mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Créée le {formatDateShort(c.created_at)}
                  </span>
                </div>

                {/* Actions selon statut */}
                <div className="flex flex-wrap items-center gap-1 pt-3 border-t border-[var(--color-border)]">
                  {c.status === 'active' && (
                    <button
                      onClick={() => handleClose(c)}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Clôturer
                    </button>
                  )}
                  {c.status === 'closed' && (
                    <>
                      <button
                        onClick={() => handleReactivate(c)}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Réactiver
                      </button>
                      <button
                        onClick={() => handleArchive(c)}
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] hover:bg-gray-200 rounded-md transition-colors"
                      >
                        <Archive className="w-3 h-3" /> Archiver
                      </button>
                    </>
                  )}
                  {c.status === 'archived' && (
                    <button
                      onClick={() => handleReactivate(c)}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Réactiver
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={async () => {
                      setExportingId(c.id)
                      await exportContactsCSV(c.id)
                      setExportingId(null)
                    }}
                    disabled={exportingId === c.id}
                    className="flex items-center gap-1 p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
                    title="Exporter les contacts de cette campagne"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
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
