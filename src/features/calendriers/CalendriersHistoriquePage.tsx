import { useMemo, useState } from 'react'
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
} from 'lucide-react'
import {
  useCalendrierCampagnes,
  type CalendrierCampagne,
} from '@/hooks/useCalendrierCampagnes'
import { formatCurrency, formatDateShort } from '@/lib/utils'

const STATUS_CONFIG: Record<
  CalendrierCampagne['status'],
  { label: string; class: string; icon: any }
> = {
  active: { label: 'Active', class: 'bg-green-100 text-green-700', icon: PlayCircle },
  closed: { label: 'Clôturée', class: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  archived: { label: 'Archivée', class: 'bg-gray-100 text-gray-700', icon: Archive },
}

export function CalendriersHistoriquePage() {
  const {
    campagnes,
    loading,
    closeCampagne,
    archiveCampagne,
    reactivateCampagne,
    deleteCampagne,
  } = useCalendrierCampagnes()

  const [filter, setFilter] = useState<'all' | 'active' | 'closed' | 'archived'>('all')

  const filtered = useMemo(
    () => (filter === 'all' ? campagnes : campagnes.filter((c) => c.status === filter)),
    [campagnes, filter]
  )

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
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Historique des tournées</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Campagnes actives, clôturées et archivées
        </p>
      </div>

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

                {/* Stats rapide */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Euro className="w-3 h-3 text-green-600" />
                      <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                        Objectif
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--color-text)]">
                      {formatCurrency(Number(c.objective_amount))}
                    </p>
                  </div>
                  <div className="bg-[var(--color-bg-secondary)] rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Package className="w-3 h-3 text-blue-600" />
                      <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                        Calendriers
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--color-text)]">
                      {c.objective_calendriers}
                    </p>
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
