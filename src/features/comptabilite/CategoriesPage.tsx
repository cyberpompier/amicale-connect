import { useState, type FormEvent } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { Trash2, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

export function CategoriesPage() {
  const { categories, loading, addCategory, deleteCategory } = useCategories()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      await addCategory(formData)
      setFormData({ name: '', type: 'expense' })
      setShowForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const incomeCategories = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Catégories"
        subtitle={`${categories.length} catégorie${categories.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        }
      />

      {showForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Nouvelle catégorie</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nom de la catégorie"
                className="flex-1 px-3.5 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as 'income' | 'expense' }))}
                className="px-3.5 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              >
                <option value="expense">Dépense</option>
                <option value="income">Recette</option>
              </select>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recettes */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Recettes</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{incomeCategories.length} catégorie{incomeCategories.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="p-3">
            {incomeCategories.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] px-2 py-4 text-center">Aucune catégorie de recette.</p>
            ) : (
              <div className="space-y-1">
                {incomeCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-3.5 py-2.5 hover:bg-green-50 rounded-lg group transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-[var(--color-text)]">{c.name}</span>
                    </div>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dépenses */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--color-border)]">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Dépenses</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{expenseCategories.length} catégorie{expenseCategories.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="p-3">
            {expenseCategories.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] px-2 py-4 text-center">Aucune catégorie de dépense.</p>
            ) : (
              <div className="space-y-1">
                {expenseCategories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-3.5 py-2.5 hover:bg-red-50 rounded-lg group transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-[var(--color-text)]">{c.name}</span>
                    </div>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
