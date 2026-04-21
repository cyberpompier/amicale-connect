import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ShoppingBag, ArrowRight } from 'lucide-react'
import { useBoutiqueCart } from '@/hooks/useBoutiqueCart'

export function BoutiqueCartPage() {
  const navigate = useNavigate()
  const { cartItems, loading, updateQuantity, removeFromCart, getTotal } = useBoutiqueCart()
  const total = getTotal()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/boutique')}
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Continuer mes achats
      </button>

      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="w-6 h-6 text-[var(--color-primary)]" />
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Mon panier</h1>
        {total.itemCount > 0 && (
          <span className="px-2 py-0.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-full text-sm font-bold">
            {total.itemCount} article{total.itemCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-[var(--color-text-muted)]">Votre panier est vide</p>
          <button
            onClick={() => navigate('/boutique')}
            className="mt-4 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Parcourir la boutique
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Liste articles */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm divide-y divide-[var(--color-border)]">
            {cartItems.map((item) => {
              const produit = item.boutique_produits
              const variante = item.boutique_produit_variantes
              const price = (produit?.base_price ?? 0) + (variante?.price_modifier ?? 0)
              return (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[var(--color-bg-secondary)] flex-shrink-0 border border-[var(--color-border)]">
                    {produit?.image_url ? (
                      <img src={produit.image_url} alt={produit.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--color-text)] truncate">{produit?.name}</p>
                    {variante && (
                      <p className="text-xs text-[var(--color-text-muted)] capitalize">{variante.type} : {variante.value}</p>
                    )}
                    <p className="text-sm font-bold text-[var(--color-primary)] mt-0.5">{price.toFixed(2)} €</p>
                  </div>

                  {/* Quantité */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Sous-total */}
                  <div className="text-right w-20 flex-shrink-0">
                    <p className="text-sm font-bold text-[var(--color-text)]">{(price * item.quantity).toFixed(2)} €</p>
                  </div>

                  {/* Supprimer */}
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Récapitulatif */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-[var(--color-text)]">Récapitulatif</h2>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Sous-total ({total.itemCount} articles)</span>
              <span className="font-semibold">{total.subtotal.toFixed(2)} €</span>
            </div>
            {total.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">TVA</span>
                <span className="font-semibold">{total.tax.toFixed(2)} €</span>
              </div>
            )}
            <div className="h-px bg-[var(--color-border)]" />
            <div className="flex justify-between">
              <span className="font-bold text-[var(--color-text)]">Total</span>
              <span className="text-xl font-bold text-[var(--color-primary)]">{total.total.toFixed(2)} €</span>
            </div>

            <button
              onClick={() => navigate('/boutique/checkout')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl font-semibold transition-colors mt-2"
            >
              Passer commande
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
