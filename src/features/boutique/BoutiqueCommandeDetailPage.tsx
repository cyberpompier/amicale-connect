import { useParams, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { ArrowLeft, Clock, Package, Truck, CheckCircle2, XCircle, MapPin, Mail, Phone, ShoppingBag } from 'lucide-react'
import { useBoutiqueCommandes, type Commande } from '@/hooks/useBoutiqueCommandes'
import { formatDateShort } from '@/lib/utils'

const STATUS_CONFIG: Record<Commande['status'], { label: string; icon: React.ReactNode; class: string }> = {
  pending: { label: 'En attente', icon: <Clock className="w-5 h-5" />, class: 'bg-amber-100 text-amber-700' },
  processing: { label: 'En cours', icon: <Package className="w-5 h-5" />, class: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Expédié', icon: <Truck className="w-5 h-5" />, class: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livré', icon: <CheckCircle2 className="w-5 h-5" />, class: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé', icon: <XCircle className="w-5 h-5" />, class: 'bg-gray-100 text-gray-500' },
}

const PAYMENT_CONFIG: Record<Commande['payment_status'], { label: string; class: string }> = {
  pending: { label: 'En attente', class: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Payé', class: 'bg-green-50 text-green-700' },
  failed: { label: 'Échec', class: 'bg-red-50 text-red-700' },
}

export function BoutiqueCommandeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { allCommandes, commandes, loading } = useBoutiqueCommandes()

  // Chercher la commande dans les deux listes (user ou admin)
  const commande = useMemo(() => {
    return allCommandes.find((c) => c.id === id) || commandes.find((c) => c.id === id)
  }, [id, allCommandes, commandes])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!commande) {
    return (
      <div className="max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <p className="text-[var(--color-text-muted)]">Commande non trouvée</p>
        </div>
      </div>
    )
  }

  const status = STATUS_CONFIG[commande.status]
  const payment = PAYMENT_CONFIG[commande.payment_status]
  const items = commande.boutique_commande_items ?? []

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] font-semibold mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      {/* En-tête */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Commande #{commande.id.slice(0, 8).toUpperCase()}</h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{formatDateShort(commande.created_at)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm ${status.class}`}>
                {status.icon}
                {status.label}
              </span>
              <span className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-bold text-sm ${payment.class}`}>
                {payment.label}
              </span>
            </div>
          </div>
        </div>

        {/* Infos client */}
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Client</h2>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[var(--color-text)]">{commande.user_name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{commande.user_email}</p>
              </div>
            </div>
            {commande.user_phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                <p className="text-sm text-[var(--color-text)]">{commande.user_phone}</p>
              </div>
            )}
            {commande.shipping_address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[var(--color-text)]">{commande.shipping_address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Infos paiement */}
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Paiement</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">Méthode</span>
              <span className="text-sm font-semibold text-[var(--color-text)]">
                {commande.payment_method === 'stripe' ? '💳 Carte bancaire' : '💵 Paiement manuel'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">Montant</span>
              <span className="text-sm font-semibold text-[var(--color-text)]">{commande.total_amount.toFixed(2)} €</span>
            </div>
            {commande.tax_amount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-muted)]">Taxes</span>
                <span className="text-sm text-[var(--color-text)]">{commande.tax_amount.toFixed(2)} €</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {commande.notes && (
          <div className="px-6 py-4 border-t border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Notes</h2>
            <p className="text-sm text-[var(--color-text)]">{commande.notes}</p>
          </div>
        )}
      </div>

      {/* Articles */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text)] text-sm">Articles ({items.length})</h2>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">Aucun article</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {items.map((item) => (
              <div key={item.id} className="px-6 py-4 flex items-start gap-4">
                {/* Image produit */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-bg-secondary)] flex-shrink-0">
                  {item.boutique_produits?.image_url ? (
                    <img
                      src={item.boutique_produits.image_url}
                      alt={item.boutique_produits.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Infos produit */}
                <div className="flex-1">
                  <p className="font-semibold text-[var(--color-text)] text-sm">{item.boutique_produits?.name}</p>
                  {item.boutique_produit_variantes && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {item.boutique_produit_variantes.type}: {item.boutique_produit_variantes.value}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Prix unitaire</p>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{item.unit_price.toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">Quantité</p>
                      <p className="text-sm font-semibold text-[var(--color-text)]">× {item.quantity}</p>
                    </div>
                    <div className="ml-auto">
                      <p className="text-xs text-[var(--color-text-muted)]">Total</p>
                      <p className="text-sm font-bold text-[var(--color-primary)]">{item.total_price.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Résumé total */}
            <div className="px-6 py-4 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
              <div className="flex items-center justify-end">
                <div className="text-right">
                  <p className="text-lg font-bold text-[var(--color-text)]">
                    Total: <span className="text-[var(--color-primary)]">{commande.total_amount.toFixed(2)} €</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
