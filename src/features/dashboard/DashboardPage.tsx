import { useTransactions } from '@/hooks/useTransactions'
import { useEvenements } from '@/hooks/useEvenements'
import { useCotisations } from '@/hooks/useCotisations'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { useSondages } from '@/hooks/useSondages'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { TrendingUp, TrendingDown, Calendar, MapPin, AlertCircle, Users, CheckCircle, ArrowRight, Radio } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function DashboardPage() {
  const { stats, loading: l1 } = useTransactions()
  const { getUpcoming, loading: l2 } = useEvenements()
  const { cotisations, loading: l3 } = useCotisations()
  const { amicalistes, loading: l4 } = useAmicalistes()
  const { sondages, loading: l5 } = useSondages()
  const navigate = useNavigate()

  const upcoming = getUpcoming().slice(0, 3)
  const activeSurveys = sondages.filter((s) => s.statut === 'actif').slice(0, 3)
  const overdue = cotisations.filter((c) => c.status === 'overdue')
  const paid = cotisations.filter((c) => c.status === 'paid')
  const pending = cotisations.filter((c) => c.status === 'pending')

  if (l1 || l2 || l3 || l4 || l5) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">Tableau de bord</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Vue d'ensemble de votre association</p>
      </div>

      {/* KPI Cards — 4 colonnes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Recettes</span>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{formatCurrency(stats.totalIncome)}</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Dépenses</span>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{formatCurrency(stats.totalExpense)}</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Solde net</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.balance >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}>
              {stats.balance >= 0
                ? <CheckCircle className="w-4 h-4 text-blue-600" />
                : <AlertCircle className="w-4 h-4 text-amber-600" />
              }
            </div>
          </div>
          <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            {formatCurrency(stats.balance)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">En retard</span>
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{overdue.length}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">cotisations</p>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Événements à venir */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Prochains événements</h2>
            </div>
            <button
              onClick={() => navigate('/evenements')}
              className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              Voir tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">Aucun événement prévu</p>
              <button
                onClick={() => navigate('/evenements/creer')}
                className="mt-3 text-xs text-[var(--color-primary)] hover:underline"
              >
                Créer un événement
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {upcoming.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => navigate(`/evenements/${evt.id}`)}
                  className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
                >
                  {/* Miniature image ou icône par défaut */}
                  {evt.image_url ? (
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden border border-[var(--color-border)]">
                      <img
                        src={evt.image_url}
                        alt={evt.titre}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-[var(--color-primary-light)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{evt.titre}</p>
                    <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
                      {formatDateShort(evt.date)}{evt.heure && ` · ${evt.heure}`}
                      {evt.lieu && <><MapPin className="w-3 h-3 inline" />{evt.lieu}</>}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aperçu membres */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Membres</h2>
            </div>
            <button
              onClick={() => navigate('/membres')}
              className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              Voir tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">Total amicalistes</span>
              <span className="text-sm font-bold text-[var(--color-text)]">{amicalistes.length}</span>
            </div>
            <div className="h-px bg-[var(--color-border)]" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">Cotisations à jour</span>
              <span className="text-sm font-bold text-green-600">{paid.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">En attente</span>
              <span className="text-sm font-bold text-amber-600">{pending.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">En retard</span>
              <span className="text-sm font-bold text-red-600">{overdue.length}</span>
            </div>

            {amicalistes.length > 0 && (
              <>
                <div className="h-px bg-[var(--color-border)]" />
                <div>
                  <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1.5">
                    <span>Taux de paiement</span>
                    <span>{cotisations.length > 0 ? Math.round((paid.length / cotisations.length) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${cotisations.length > 0 ? (paid.length / cotisations.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sondages en cours */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Sondages en cours</h2>
          </div>
          <button
            onClick={() => navigate('/sondages')}
            className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            Voir tout <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {activeSurveys.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Radio className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">Aucun sondage en cours</p>
            <button
              onClick={() => navigate('/sondages/creer')}
              className="mt-3 text-xs text-[var(--color-primary)] hover:underline"
            >
              Créer un sondage
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {activeSurveys.map((survey) => (
              <button
                key={survey.id}
                onClick={() => navigate('/sondages')}
                className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
              >
                {/* Miniature image ou icône par défaut */}
                {survey.image_url ? (
                  <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden border border-[var(--color-border)]">
                    <img
                      src={survey.image_url}
                      alt={survey.titre}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-[var(--color-primary-light)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Radio className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{survey.titre}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {survey.totalVotes} {survey.totalVotes === 1 ? 'vote' : 'votes'} · {survey.options.length} options
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
