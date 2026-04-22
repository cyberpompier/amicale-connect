import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Upload, X } from 'lucide-react'
import { useBoutiqueProduits } from '@/hooks/useBoutiqueProduits'

type VarianteForm = {
  type: 'size' | 'color' | 'material' | 'custom'
  value: string
  stock_qty: number
  sku_variant: string
  price_modifier: number
}

const TYPE_LABELS = { size: 'Taille', color: 'Couleur', material: 'Matière', custom: 'Personnalisé' }

export function BoutiqueGestionProduitForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { produits, vendors, categories, addProduit, updateProduit, ensurePrimaryVendor, addCategory } = useBoutiqueProduits()
  const isEdit = !!id
  const existing = produits.find((p) => p.id === id)

  const [form, setForm] = useState({
    vendor_id: '',
    category_id: '',
    name: '',
    description: '',
    base_price: '',
    sku: '',
    stock_status: 'in_stock' as 'in_stock' | 'out_of_stock' | 'coming_soon',
    payment_type: 'both' as 'stripe' | 'manual' | 'both',
    badges: [] as string[],
    discount_percent: '',
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [variantes, setVariantes] = useState<VarianteForm[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Pré-remplir si édition
  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        vendor_id: existing.vendor_id,
        category_id: existing.category_id ?? '',
        name: existing.name,
        description: existing.description ?? '',
        base_price: existing.base_price.toString(),
        sku: existing.sku ?? '',
        stock_status: existing.stock_status,
        payment_type: existing.payment_type,
        badges: existing.badges ?? [],
        discount_percent: existing.discount_percent?.toString() ?? '',
      })
      setImagePreview(existing.image_url ?? null)
      setVariantes(
        (existing.boutique_produit_variantes ?? []).map((v) => ({
          type: v.type,
          value: v.value,
          stock_qty: v.stock_qty,
          sku_variant: v.sku_variant ?? '',
          price_modifier: v.price_modifier,
        }))
      )
    }
  }, [isEdit, existing])

  // Auto-sélectionner le vendor primaire
  useEffect(() => {
    if (!form.vendor_id && vendors.length > 0) {
      const primary = vendors.find((v) => v.is_primary)
      if (primary) setForm((p) => ({ ...p, vendor_id: primary.id }))
    }
  }, [vendors, form.vendor_id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (evt) => setImagePreview(evt.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    try {
      await addCategory(newCategory.trim())
      setNewCategory('')
    } catch (err) {
      console.error(err)
    }
  }

  const addVariante = () => setVariantes((prev) => [...prev, { type: 'size', value: '', stock_qty: 0, sku_variant: '', price_modifier: 0 }])
  const removeVariante = (i: number) => setVariantes((prev) => prev.filter((_, idx) => idx !== i))
  const updateVariante = (i: number, field: keyof VarianteForm, value: string | number) =>
    setVariantes((prev) => prev.map((v, idx) => idx === i ? { ...v, [field]: value } : v))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.vendor_id) {
      // Créer le vendor primaire si absent
      try {
        const vendor = await ensurePrimaryVendor()
        if (vendor) setForm((p) => ({ ...p, vendor_id: vendor.id }))
      } catch {}
    }

    const price = parseFloat(form.base_price)
    if (isNaN(price) || price <= 0) { setError('Prix invalide.'); return }

    const validVariantes = variantes.filter((v) => v.value.trim())
    const discount = form.discount_percent ? parseFloat(form.discount_percent) : 0

    setSaving(true)
    try {
      const input = {
        vendor_id: form.vendor_id,
        category_id: form.category_id || null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        base_price: price,
        sku: form.sku.trim() || null,
        stock_status: form.stock_status,
        payment_type: form.payment_type,
        image_url: imagePreview,
        badges: form.badges,
        discount_percent: discount,
        variantes: validVariantes.map((v) => ({
          type: v.type,
          value: v.value.trim(),
          stock_qty: Number(v.stock_qty),
          sku_variant: v.sku_variant.trim() || null,
          price_modifier: Number(v.price_modifier),
        })),
      }

      if (isEdit && id) {
        await updateProduit(id, input)
      } else {
        await addProduit(input)
      }
      navigate('/boutique/gestion/produits')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  return (
    <div>
      <button
        onClick={() => navigate('/boutique/gestion/produits')}
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux articles
      </button>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">
        {isEdit ? 'Modifier l\'article' : 'Nouvel article'}
      </h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>}

        {/* Informations générales */}
        <section className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">Informations</h2>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Image <span className="text-[var(--color-text-muted)] font-normal">(optionnel)</span>
            </label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-[var(--color-border)]" />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="block w-full px-4 py-5 border-2 border-dashed border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors">
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Upload className="w-5 h-5 text-[var(--color-text-muted)]" />
                  <span className="text-sm font-medium text-[var(--color-text)]">Ajouter une image</span>
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Nom <span className="text-red-500">*</span></label>
            <input required type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: T-shirt Amicale" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description de l'article..."
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Prix (€) <span className="text-red-500">*</span></label>
              <input required type="number" step="0.01" min="0.01" value={form.base_price} onChange={(e) => setForm((p) => ({ ...p, base_price: e.target.value }))}
                placeholder="12.50" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Remise (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={form.discount_percent} onChange={(e) => setForm((p) => ({ ...p, discount_percent: e.target.value }))}
                placeholder="0" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">SKU</label>
              <input type="text" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                placeholder="REF-001" className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]" />
            </div>
          </div>

          {/* Badges */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Badges d'article</label>
            <div className="space-y-2">
              {['exclusif', 'promotion', 'liquidation'].map((badge) => (
                <label key={badge} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={form.badges.includes(badge)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm((p) => ({ ...p, badges: [...p.badges, badge] }))
                      } else {
                        setForm((p) => ({ ...p, badges: p.badges.filter((b) => b !== badge) }))
                      }
                    }}
                    className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer accent-[var(--color-primary)]"
                  />
                  <span className="text-sm text-[var(--color-text)] capitalize">{badge}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Catégorie</label>
            <div className="flex gap-2">
              <select value={form.category_id} onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                className="flex-1 px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
                <option value="">Sans catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-1">
                <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nouvelle..."
                  className="w-28 px-2 py-2 border border-[var(--color-border)] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25" />
                <button type="button" onClick={handleAddCategory}
                  className="px-3 py-2 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-lg text-xs font-semibold hover:bg-[var(--color-primary)]/15 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Vendeur */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Vendeur</label>
            <select value={form.vendor_id} onChange={(e) => setForm((p) => ({ ...p, vendor_id: e.target.value }))}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}{v.is_primary ? ' (Amicale)' : ''}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Stock status */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Disponibilité</label>
              <select value={form.stock_status} onChange={(e) => setForm((p) => ({ ...p, stock_status: e.target.value as typeof form.stock_status }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
                <option value="in_stock">En stock</option>
                <option value="out_of_stock">Rupture de stock</option>
                <option value="coming_soon">Bientôt disponible</option>
              </select>
            </div>

            {/* Paiement */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Mode paiement</label>
              <select value={form.payment_type} onChange={(e) => setForm((p) => ({ ...p, payment_type: e.target.value as typeof form.payment_type }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
                <option value="both">Les deux</option>
                <option value="stripe">Carte uniquement</option>
                <option value="manual">Manuel uniquement</option>
              </select>
            </div>
          </div>
        </section>

        {/* Variantes */}
        <section className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">
              Variantes <span className="text-[var(--color-text-muted)] font-normal normal-case">({variantes.length})</span>
            </h2>
            <button type="button" onClick={addVariante}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary-light)] hover:bg-[var(--color-primary)]/15 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Ajouter une variante
            </button>
          </div>

          {variantes.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-2">Aucune variante — article vendu sans option de taille/couleur.</p>
          )}

          <div className="space-y-3">
            {variantes.map((v, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-[var(--color-bg-secondary)] rounded-xl">
                <select value={v.type} onChange={(e) => updateVariante(i, 'type', e.target.value)}
                  className="px-2 py-2 border border-[var(--color-border)] rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input type="text" placeholder="Valeur (ex: M, Bleu)" value={v.value} onChange={(e) => updateVariante(i, 'value', e.target.value)}
                  className="px-2 py-2 border border-[var(--color-border)] rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25" />
                <input type="number" placeholder="Stock" min="0" value={v.stock_qty} onChange={(e) => updateVariante(i, 'stock_qty', parseInt(e.target.value) || 0)}
                  className="px-2 py-2 border border-[var(--color-border)] rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25" />
                <input type="number" step="0.01" placeholder="Surcoût (€)" value={v.price_modifier} onChange={(e) => updateVariante(i, 'price_modifier', parseFloat(e.target.value) || 0)}
                  className="px-2 py-2 border border-[var(--color-border)] rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25" />
                <button type="button" onClick={() => removeVariante(i)}
                  className="flex items-center justify-center p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-6">
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50">
            {saving ? 'Sauvegarde...' : isEdit ? 'Enregistrer les modifications' : 'Créer l\'article'}
          </button>
          <button type="button" onClick={() => navigate('/boutique/gestion/produits')}
            className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] font-medium rounded-lg text-sm hover:bg-[var(--color-bg-secondary)] transition-colors">
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
