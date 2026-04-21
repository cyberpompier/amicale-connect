import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Package, ArrowLeft } from 'lucide-react'
import { useBoutiqueProduits } from '@/hooks/useBoutiqueProduits'

const STOCK_LABELS = {
  in_stock: { label: 'En stock', class: 'bg-green-100 text-green-700' },
  out_of_stock: { label: 'Rupture', class: 'bg-red-100 text-red-700' },
  coming_soon: { label: 'Bientôt', class: 'bg-blue-100 text-blue-700' },
}

export function BoutiqueGestionProduitsList() {
  const navigate = useNavigate()
  const { produits, loading, deleteProduit } = useBoutiqueProduits()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await deleteProduit(id)
      setConfirmDelete(null)
    } catch (err) {
      console.error(err)
    }
    setDeleting(false)
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
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/boutique/gestion')}
          className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--color-text)] flex-1">Articles</h1>
        <button
          onClick={() => navigate('/boutique/gestion/produits/creer')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {produits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-[var(--color-text-muted)]">Aucun article</p>
          <button
            onClick={() => navigate('/boutique/gestion/produits/creer')}
            className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Créer le premier article
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="divide-y divide-[var(--color-border)]">
            {produits.map((produit) => {
              const stock = STOCK_LABELS[produit.stock_status]
              const variantesCount = produit.boutique_produit_variantes?.length ?? 0
              return (
                <div key={produit.id} className="flex items-center gap-4 px-5 py-3.5">
                  {/* Image */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--color-bg-secondary)] flex-shrink-0 border border-[var(--color-border)]">
                    {produit.image_url ? (
                      <img src={produit.image_url} alt={produit.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--color-text)] truncate">{produit.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${stock.class}`}>{stock.label}</span>
                      {produit.boutique_categories && (
                        <span className="text-xs text-[var(--color-text-muted)]">{produit.boutique_categories.name}</span>
                      )}
                      {variantesCount > 0 && (
                        <span className="text-xs text-[var(--color-text-muted)]">{variantesCount} variante(s)</span>
                      )}
                    </div>
                  </div>

                  {/* Prix */}
                  <p className="font-bold text-[var(--color-primary)] text-sm flex-shrink-0">{produit.base_price.toFixed(2)} €</p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/boutique/gestion/produits/${produit.id}`)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {confirmDelete === produit.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(produit.id)}
                          disabled={deleting}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(produit.id)}
                        className="p-2 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
