import { useState, useEffect, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { ArrowLeft, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { transactions, deleteTransaction, updateTransaction } = useTransactions()
  const { categories } = useCategories()

  const transaction = transactions.find((t) => t.id === id)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>(null)

  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type,
        amount: transaction.amount.toString(),
        description: transaction.description,
        date: transaction.date,
        category_id: transaction.category_id || '',
        notes: transaction.notes || '',
      })
    }
  }, [transaction])

  const categoryOptions = formData ? categories.filter((c) => c.type === formData.type) : []

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData || !id) return

    setSaving(true)
    try {
      await updateTransaction(id, {
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        category_id: formData.category_id || null,
        notes: formData.notes || null,
      })
      setIsEditing(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return
    try {
      await deleteTransaction(id)
      navigate('/comptabilite')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  if (!transaction) {
    return (
      <div className="text-center py-24">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)]">Transaction introuvable</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-2">ID recherché: {id}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Transactions disponibles: {transactions.length}</p>
        <button
          onClick={() => navigate('/comptabilite')}
          className="mt-4 text-sm text-[var(--color-primary)] hover:underline"
        >
          Retour aux transactions
        </button>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/comptabilite')}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Transactions
        </button>
        {!isEditing && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
              Modifier
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Détails transaction */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
        {!isEditing ? (
          <div className="space-y-0">
            {/* En-tête avec montant */}
            <div className={`p-8 ${transaction.type === 'income' ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {transaction.type === 'income' ? '+ Recette' : '− Dépense'}
              </p>
              <p className={`text-5xl font-bold mt-3 ${transaction.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(Number(transaction.amount))}
              </p>
            </div>

            {/* Contenu principal */}
            <div className="p-8 space-y-6">
              {/* Grille infos principales */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Description</p>
                  <p className="text-lg font-semibold text-[var(--color-text)]">{transaction.description}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Date</p>
                  <p className="text-lg font-semibold text-[var(--color-text)]">{formatDateShort(transaction.date)}</p>
                </div>
              </div>

              {/* Catégorie */}
              {transaction.categories && (
                <div>
                  <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Catégorie</p>
                  <span className="inline-flex px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg">
                    {transaction.categories.name}
                  </span>
                </div>
              )}

              {/* Notes */}
              {transaction.notes && (
                <div className="pt-6 border-t border-[var(--color-border)]">
                  <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Notes</p>
                  <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg">
                    <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{transaction.notes}</p>
                  </div>
                </div>
              )}

              {/* Traçabilité */}
              <div className="pt-6 border-t border-[var(--color-border)]">
                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-4">Historique</p>
                <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Créée par</p>
                    <p className="font-semibold text-[var(--color-text)]">
                      {transaction.created_by_profile?.full_name || '—'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {new Date(transaction.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {transaction.updated_by && transaction.updated_by !== transaction.created_by && (
                    <div className="pt-3 border-t border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Modifiée par</p>
                      <p className="font-semibold text-[var(--color-text)]">
                        {transaction.updated_by_profile?.full_name || '—'}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {new Date(transaction.updated_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                rows={3}
                className="sm:col-span-2 px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] resize-none"
              />
            </div>

            <div className="flex gap-2 pt-4 border-t border-[var(--color-border)]">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
