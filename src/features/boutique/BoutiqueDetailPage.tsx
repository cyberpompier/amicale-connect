import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Package, Tag, Store, Check, AlertCircle, Plus, Minus } from 'lucide-react'
import { useBoutiqueProduits, type BoutiqueVariante } from '@/hooks/useBoutiqueProduits'
import { useBoutiqueCart } from '@/hooks/useBoutiqueCart'

const TYPE_LABELS: Record<string, string> = {
  size: 'Taille',
  color: 'Couleur',
  material: 'Matière',
  custom: 'Option',
}

const STOCK_LABELS = {
  in_stock: { label: 'En stock', class: 'text-green-700 bg-green-100' },
  out_of_stock: { label: 'Rupture de stock', class: 'text-red-700 bg-red-100' },
  coming_soon: { label: 'Bientôt disponible', class: 'text-blue-700 bg-blue-100' },
}

export function BoutiqueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { produits, loading } = useBoutiqueProduits()
  const { addToCart, itemCount } = useBoutiqueCart()

  const [selectedVariantes, setSelectedVariantes] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const [addedSuccess, setAddedSuccess] = useState(false)

  const produit = produits.find((p) => p.id === id)

  // Grouper les variantes par type
  const variantesByType = useMemo(() => {
    if (!produit?.boutique_produit_variantes) return {}
    return produit.boutique_produit_variantes.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = []
      acc[v.type].push(v)
      return acc
    }, {} as Record<string, BoutiqueVariante[]>)
  }, [produit])

  const varianteTypes = Object.keys(variantesByType)

  // Trouver la variante correspondant aux sélections
  const matchedVariante = useMemo(() => {
    if (!produit?.boutique_produit_variantes || varianteTypes.length === 0) return null
    if (Object.keys(selectedVariantes).length !== varianteTypes.length) return null

    // Si un seul type → chercher la valeur sélectionnée
    if (varianteTypes.length === 1) {
      const type = varianteTypes[0]
      return produit.boutique_produit_variantes.find(
        (v) => v.type === type && v.value === selectedVariantes[type]
      ) ?? null
    }
    return null
  }, [produit, selectedVariantes, varianteTypes])

  const finalPrice = useMemo(() => {
    if (!produit) return 0
    return produit.base_price + (matchedVariante?.price_modifier ?? 0)
  }, [produit, matchedVariante])

  const isAvailable = useMemo(() => {
    if (!produit) return false
    if (varianteTypes.length === 0) return produit.stock_status === 'in_stock'
    if (!matchedVariante) return false
    return matchedVariante.stock_qty > 0
  }, [produit, varianteTypes, matchedVariante])

  const handleAddToCart = async () => {
    if (!produit || !isAvailable) return
    const varianteId = matchedVariante?.id ?? null

    setAdding(true)
    try {
      await addToCart(produit.id, varianteId, quantity)
      setAddedSuccess(true)
      setTimeout(() => setAddedSuccess(false), 2500)
    } catch (err) {
      console.error(err)
    }
    setAdding(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!produit) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-muted)]">Article introuvable.</p>
        <button onClick={() => navigate('/boutique')} className="mt-4 text-sm text-[var(--color-primary)] hover:underline">
          Retour à la boutique
        </button>
      </div>
    )
  }

  const stock = STOCK_LABELS[produit.stock_status]

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => navigate('/boutique')}
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la boutique
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="bg-[var(--color-bg-secondary)] rounded-2xl overflow-hidden border border-[var(--color-border)] aspect-square flex items-center justify-center">
          {produit.image_url ? (
            <img src={produit.image_url} alt={produit.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-20 h-20 text-gray-300" />
          )}
        </div>

        {/* Détails */}
        <div className="space-y-5">
          {/* Catégorie + statut + badges */}
          <div className="flex flex-wrap items-center gap-2">
            {produit.boutique_categories && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-2 py-1 rounded-lg">
                <Tag className="w-3 h-3" />
                {produit.boutique_categories.name}
              </span>
            )}
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stock.class}`}>
              {stock.label}
            </span>
            {produit.badges.length > 0 && produit.badges.map((badge) => (
              <span
                key={badge}
                className={`text-xs font-bold px-2 py-1 rounded-lg ${
                  badge === 'exclusif'
                    ? 'bg-yellow-100 text-yellow-700'
                    : badge === 'promotion'
                      ? 'bg-orange-100 text-orange-700'
                      : badge === 'liquidation'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                }`}
              >
                {badge === 'exclusif' ? '✨ Exclusif' : badge === 'promotion' ? '🔥 Promo' : '❌ Liquidation'}
              </span>
            ))}
            {produit.discount_percent > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-green-100 text-green-700">
                -{produit.discount_percent.toFixed(0)}%
              </span>
            )}
            {!produit.boutique_vendors?.is_primary && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-lg">
                <Store className="w-3 h-3" />
                {produit.boutique_vendors?.name}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{produit.name}</h1>
            {produit.sku && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Réf: {produit.sku}</p>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            {produit.discount_percent > 0 ? (
              <>
                <p className="text-sm line-through text-[var(--color-text-muted)]">
                  {finalPrice.toFixed(2)} €
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {(finalPrice * (1 - produit.discount_percent / 100)).toFixed(2)} €
                </p>
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-green-100 text-green-700">
                  -{produit.discount_percent.toFixed(0)}%
                </span>
              </>
            ) : (
              <p className="text-2xl font-bold text-[var(--color-primary)]">
                {finalPrice.toFixed(2)} €
              </p>
            )}
            {matchedVariante && matchedVariante.price_modifier !== 0 && (
              <span className="text-sm text-[var(--color-text-muted)] font-normal">
                (base {produit.base_price.toFixed(2)} €
                {matchedVariante.price_modifier > 0 ? ' + ' : ' '}{matchedVariante.price_modifier.toFixed(2)} €)
              </span>
            )}
          </div>

          {produit.description && (
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{produit.description}</p>
          )}

          {/* Sélecteurs de variantes */}
          {varianteTypes.map((type) => (
            <div key={type}>
              <p className="text-sm font-semibold text-[var(--color-text)] mb-2">{TYPE_LABELS[type] || type}</p>
              <div className="flex flex-wrap gap-2">
                {variantesByType[type].map((v) => {
                  const isSelected = selectedVariantes[type] === v.value
                  const isOutOfStock = v.stock_qty === 0
                  return (
                    <button
                      key={v.id}
                      onClick={() => !isOutOfStock && setSelectedVariantes((prev) => ({ ...prev, [type]: v.value }))}
                      disabled={isOutOfStock}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                          : isOutOfStock
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                          : 'border-[var(--color-border)] hover:border-gray-300 text-[var(--color-text)]'
                      }`}
                    >
                      {v.value}
                      {v.price_modifier !== 0 && (
                        <span className="ml-1 text-xs">
                          ({v.price_modifier > 0 ? '+' : ''}{v.price_modifier.toFixed(2)} €)
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {matchedVariante && type === varianteTypes[0] && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Stock : {matchedVariante.stock_qty} unité(s)
                </p>
              )}
            </div>
          ))}

          {/* Quantité */}
          {isAvailable && (
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)] mb-2">Quantité</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-[var(--color-text)]">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Bouton ajouter au panier */}
          <div className="space-y-2 pt-2">
            {varianteTypes.length > 0 && Object.keys(selectedVariantes).length < varianteTypes.length && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Veuillez sélectionner toutes les options avant d'ajouter au panier.
              </p>
            )}
            <button
              onClick={handleAddToCart}
              disabled={adding || !isAvailable || (varianteTypes.length > 0 && Object.keys(selectedVariantes).length < varianteTypes.length)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                addedSuccess
                  ? 'bg-green-500 text-white'
                  : isAvailable
                  ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {addedSuccess ? (
                <><Check className="w-4 h-4" /> Ajouté au panier !</>
              ) : adding ? (
                'Ajout en cours...'
              ) : (
                <><ShoppingCart className="w-4 h-4" /> Ajouter au panier · {(finalPrice * quantity).toFixed(2)} €</>
              )}
            </button>

            {addedSuccess && (
              <button
                onClick={() => navigate('/boutique/panier')}
                className="w-full py-2.5 rounded-xl border border-[var(--color-primary)] text-[var(--color-primary)] font-semibold text-sm hover:bg-[var(--color-primary-light)] transition-colors"
              >
                Voir mon panier ({itemCount} article{itemCount > 1 ? 's' : ''})
              </button>
            )}
          </div>

          {/* Mode paiement */}
          <div className="bg-[var(--color-bg-secondary)] rounded-xl p-3 text-xs text-[var(--color-text-muted)]">
            {produit.payment_type === 'stripe' && '💳 Paiement en ligne par carte bancaire'}
            {produit.payment_type === 'manual' && '💵 Paiement à la livraison / remise en main propre'}
            {produit.payment_type === 'both' && '💳 Paiement en ligne ou à la livraison'}
          </div>
        </div>
      </div>
    </div>
  )
}
