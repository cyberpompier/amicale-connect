import { useTransactions } from '@/hooks/useTransactions'
import { useEvenements } from '@/hooks/useEvenements'
import { useCotisations } from '@/hooks/useCotisations'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { useSondages } from '@/hooks/useSondages'
import { useComptes } from '@/hooks/useComptes'
import { useRevenusKPI } from '@/hooks/useRevenusKPI'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { TrendingUp, TrendingDown, Calendar, MapPin, AlertCircle, Users, CheckCircle, ArrowRight, AlertTriangle, Wallet, Radio, ShoppingBag, BookOpen, Store, PartyPopper, DollarSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)] animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-20 bg-gray-200 rounded" />
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-7 w-28 bg-gray-200 rounded" />
    </div>
  )
}

function SkeletonSection({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse divide-y divide-[var(--color-border)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-3.5 flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 bg-gray-200 rounded" />
            <div className="h-2.5 w-24 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardBureau() {
  const { stats, loading: l1 } = useTransactions()
  const { getUpcoming, loading: l2 } = useEvenements()
  const { cotisations, loading: l3 } = useCotisations()
  const { amicalistes, loading: l4 } = useAmicalistes()
  const { sondages, loading: l5 } = useSondages()
  const { comptes, loading: l6 } = useComptes()
  const revenusKPI = useRevenusKPI()
  const navigate = useNavigate()

  const upcoming = getUpcoming().slice(0, 3)
  const activeSurveys = sondages.filter((s) => s.statut === 'actif').slice(0, 3)
  const overdue = cotisations.filter((c) => c.status === 'overdue')
  const paid = cotisations.filter((c) => c.status === 'paid')
  const pending = cotisations.filter((c) => c.status === 'pending')

  // Alertes
  const alerts = []
  if (overdue.length > 0) {
    alerts.push({
      id: 'overdue',
      icon: AlertTriangle,
      message: `${overdue.length} cotisation${overdue.length > 1 ? 's' : ''} en retard depuis >30j`,
      severity: 'critical'
    })
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">Tableau de bord - Gestion</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Vue d'ensemble administrative et financière</p>
      </div>

      {/* Alertes critiques */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards — 4 colonnes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {l1 ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
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
                    : <AlertCircle className="w-4 h-4 text-amber-600" />}
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
          </>
        )}
      </div>

      {/* Revenus générés */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Revenus générés {revenusKPI.annee}</h2>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Dépenses selon catégories comptables</p>
        </div>

        {revenusKPI.loading ? (
          <div className="px-5 py-4 space-y-3 animate-pulse">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                  <div className="h-3 w-28 bg-gray-200 rounded" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3 w-18 bg-gray-200 rounded" />
                  <div className="h-3 w-18 bg-gray-200 rounded" />
                  <div className="h-3 w-18 bg-gray-200 rounded" />
                  <div className="h-3 w-12 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-5 py-2 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide w-48">Source</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Recettes</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Dépenses</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Bénéfice</th>
                  <th className="px-5 py-2 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide w-16">Marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {/* Calendriers */}
                <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">Calendriers</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{revenusKPI.calendriers.campagneName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-[var(--color-text)]">{formatCurrency(revenusKPI.calendriers.recettes)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{revenusKPI.calendriers.depenses > 0 ? `−${formatCurrency(revenusKPI.calendriers.depenses)}` : '—'}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${revenusKPI.calendriers.benefice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(revenusKPI.calendriers.benefice)}</td>
                  <td className="px-5 py-3 text-right">
                    {revenusKPI.calendriers.margePercent !== null
                      ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${revenusKPI.calendriers.margePercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{revenusKPI.calendriers.margePercent.toFixed(0)}%</span>
                      : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                  </td>
                </tr>

                {/* Brocantes */}
                <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">Brocantes</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {revenusKPI.brocantes.evenementsCount > 0 ? `${revenusKPI.brocantes.evenementsCount} événement${revenusKPI.brocantes.evenementsCount > 1 ? 's' : ''}` : 'Aucun événement'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-[var(--color-text)]">{formatCurrency(revenusKPI.brocantes.recettes)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{revenusKPI.brocantes.depenses > 0 ? `−${formatCurrency(revenusKPI.brocantes.depenses)}` : '—'}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${revenusKPI.brocantes.benefice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(revenusKPI.brocantes.benefice)}</td>
                  <td className="px-5 py-3 text-right">
                    {revenusKPI.brocantes.margePercent !== null
                      ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${revenusKPI.brocantes.margePercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{revenusKPI.brocantes.margePercent.toFixed(0)}%</span>
                      : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                  </td>
                </tr>

                {/* Boutique */}
                <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Store className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">Boutique</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {revenusKPI.boutique.commandesCount > 0 ? `${revenusKPI.boutique.commandesCount} commande${revenusKPI.boutique.commandesCount > 1 ? 's' : ''}` : 'Aucune commande'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-[var(--color-text)]">{formatCurrency(revenusKPI.boutique.recettes)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{revenusKPI.boutique.depenses > 0 ? `−${formatCurrency(revenusKPI.boutique.depenses)}` : '—'}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${revenusKPI.boutique.benefice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(revenusKPI.boutique.benefice)}</td>
                  <td className="px-5 py-3 text-right">
                    {revenusKPI.boutique.margePercent !== null
                      ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${revenusKPI.boutique.margePercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{revenusKPI.boutique.margePercent.toFixed(0)}%</span>
                      : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                  </td>
                </tr>

                {/* Événements */}
                <tr className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <PartyPopper className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">Événements</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {revenusKPI.evenements.evenementsCount > 0 ? `${revenusKPI.evenements.evenementsCount} événement${revenusKPI.evenements.evenementsCount > 1 ? 's' : ''}` : 'Aucun événement'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-[var(--color-text)]">{formatCurrency(revenusKPI.evenements.recettes)}</td>
                  <td className="px-3 py-3 text-right text-red-600">{revenusKPI.evenements.depenses > 0 ? `−${formatCurrency(revenusKPI.evenements.depenses)}` : '—'}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${revenusKPI.evenements.benefice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(revenusKPI.evenements.benefice)}</td>
                  <td className="px-5 py-3 text-right">
                    {revenusKPI.evenements.margePercent !== null
                      ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${revenusKPI.evenements.margePercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{revenusKPI.evenements.margePercent.toFixed(0)}%</span>
                      : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                  </td>
                </tr>

                {/* Total */}
                <tr className="bg-[var(--color-bg-secondary)]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="font-bold text-[var(--color-text)]">Total {revenusKPI.annee}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[var(--color-text)]">{formatCurrency(revenusKPI.total.recettes)}</td>
                  <td className="px-3 py-3 text-right font-bold text-red-600">{revenusKPI.total.depenses > 0 ? `−${formatCurrency(revenusKPI.total.depenses)}` : '—'}</td>
                  <td className={`px-3 py-3 text-right font-bold ${revenusKPI.total.benefice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(revenusKPI.total.benefice)}</td>
                  <td className="px-5 py-3 text-right">
                    {revenusKPI.total.margePercent !== null
                      ? <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${revenusKPI.total.margePercent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{revenusKPI.total.margePercent.toFixed(0)}%</span>
                      : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gestion Cotisations */}
        <div className="order-1 lg:col-span-2 bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Cotisations</h2>
            </div>
            <button
              onClick={() => navigate('/membres/cotisations')}
              className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              Gérer <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {l3 || l4 ? (
            <div className="px-5 py-4 space-y-3 animate-pulse">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-8 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
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
          )}
        </div>

        {/* Comptes Bancaires */}
        <div className="order-3 lg:order-2 bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Comptes</h2>
            </div>
            <button
              onClick={() => navigate('/comptabilite/comptes')}
              className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              Voir tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {l6 ? (
            <div className="px-5 py-4 space-y-3 animate-pulse">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-12 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              {comptes && comptes.slice(0, 3).map((compte) => (
                <div key={compte.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[var(--color-text-muted)]">{compte.nom}</span>
                    <span className="text-sm font-bold text-[var(--color-text)]">{formatCurrency(compte.solde || 0)}</span>
                  </div>
                </div>
              ))}
              {(!comptes || comptes.length === 0) && (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-4">Aucun compte</p>
              )}
            </div>
          )}
        </div>

        {/* Prochains événements et Sondages */}
        <div className="order-2 lg:order-3 lg:col-span-2 bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
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

          {l2 ? <SkeletonSection rows={3} /> : upcoming.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">Aucun événement prévu</p>
              <button onClick={() => navigate('/evenements/creer')} className="mt-3 text-xs text-[var(--color-primary)] hover:underline">
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
                  {evt.image_url ? (
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden border border-[var(--color-border)]">
                      <img src={evt.image_url} alt={evt.titre} className="w-full h-full object-cover" />
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

        {/* Sondages en cours */}
        <div className="order-4 lg:order-4 bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Sondages</h2>
            </div>
            <button
              onClick={() => navigate('/sondages')}
              className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              Voir tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {l5 ? <SkeletonSection rows={2} /> : activeSurveys.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Radio className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">Aucun sondage en cours</p>
              <button onClick={() => navigate('/sondages/creer')} className="mt-3 text-xs text-[var(--color-primary)] hover:underline">
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
                  {survey.image_url ? (
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden border border-[var(--color-border)]">
                      <img src={survey.image_url} alt={survey.titre} className="w-full h-full object-cover" />
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
                    {survey.totalVotes > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-primary)] rounded-full"
                            style={{ width: `${(survey.options[0]?.votes / survey.totalVotes) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap">
                          {Math.round((survey.options[0]?.votes / survey.totalVotes) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
