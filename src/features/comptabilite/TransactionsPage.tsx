import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

export function TransactionsPage() {
  const { transactions, loading, stats, addTransaction } = useTransactions()
  const { categories } = useCategories()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const categoryOptions = categories.filter((c) => c.type === formData.type)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.amount || !formData.description) return

    setSaving(true)
    try {
      await addTransaction({
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        category_id: formData.category_id || null,
        notes: formData.notes || null,
      })
      setFormData({
        type: 'expense',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category_id: '',
        notes: '',
      })
      setShowForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

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
        title="Transactions"
        subtitle={`${transactions.length} écriture${transactions.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvelle écriture</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Recettes</span>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-green-700">{formatCurrency(stats.totalIncome)}</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Dépenses</span>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-700">{formatCurrency(stats.totalExpense)}</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Solde net</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.balance >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}>
              <Wallet className={`w-4 h-4 ${stats.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
            </div>
          </div>
          <p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            {formatCurrency(stats.balance)}
          </p>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Nouvelle écriture</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <select
                value={formData.type}
                onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as 'income' | 'expense', category_id: '' }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              >
                <option value="expense">Dépense</option>
                <option value="income">Recette</option>
              </select>

              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                placeholder="Montant (€)"
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />

              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />

              <select
                value={formData.category_id}
                onChange={(e) => setFormData((p) => ({ ...p, category_id: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              >
                <option value="">— Catégorie —</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="sm:col-span-2 px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />

              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes (optionnel)"
                rows={2}
                className="sm:col-span-2 px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tableau */}
      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucune transaction</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Commencez à enregistrer les recettes et dépenses de votre amicale.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Ajouter la première écriture
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-sm)]">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)] border-b-2 border-[var(--color-border)]">
                <th className="text-left px-8 py-5 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-widest">Date</th>
                <th className="text-left px-8 py-5 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-widest">Description</th>
                <th className="text-left px-8 py-5 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-widest hidden md:table-cell">Catégorie</th>
                <th className="text-right px-8 py-5 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-widest">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer">
                  <td className="px-8 py-5">
                    <Link to={`/comptabilite/${t.id}`} className="text-sm text-[var(--color-text-muted)] font-semibold hover:text-[var(--color-primary)]">
                      {formatDateShort(t.date)}
                    </Link>
                  </td>
                  <td className="px-8 py-5">
                    <Link to={`/comptabilite/${t.id}`} className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
                      {t.description}
                    </Link>
                  </td>
                  <td className="px-8 py-5 hidden md:table-cell">
                    <Link to={`/comptabilite/${t.id}`}>
                      {t.categories?.name ? (
                        <span className="inline-flex px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                          {t.categories.name}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Link to={`/comptabilite/${t.id}`} className={`text-lg font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '−'}{formatCurrency(Number(t.amount))}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
