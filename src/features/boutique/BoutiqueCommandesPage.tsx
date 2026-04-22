import { useNavigate } from 'react-router-dom'
import { Package, ChevronRight, Clock, CheckCircle2, Truck, XCircle, ShoppingBag } from 'lucide-react'
import { useBoutiqueCommandes, type Commande } from '@/hooks/useBoutiqueCommandes'
import { formatDateShort } from '@/lib/utils'

const STATUS_CONFIG: Record<Commande['status'], { label: string; icon: React.ReactNode; class: string }> = {
  pending: { label: 'En attente', icon: <Clock className="w-3.5 h-3.5" />, class: 'bg-amber-100 text-amber-700' },
  processing: { label: 'En cours', icon: <Package className="w-3.5 h-3.5" />, class: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Expédié', icon: <Truck className="w-3.5 h-3.5" />, class: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livré', icon: <CheckCircle2 className="w-3.5 h-3.5" />, class: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé', icon: <XCircle className="w-3.5 h-3.5" />, class: 'bg-gray-100 text-gray-500' },
}

const PAYMENT_CONFIG: Record<Commande['payment_status'], { label: string; class: string }> = {
  pending: { label: 'En attente', class: 'text-amber-600' },
  completed: { label: 'Payé', class: 'text-green-600' },
  failed: { label: 'Échec', class: 'text-red-600' },
}

export function BoutiqueCommandesPage() {
  const navigate = useNavigate()
  const { commandes, loading } = useBoutiqueCommandes()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Mes commandes</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Historique et suivi de vos achats</p>
        </div>
        <button
          onClick={() => navigate('/boutique')}
          className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Boutique
        </button>
      </div>

      {commandes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-[var(--color-text-muted)]">Aucune commande pour le moment</p>
          <button
            onClick={() => navigate('/boutique')}
            className="mt-4 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Découvrir la boutique
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {commandes.map((commande) => {
            const status = STATUS_CONFIG[commande.status]
            const payment = PAYMENT_CONFIG[commande.payment_status]
            const items = commande.boutique_commande_items ?? []
            return (
              <button
                key={commande.id}
                onClick={() => navigate(`/boutique/commandes/${commande.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all"
              >
                {/* Header commande */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">
                      #{commande.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {formatDateShort(commande.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${status.class}`}>
                      {status.icon}{status.label}
                    </span>
                    <span className={`text-xs font-semibold ${payment.class}`}>
                      {payment.label}
                    </span>
                  </div>
                </div>

                {/* Articles */}
                <div className="px-5 py-3 space-y-2">
                  {items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-[var(--color-bg-secondary)] flex-shrink-0">
                        {item.boutique_produits?.image_url ? (
                          <img src={item.boutique_produits.image_url} alt={item.boutique_produits.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text)] flex-1 truncate">
                        {item.boutique_produits?.name}
                        {item.boutique_produit_variantes && (
                          <span className="text-[var(--color-text-muted)] ml-1">· {item.boutique_produit_variantes.value}</span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] flex-shrink-0">× {item.quantity}</p>
                    </div>
                  ))}
                  {items.length > 2 && (
                    <p className="text-xs text-[var(--color-text-muted)]">+ {items.length - 2} autre(s) article(s)</p>
                  )}
                </div>

                {/* Footer total */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
                  <div className="text-sm">
                    <span className="text-[var(--color-text-muted)]">Mode : </span>
                    <span className="font-semibold text-[var(--color-text)]">
                      {commande.payment_method === 'stripe' ? '💳 Carte' : '💵 Manuel'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[var(--color-primary)]">{commande.total_amount.toFixed(2)} €</span>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
