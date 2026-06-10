import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, ShoppingBag, ShieldAlert, Building2, TrendingUp, Percent } from 'lucide-react'
import { useBoutiqueGlobalCatalogue } from '@/hooks/useBoutiqueGlobalCatalogue'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import { usePlatformDropshippingStats } from '@/hooks/usePlatformDropshippingStats'
import { PageHeader } from '@/components/ui/PageHeader'

export function AdminCataloguePartagePage() {
  const navigate = useNavigate()
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin()
  const { produits, loading, deleteProduit, updateProduit } = useBoutiqueGlobalCatalogue()
  const { stats, loading: statsLoading } = usePlatformDropshippingStats()

  const statsByProduct = useMemo(() => {
    const map = new Map<string, typeof stats[number]>()
    for (const s of stats) map.set(s.global_produit_id, s)
    return map
  }, [stats])

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => ({
        nbAssociations: acc.nbAssociations + s.nb_associations_actives,
        revenue: acc.revenue + Number(s.total_revenue),
        commission: acc.commission + Number(s.total_commission),
      }),
      { nbAssociations: 0, revenue: 0, commission: 0 }
    )
  }, [stats])

  if (adminLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isPlatformAdmin) {
    return (
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center shadow-sm">
        <ShieldAlert className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)] font-medium">Accès réservé aux administrateurs de la plateforme</p>
      </div>
    )
  }

  const toggleStatus = async (id: string, status: 'active' | 'inactive') => {
    await updateProduit(id, { status: status === 'active' ? 'inactive' : 'active' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit du catalogue partagé ?')) return
    await deleteProduit(id)
  }

  return (
    <div>
      <PageHeader
        title="Catalogue partagé (dropshipping)"
        subtitle="Produits Amicale Connect proposés en dropshipping aux amicales"
        action={
          <button
            onClick={() => navigate('/admin/catalogue-partage/creer')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau produit
          </button>
        }
      />

      {/* KPIs plateforme */}
      {!statsLoading && stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Activations</span>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--color-text)]">{totals.nbAssociations}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">activation(s) actives par les amicales</p>
          </div>
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Revenus générés</span>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--color-text)]">{totals.revenue.toFixed(2)} €</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">ventes du catalogue partagé</p>
          </div>
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Commission Amicale Connect</span>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Percent className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-700">{totals.commission.toFixed(2)} €</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">part plateforme sur les ventes</p>
          </div>
        </div>
      )}

      {produits.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] font-medium">Aucun produit dans le catalogue partagé</p>
          <button
            onClick={() => navigate('/admin/catalogue-partage/creer')}
            className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Ajouter le premier produit
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden divide-y divide-[var(--color-border)]">
          {produits.map((produit) => (
            <div key={produit.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-secondary)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                {produit.image_url ? (
                  <img src={produit.image_url} alt={produit.name} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--color-text)] text-sm truncate">{produit.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {produit.base_price.toFixed(2)} € · Commission {produit.commission_percent.toFixed(0)}%
                  {produit.category_name ? ` · ${produit.category_name}` : ''}
                </p>
                {(() => {
                  const s = statsByProduct.get(produit.id)
                  if (!s) return null
                  return (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {s.nb_associations_actives} amicale(s) actives · {Number(s.total_revenue).toFixed(2)} € de ventes · {Number(s.total_commission).toFixed(2)} € de commission
                    </p>
                  )
                })()}
              </div>
              <button
                onClick={() => toggleStatus(produit.id, produit.status)}
                className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                  produit.status === 'active'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {produit.status === 'active' ? 'Actif' : 'Inactif'}
              </button>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => navigate(`/admin/catalogue-partage/${produit.id}`)}
                  className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(produit.id)}
                  className="p-2 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
