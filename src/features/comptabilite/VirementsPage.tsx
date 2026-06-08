import { useState, type FormEvent } from 'react'
import { Plus, Trash2, ArrowRight, ArrowLeftRight } from 'lucide-react'
import { useVirements, type VirementInput } from '@/hooks/useVirements'
import { useComptes } from '@/hooks/useComptes'
import { PageHeader } from '@/components/ui/PageHeader'

function formatMontant(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Regrouper les virements par mois
function groupByMonth(virements: ReturnType<typeof useVirements>['virements']) {
  const groups: Record<string, typeof virements> = {}
  virements.forEach(v => {
    const key = new Date(v.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(v)
  })
  return groups
}

export function VirementsPage() {
  const { virements, loading, addVirement, deleteVirement } = useVirements()
  const { comptes } = useComptes()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<VirementInput>({
    compte_source_id: '',
    compte_destination_id: '',
    montant: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.compte_source_id || !form.compte_destination_id || form.montant <= 0) return
    setSaving(true)
    try {
      await addVirement({ ...form, notes: form.notes || null })
      setForm({ compte_source_id: '', compte_destination_id: '', montant: 0, date: new Date().toISOString().split('T')[0], description: '', notes: '' })
      setShowForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce virement ?')) return
    try { await deleteVirement(id) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  const grouped = groupByMonth(virements)

  const compteSource = comptes.find(c => c.id === form.compte_source_id)
  const compteDest   = comptes.find(c => c.id === form.compte_destination_id)

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Virements inter-comptes"
        subtitle={`${virements.length} virement${virements.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            disabled={comptes.length < 2}
            title={comptes.length < 2 ? 'Créez au moins 2 comptes pour effectuer un virement' : ''}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouveau virement</span>
            <span className="sm:hidden">Virer</span>
          </button>
        }
      />

      {/* Alerte : pas assez de comptes */}
      {comptes.length < 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-700">
          💡 Vous devez avoir au moins <strong>2 comptes</strong> pour effectuer un virement.
          Créez vos comptes depuis l'onglet <strong>Comptes</strong>.
        </div>
      )}

      {/* Formulaire de virement */}
      {showForm && comptes.length >= 2 && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-[var(--shadow-sm)] space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide">Nouveau virement</h3>

          {/* Sélection des comptes */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Compte source (débit)</label>
              <select
                required
                value={form.compte_source_id}
                onChange={e => setForm(p => ({ ...p, compte_source_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              >
                <option value="">— Choisir —</option>
                {comptes.map(c => (
                  <option key={c.id} value={c.id} disabled={c.id === form.compte_destination_id}>
                    {c.icone} {c.nom} ({c.solde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-center gap-1 pt-5">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-full">
                <ArrowRight className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
            </div>

            <div className="flex-1">
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Compte destination (crédit)</label>
              <select
                required
                value={form.compte_destination_id}
                onChange={e => setForm(p => ({ ...p, compte_destination_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              >
                <option value="">— Choisir —</option>
                {comptes.map(c => (
                  <option key={c.id} value={c.id} disabled={c.id === form.compte_source_id}>
                    {c.icone} {c.nom} ({c.solde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Aperçu du virement */}
          {compteSource && compteDest && (
            <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-lg text-sm">
              <span className="font-semibold" style={{ color: compteSource.couleur }}>
                {compteSource.icone} {compteSource.nom}
              </span>
              <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
              <span className="font-semibold" style={{ color: compteDest.couleur }}>
                {compteDest.icone} {compteDest.nom}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Montant (€) *</label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.montant || ''}
                onChange={e => setForm(p => ({ ...p, montant: parseFloat(e.target.value) || 0 }))}
                placeholder="0,00"
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Date *</label>
              <input
                required
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <input
            required
            type="text"
            placeholder="Description *"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
          />

          <textarea
            placeholder="Notes (optionnel)"
            rows={2}
            value={form.notes || ''}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
          />

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Effectuer le virement'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste des virements */}
      {virements.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun virement</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {comptes.length < 2
              ? 'Créez au moins 2 comptes pour effectuer des virements.'
              : 'Effectuez votre premier virement entre vos comptes.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([mois, items]) => (
            <div key={mois}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold text-[var(--color-text)] capitalize">{mois}</h2>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span className="text-xs text-[var(--color-text-muted)]">
                  {formatMontant(items.reduce((s, v) => s + Number(v.montant), 0))}
                </span>
              </div>

              <div className="space-y-3">
                {items.map(v => (
                  <div key={v.id}
                    className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4 group hover:shadow-[var(--shadow)] transition-shadow">
                    <div className="flex items-center gap-4">
                      {/* Icône */}
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
                      </div>

                      {/* Comptes */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: v.compte_source?.couleur }}>
                            {v.compte_source?.icone} {v.compte_source?.nom}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                          <span className="text-sm font-semibold" style={{ color: v.compte_destination?.couleur }}>
                            {v.compte_destination?.icone} {v.compte_destination?.nom}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--color-text)] mt-0.5">{v.description}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{formatDate(v.date)}</p>
                        {v.notes && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 italic">{v.notes}</p>}
                      </div>

                      {/* Montant */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-indigo-600">{formatMontant(Number(v.montant))}</p>
                      </div>

                      {/* Supprimer */}
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
