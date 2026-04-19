import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Radio, CheckSquare, Calendar } from 'lucide-react'
import { useSondages } from '@/hooks/useSondages'

export function SondagesCreerPage() {
  const navigate = useNavigate()
  const { addSondage } = useSondages()

  const [form, setForm] = useState({
    titre: '',
    description: '',
    type: 'unique' as 'unique' | 'multiple',
    date_fin: '',
  })
  const [options, setOptions] = useState(['', ''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addOption = () => setOptions((prev) => [...prev, ''])
  const removeOption = (i: number) => setOptions((prev) => prev.filter((_, idx) => idx !== i))
  const updateOption = (i: number, value: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const validOptions = options.filter((o) => o.trim())
    if (validOptions.length < 2) {
      setError('Vous devez saisir au moins 2 options.')
      return
    }

    setSaving(true)
    try {
      await addSondage({
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        type: form.type,
        date_fin: form.date_fin || null,
        options: validOptions,
      })
      navigate('/sondages')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    }
    setSaving(false)
  }

  return (
    <div>
      <button
        onClick={() => navigate('/sondages')}
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux sondages
      </button>

      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Lancer un sondage</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{error}</div>
        )}

        {/* Informations générales */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">Informations</h2>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Titre du sondage <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.titre}
              onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))}
              placeholder="Ex : Menu de la Sainte-Barbe 2025"
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              placeholder="Contexte ou précisions supplémentaires..."
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Type de vote</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, type: 'unique' }))}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  form.type === 'unique'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] hover:border-gray-300'
                }`}
              >
                <Radio className={`w-5 h-5 flex-shrink-0 ${form.type === 'unique' ? 'text-[var(--color-primary)]' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-sm font-semibold ${form.type === 'unique' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                    Choix unique
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">1 seule réponse</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, type: 'multiple' }))}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  form.type === 'multiple'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                    : 'border-[var(--color-border)] hover:border-gray-300'
                }`}
              >
                <CheckSquare className={`w-5 h-5 flex-shrink-0 ${form.type === 'multiple' ? 'text-[var(--color-primary)]' : 'text-gray-400'}`} />
                <div>
                  <p className={`text-sm font-semibold ${form.type === 'multiple' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                    Choix multiple
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">Plusieurs réponses</p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date de fin (optionnel)
            </label>
            <input
              type="date"
              value={form.date_fin}
              onChange={(e) => setForm((p) => ({ ...p, date_fin: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
          </div>
        </section>

        {/* Options de vote */}
        <section className="bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">
              Options de vote <span className="text-[var(--color-text-muted)] font-normal normal-case">({options.length})</span>
            </h2>
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary-light)] hover:bg-[var(--color-primary)]/15 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter une option
            </button>
          </div>

          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[var(--color-text-muted)]">{i + 1}</span>
                </div>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="p-2 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-6">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Création...' : 'Lancer le sondage'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/sondages')}
            className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] font-medium rounded-lg text-sm hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
