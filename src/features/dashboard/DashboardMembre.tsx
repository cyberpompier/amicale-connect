import { useEvenements } from '@/hooks/useEvenements'
import { useCotisations } from '@/hooks/useCotisations'
import { useSondages } from '@/hooks/useSondages'
import { useBoutiqueCart } from '@/hooks/useBoutiqueCart'
import { useBoutiqueProduits } from '@/hooks/useBoutiqueProduits'
import { formatDateShort, formatCurrency } from '@/lib/utils'
import { Calendar, MapPin, ArrowRight, Radio, ShoppingBag, Tag, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/features/auth/AuthContext'

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

export function DashboardMembre() {
  const { getUpcoming, loading: l2 } = useEvenements()
  const { cotisations, loading: l3 } = useCotisations()
  const { sondages, loading: l5 } = useSondages()
  const { cartItems, loading: l6 } = useBoutiqueCart()
  const { produits, loading: l7 } = useBoutiqueProduits()
  const { user } = useAuthContext()
  const navigate = useNavigate()

  const upcoming = getUpcoming().slice(0, 5)
  const activeSurveys = sondages.filter((s) => s.statut === 'actif').slice(0, 3)

  // Calcul total panier
  const cartTotal = cartItems.reduce((sum, item) => {
    const price = item.boutique_produits?.base_price || 0
    return sum + (price * item.quantity)
  }, 0)

  // Produits tendance (plus récents et en stock)
  const trendingProducts = produits
    .filter((p) => p.stock_status === 'in_stock')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  // Trouver ma cotisation (prendre la première, généralement il n'y en a qu'une par personne)
  const myCotisations = cotisations.slice(0, 1)
  const myCotisationStatus = myCotisations.length > 0
    ? myCotisations[0].status
    : 'unknown'

  const statusLabel: Record<string, string> = {
    paid: 'À jour ✓',
    pending: 'En attente',
    overdue: 'En retard',
    unknown: 'Non défini'
  }

  const statusColor: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    overdue: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">Tableau de bord</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Bienvenue {user?.email?.split('@')[0]}</p>
      </div>

      {/* Mon statut cotisation */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">📋 Mon Statut</h2>
        </div>
        {l3 ? (
          <div className="px-5 py-4 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-200 rounded" />
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text)]">Cotisation {myCotisations.length > 0 ? myCotisations[0].year : 'N/A'}</span>
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${statusColor[myCotisationStatus]}`}>
                {statusLabel[myCotisationStatus]}
              </span>
            </div>
            {myCotisations.length > 0 && (
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                Montant: {myCotisations[0].amount} €
              </p>
            )}
          </div>
        )}
      </div>

      {/* Mes événements à venir */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Mes événements</h2>
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

        {l5 ? <SkeletonSection rows={2} /> : activeSurveys.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Radio className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">Aucun sondage en cours</p>
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

      {/* Boutique Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mon Panier */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Mon Panier</h2>
            </div>
            <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-2 py-1 rounded-full">
              {cartItems.length}
            </span>
          </div>

          {l6 ? (
            <div className="px-5 py-4 animate-pulse space-y-3">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded" />
            </div>
          ) : cartItems.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <ShoppingBag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">Votre panier est vide</p>
            </div>
          ) : (
            <div className="px-5 py-4">
              <div className="space-y-3">
                {cartItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">
                        {item.boutique_produits?.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        x{item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[var(--color-text)] whitespace-nowrap ml-2">
                      {formatCurrency((item.boutique_produits?.base_price || 0) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[var(--color-text)]">Total</span>
                  <span className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(cartTotal)}</span>
                </div>
                <button
                  onClick={() => navigate('/boutique/panier')}
                  className="w-full bg-[var(--color-primary)] text-white py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Continuer →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Produits Tendance */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Tendance</h2>
            </div>
            <button
              onClick={() => navigate('/boutique')}
              className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            >
              Voir tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {l7 ? (
            <div className="px-5 py-4 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-gray-200 rounded mb-1" />
                    <div className="h-2 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : trendingProducts.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Tag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">Aucun produit disponible</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {trendingProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => navigate(`/boutique/${product.id}`)}
                  className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
                >
                  {product.image_url ? (
                    <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden border border-[var(--color-border)]">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-[var(--color-primary-light)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Tag className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{product.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {product.stock_quantity} en stock
                      </p>
                      <p className="text-sm font-bold text-[var(--color-primary)]">
                        {formatCurrency(product.base_price)}
                      </p>
                    </div>
                    {product.discount_percent > 0 && (
                      <div className="mt-1 inline-block bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded">
                        -{product.discount_percent}%
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
