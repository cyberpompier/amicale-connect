import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Banknote, ShoppingBag, CheckCircle2 } from 'lucide-react'
import { useBoutiqueCart } from '@/hooks/useBoutiqueCart'
import { useBoutiqueCommandes } from '@/hooks/useBoutiqueCommandes'
import { useAuthContext } from '@/features/auth/AuthContext'

export function BoutiqueCheckoutPage() {
  const navigate = useNavigate()
  const { cartItems, getTotal, clearCart } = useBoutiqueCart()
  const { createCommande } = useBoutiqueCommandes()
  const { user } = useAuthContext()
  const total = getTotal()

  const [form, setForm] = useState({
    user_name: '',
    user_email: user?.email ?? '',
    user_phone: '',
    shipping_address: '',
    payment_method: 'manual' as 'stripe' | 'manual',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (cartItems.length === 0) return
    setError('')
    setLoading(true)
    try {
      const commande = await createCommande(cartItems, form)
      await clearCart()
      setSuccess(commande.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la commande')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Commande confirmée !</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Votre commande a été enregistrée. Vous recevrez une confirmation dès qu'elle sera traitée.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/boutique/commandes')}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Voir mes commandes
          </button>
          <button
            onClick={() => navigate('/boutique')}
            className="w-full py-2.5 border border-[var(--color-border)] text-[var(--color-text)] rounded-xl font-medium hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            Continuer mes achats
          </button>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)]">Votre panier est vide.</p>
        <button onClick={() => navigate('/boutique')} className="mt-4 text-sm text-[var(--color-primary)] hover:underline">
          Retour à la boutique
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/boutique/panier')}
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour au panier
      </button>

      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Finaliser la commande</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulaire - 3 col */}
        <div className="lg:col-span-3 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>
          )}

          {/* Coordonnées */}
          <section className="bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">Vos coordonnées</h2>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Nom complet <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={form.user_name}
                onChange={(e) => setForm((p) => ({ ...p, user_name: e.target.value }))}
                placeholder="Jean Dupont"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Email <span className="text-red-500">*</span></label>
              <input
                required
                type="email"
                value={form.user_email}
                onChange={(e) => setForm((p) => ({ ...p, user_email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Téléphone</label>
              <input
                type="tel"
                value={form.user_phone}
                onChange={(e) => setForm((p) => ({ ...p, user_phone: e.target.value }))}
                placeholder="06 12 34 56 78"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Adresse de livraison</label>
              <textarea
                rows={2}
                value={form.shipping_address}
                onChange={(e) => setForm((p) => ({ ...p, shipping_address: e.target.value }))}
                placeholder="12 rue des Pompiers, 75001 Paris"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Notes</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Instructions spéciales, heure de disponibilité..."
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] resize-none"
              />
            </div>
          </section>

          {/* Mode paiement */}
          <section className="bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">Mode de paiement</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, payment_method: 'manual' }))}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  form.payment_method === 'manual'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] hover:border-gray-300'
                }`}
              >
                <Banknote className={`w-5 h-5 flex-shrink-0 ${form.payment_method === 'manual' ? 'text-[var(--color-primary)]' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-sm font-semibold ${form.payment_method === 'manual' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                    À la livraison
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">Espèces / chèque</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, payment_method: 'stripe' }))}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  form.payment_method === 'stripe'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] hover:border-gray-300'
                }`}
              >
                <CreditCard className={`w-5 h-5 flex-shrink-0 ${form.payment_method === 'stripe' ? 'text-[var(--color-primary)]' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-sm font-semibold ${form.payment_method === 'stripe' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                    Carte bancaire
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">Paiement sécurisé</p>
                </div>
              </button>
            </div>
            {form.payment_method === 'stripe' && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                ⚠️ Le paiement en ligne sera disponible prochainement.
              </p>
            )}
          </section>
        </div>

        {/* Récap commande - 2 col */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-4 sticky top-4">
            <h2 className="font-bold text-[var(--color-text)]">Votre commande</h2>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {cartItems.map((item) => {
                const produit = item.boutique_produits
                const variante = item.boutique_produit_variantes
                const price = (produit?.base_price ?? 0) + (variante?.price_modifier ?? 0)
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--color-bg-secondary)] flex-shrink-0">
                      {produit?.image_url ? (
                        <img src={produit.image_url} alt={produit.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--color-text)] truncate">{produit?.name}</p>
                      {variante && <p className="text-xs text-[var(--color-text-muted)]">{variante.value}</p>}
                      <p className="text-xs text-[var(--color-text-muted)]">× {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-[var(--color-text)] flex-shrink-0">{(price * item.quantity).toFixed(2)} €</p>
                  </div>
                )
              })}
            </div>
            <div className="h-px bg-[var(--color-border)]" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-[var(--color-primary)] text-lg">{total.total.toFixed(2)} €</span>
            </div>
            <button
              type="submit"
              disabled={loading || form.payment_method === 'stripe'}
              className="w-full py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Traitement...' : `Confirmer · ${total.total.toFixed(2)} €`}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
