import { useEvenements } from '@/hooks/useEvenements'
import { useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Clock, Trash2, Archive } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

export function EvenementsArchivesPage() {
  const { loading, deleteEvenement, getPast } = useEvenements()
  const navigate = useNavigate()

  const pastEvents = getPast()

  const handleDelete = async (id: string) => {
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
    <div>
      <PageHeader
        title="Archives"
        subtitle={`${pastEvents.length} événement${pastEvents.length !== 1 ? 's' : ''} passé${pastEvents.length !== 1 ? 's' : ''}`}
      />

      {pastEvents.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun événement archivé</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Les événements passés apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pastEvents.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] opacity-70 hover:opacity-100 hover:shadow-[var(--shadow)] transition-all cursor-pointer group"
              onClick={() => navigate(`/evenements/${evt.id}`)}
            >
              <div className="p-5 flex items-start gap-4">
                {/* Date badge */}
                <div className="flex-shrink-0 w-14 h-14 bg-gray-100 rounded-xl flex flex-col items-center justify-center border border-gray-200 group-hover:bg-[var(--color-primary-light)] group-hover:border-red-100 transition-colors">
                  <span className="text-xs font-bold text-gray-400 uppercase leading-none group-hover:text-[var(--color-primary)] transition-colors">
                    {new Date(evt.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short' })}
                  </span>
                  <span className="text-2xl font-bold text-gray-400 leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                    {new Date(evt.date + 'T00:00:00').getDate()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">{evt.titre}</h3>
                    <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                      Passé
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDateShort(evt.date)}
                    </span>
                    {evt.heure && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <Clock className="w-3.5 h-3.5" />
                        {evt.heure}
                      </span>
                    )}
                    {evt.lieu && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                        <MapPin className="w-3.5 h-3.5" />
                        {evt.lieu}
                      </span>
                    )}
                  </div>
                  {evt.description && (
                    <p className="text-sm text-[var(--color-text-muted)] mt-2 line-clamp-2">{evt.description}</p>
                  )}
                </div>

                {/* Actions */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(evt.id) }}
                  className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
