import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Search, ShoppingCart, Plus, Tag } from 'lucide-react'
import { useBoutiqueProduits } from '@/hooks/useBoutiqueProduits'
import { useBoutiqueCart } from '@/hooks/useBoutiqueCart'
import { PageHeader } from '@/components/ui/PageHeader'

const STOCK_LABELS = {
  in_stock: { label: 'En stock', class: 'bg-green-100 text-green-700' },
  out_of_stock: { label: 'Rupture', class: 'bg-red-100 text-red-700' },
  coming_soon: { label: 'Bientôt', class: 'bg-blue-100 text-blue-700' },
}

export function BoutiquePage() {
  const navigate = useNavigate()
  const { produits, categories, loading } = useBoutiqueProduits()
  const { itemCount } = useBoutiqueCart()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [stockFilter, setStockFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return produits.filter((p) => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      const matchCat = !selectedCategory || p.category_id === selectedCategory
      const matchStock = !stockFilter || p.stock_status === stockFilter
      return matchSearch && matchCat && matchStock
    })
  }, [produits, search, selectedCategory, stockFilter])

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
        title="Boutique"
        subtitle="Articles de l'amicale et produits partenaires"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/boutique/panier')}
              className="relative flex items-center gap-2 px-4 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm font-medium hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Panier
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--color-primary)] text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/boutique/gestion/produits/creer')}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter un article
            </button>
          </div>
        }
      />


      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher un article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
          />
        </div>

        {categories.length > 0 && (
          <select
            value={selectedCategory ?? ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
          >
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        <select
          value={stockFilter ?? ''}
          onChange={(e) => setStockFilter(e.target.value || null)}
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
        >
          <option value="">Tous les stocks</option>
          <option value="in_stock">En stock</option>
          <option value="out_of_stock">Rupture</option>
          <option value="coming_soon">Bientôt disponible</option>
        </select>
      </div>

      {/* Grille produits */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] font-medium">
            {produits.length === 0 ? 'Aucun article dans la boutique' : 'Aucun article trouvé'}
          </p>
          {produits.length === 0 && (
            <button
              onClick={() => navigate('/boutique/gestion/produits/creer')}
              className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Ajouter le premier article
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((produit) => {
            const stock = STOCK_LABELS[produit.stock_status]
            const hasVariantes = (produit.boutique_produit_variantes?.length ?? 0) > 0
            return (
              <button
                key={produit.id}
                onClick={() => navigate(`/boutique/${produit.id}`)}
                className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--color-primary)]/30 transition-all text-left group"
              >
                {/* Image */}
                <div className="w-full h-44 bg-[var(--color-bg-secondary)] overflow-hidden relative">
                  {produit.image_url ? (
                    <img
                      src={produit.image_url}
                      alt={produit.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${stock.class}`}>
                    {stock.label}
                  </span>
                  {produit.boutique_vendors?.is_primary === false && (
                    <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      {produit.boutique_vendors.name}
                    </span>
                  )}
                </div>

                {/* Infos */}
                <div className="p-4">
                  {produit.boutique_categories && (
                    <div className="flex items-center gap-1 mb-1">
                      <Tag className="w-3 h-3 text-[var(--color-text-muted)]" />
                      <span className="text-xs text-[var(--color-text-muted)]">{produit.boutique_categories.name}</span>
                    </div>
                  )}
                  <p className="font-semibold text-[var(--color-text)] text-sm leading-tight mb-1">{produit.name}</p>
                  {produit.description && (
                    <p className="text-xs text-[var(--color-text-muted)] line-clamp-2 mb-2">{produit.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-base font-bold text-[var(--color-primary)]">
                      {produit.base_price.toFixed(2)} €
                    </span>
                    {hasVariantes && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {produit.boutique_produit_variantes!.length} variantes
                      </span>
                    )}
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
