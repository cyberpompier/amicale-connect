import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, Sparkles, Pencil, Check, X } from 'lucide-react'
import { useBoutiquePartenaireCatalogue } from '@/hooks/useBoutiquePartenaireCatalogue'
import { PageHeader } from '@/components/ui/PageHeader'

export function BoutiqueGestionCataloguePartenairePage() {
  const navigate = useNavigate()
  const { catalogue, loading, getActivation, activate, deactivate } = useBoutiquePartenaireCatalogue()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')

  const handleActivate = async (globalProduitId: string, customPrice?: number | null) => {
    setBusyId(globalProduitId)
    try {
      await activate(globalProduitId, customPrice)
    } finally {
      setBusyId(null)
      setEditingPriceId(null)
    }
  }

  const handleDeactivate = async (globalProduitId: string) => {
    setBusyId(globalProduitId)
    try {
      await deactivate(globalProduitId)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Catalogue partenaire"
        subtitle="Activez des produits Amicale Connect en dropshipping dans votre boutique"
        action={
          <button
            onClick={() => navigate('/boutique/gestion')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        }
      />

      {catalogue.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] font-medium">Aucun produit disponible dans le catalogue partagé pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {catalogue.map((produit) => {
            const activation = getActivation(produit.id)
            const isActive = activation?.is_active ?? false
            const displayPrice = activation?.custom_price ?? produit.base_price
            const isBusy = busyId === produit.id
            const isEditingPrice = editingPriceId === produit.id

            return (
              <div
                key={produit.id}
                className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm"
              >
                <div className="w-full h-40 bg-[var(--color-bg-secondary)] overflow-hidden relative">
                  {produit.image_url ? (
                    <img src={produit.image_url} alt={produit.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    <Sparkles className="w-3 h-3" />
                    Amicale Connect
                  </span>
                  {isActive && (
                    <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      Activé
                    </span>
                  )}
                </div>

                <div className="p-4">
                  {produit.category_name && (
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">{produit.category_name}</p>
                  )}
                  <p className="font-semibold text-[var(--color-text)] text-sm leading-tight mb-1">{produit.name}</p>
                  {produit.description && (
                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-2">{produit.description}</p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    {isEditingPrice ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          autoFocus
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          className="w-20 px-2 py-1 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                        />
                        <span className="text-sm">€</span>
                        <button
                          onClick={() => handleActivate(produit.id, parseFloat(priceInput) || produit.base_price)}
                          disabled={isBusy}
                          className="w-7 h-7 flex items-center justify-center bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingPriceId(null)}
                          className="w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[var(--color-primary)]">
                          {displayPrice.toFixed(2)} €
                        </span>
                        {isActive && (
                          <button
                            onClick={() => {
                              setEditingPriceId(produit.id)
                              setPriceInput(displayPrice.toFixed(2))
                            }}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                            title="Modifier le prix de vente"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[var(--color-text-muted)] mb-3">
                    Commission Amicale Connect : {produit.commission_percent.toFixed(0)}% · Vous gagnez {(displayPrice * (1 - produit.commission_percent / 100)).toFixed(2)} €
                  </p>

                  {isActive ? (
                    <button
                      onClick={() => handleDeactivate(produit.id)}
                      disabled={isBusy}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Désactiver
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivate(produit.id)}
                      disabled={isBusy}
                      className="w-full px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50"
                    >
                      Activer dans ma boutique
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
