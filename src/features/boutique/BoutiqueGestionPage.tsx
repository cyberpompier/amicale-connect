import { useNavigate } from 'react-router-dom'
import { Package, ShoppingCart, TrendingUp, Plus, ChevronRight } from 'lucide-react'
import { useBoutiqueProduits } from '@/hooks/useBoutiqueProduits'
import { useBoutiqueCommandes, type Commande } from '@/hooks/useBoutiqueCommandes'
import { formatDateShort } from '@/lib/utils'

const STATUS_CONFIG: Record<Commande['status'], { label: string; class: string }> = {
  pending: { label: 'En attente', class: 'bg-amber-100 text-amber-700' },
  processing: { label: 'En cours', class: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Expédié', class: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livré', class: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé', class: 'bg-gray-100 text-gray-500' },
}

export function BoutiqueGestionPage() {
  const navigate = useNavigate()
  const { produits, loading: pLoading } = useBoutiqueProduits()
  const { allCommandes, loading: cLoading, updateStatus, markAsPaid } = useBoutiqueCommandes()

  const recentCommandes = allCommandes.slice(0, 10)
  const pendingCount = allCommandes.filter((c) => c.status === 'pending').length
  const revenue = allCommandes
    .filter((c) => c.payment_status === 'completed')
    .reduce((sum, c) => sum + c.total_amount, 0)

  const STATUS_NEXT: Record<string, Commande['status'][]> = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  }

  if (pLoading || cLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Gestion boutique</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Administration des articles et commandes</p>
        </div>
        <button
          onClick={() => navigate('/boutique/gestion/produits/creer')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvel article
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Articles</span>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{produits.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">En attente</span>
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">commandes</p>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Revenus</span>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-700">{revenue.toFixed(2)} €</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">paiements complétés</p>
        </div>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate('/boutique/gestion/produits')}
          className="flex items-center justify-between px-5 py-4 bg-white border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)]/30 hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-[var(--color-primary)]" />
            <div>
              <p className="font-semibold text-[var(--color-text)] text-sm">Gérer les articles</p>
              <p className="text-xs text-[var(--color-text-muted)]">{produits.length} article(s)</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <button
          onClick={() => navigate('/boutique/gestion/commandes')}
          className="flex items-center justify-between px-5 py-4 bg-white border border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)]/30 hover:shadow-sm transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-[var(--color-primary)]" />
            <div>
              <p className="font-semibold text-[var(--color-text)] text-sm">Toutes les commandes</p>
              <p className="text-xs text-[var(--color-text-muted)]">{allCommandes.length} commande(s)</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Commandes récentes */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text)] text-sm">Commandes récentes</h2>
        </div>
        {recentCommandes.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">Aucune commande</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {recentCommandes.map((commande) => {
              const status = STATUS_CONFIG[commande.status]
              const nextStatuses = STATUS_NEXT[commande.status]
              return (
                <div key={commande.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">#{commande.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${status.class}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-text)] mt-0.5 truncate">{commande.user_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {formatDateShort(commande.created_at)} · {commande.total_amount.toFixed(2)} €
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <button
                      onClick={() => navigate(`/boutique/commandes/${commande.id}`)}
                      className="px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors"
                    >
                      Détails
                    </button>
                    {commande.payment_status === 'pending' && commande.payment_method === 'manual' && (
                      <button
                        onClick={() => markAsPaid(commande.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        ✓ Marquer payé
                      </button>
                    )}
                    {nextStatuses.map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(commande.id, s)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${STATUS_CONFIG[s].class} hover:opacity-80`}
                      >
                        → {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
