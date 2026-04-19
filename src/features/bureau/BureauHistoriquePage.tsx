import { useBureauPositions } from '@/hooks/useBureauPositions'
import { formatDateShort } from '@/lib/utils'
import { Archive } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

export function BureauHistoriquePage() {
  const { history, loading } = useBureauPositions()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Historique du bureau"
        subtitle={`${history.length} mandat${history.length !== 1 ? 's' : ''} terminé${history.length !== 1 ? 's' : ''}`}
      />

      {history.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun mandat terminé</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            L'historique apparaîtra ici lorsque des mandats seront terminés.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Poste</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Titulaire</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden md:table-cell">Du</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden md:table-cell">Au</th>
                  <th className="text-center px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {history.map((pos) => {
                  const startDate = new Date(pos.start_date)
                  const endDate = pos.end_date ? new Date(pos.end_date) : new Date()
                  const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                  const years = Math.floor(diffDays / 365)
                  const months = Math.floor((diffDays % 365) / 30)
                  const durationText = years > 0 ? `${years}a ${months}m` : `${months}m`

                  return (
                    <tr key={pos.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-[var(--color-text)]">{pos.position_name}</td>
                      <td className="px-4 py-3.5 text-[var(--color-text)]">{pos.person_name}</td>
                      <td className="px-4 py-3.5 text-[var(--color-text-muted)] hidden md:table-cell">{formatDateShort(pos.start_date)}</td>
                      <td className="px-4 py-3.5 text-[var(--color-text-muted)] hidden md:table-cell">
                        {pos.end_date ? formatDateShort(pos.end_date) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          {durationText}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
