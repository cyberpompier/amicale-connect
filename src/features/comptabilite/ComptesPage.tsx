import { useState, type FormEvent } from 'react'
import { Plus, Trash2, Pencil, Wallet, Star } from 'lucide-react'
import { useComptes, COMPTE_TYPES, type CompteInput } from '@/hooks/useComptes'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

const ICONES = ['🏦', '💵', '💳', '📈', '💼', '🏧', '🏠', '⚡']
const COULEURS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6']

function formatMontant(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

export function ComptesPage() {
  const { comptes, loading, totalSolde, compteDefault, addCompte, updateCompte, deleteCompte, setDefaultCompte } = useComptes()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CompteInput>({
    nom: '',
    type: 'courant',
    solde_initial: 0,
    couleur: '#6366f1',
    icone: '🏦',
    actif: true,
    is_default: false,
    ordre: 0,
  })

  const resetForm = () => {
    setForm({ nom: '', type: 'courant', solde_initial: 0, couleur: '#6366f1', icone: '🏦', actif: true, is_default: false, ordre: 0 })
    setShowForm(false)
    setEditingId(null)
  }

  const handleEdit = (c: typeof comptes[0]) => {
    setForm({ nom: c.nom, type: c.type, solde_initial: c.solde_initial, couleur: c.couleur, icone: c.icone, actif: c.actif, is_default: c.is_default, ordre: c.ordre })
    setEditingId(c.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.nom.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await updateCompte(editingId, form)
      } else {
        await addCompte({ ...form, ordre: comptes.length })
      }
      resetForm()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, nom: string) => {
    if (!confirm(`Supprimer le compte "${nom}" ? Les transactions liées seront dissociées.`)) return
    try { await deleteCompte(id) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  const handleSetDefault = async (id: string) => {
    try { await setDefaultCompte(id) }
    catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Comptes"
        subtitle={`${comptes.length} compte${comptes.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => { resetForm(); setShowForm(!showForm) }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouveau compte</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        }
      />

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-[var(--shadow-sm)] space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide">
            {editingId ? 'Modifier le compte' : 'Nouveau compte'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              required
              type="text"
              placeholder="Nom du compte (ex: Caisse, LCL...)"
              value={form.nom}
              onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
              className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
            <select
              value={form.type}
              onChange={e => {
                const type = e.target.value as CompteInput['type']
                setForm(p => ({ ...p, type, icone: COMPTE_TYPES[type].icone, couleur: COMPTE_TYPES[type].couleur }))
              }}
              className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            >
              {Object.entries(COMPTE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.icone} {v.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Solde initial (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.solde_initial}
                onChange={e => setForm(p => ({ ...p, solde_initial: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Icône</label>
              <div className="flex gap-1.5 flex-wrap">
                {ICONES.map(ic => (
                  <button key={ic} type="button"
                    onClick={() => setForm(p => ({ ...p, icone: ic }))}
                    className={cn('w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-all',
                      form.icone === ic ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-transparent bg-[var(--color-bg-secondary)]'
                    )}
                  >{ic}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Couleur</label>
            <div className="flex gap-2 flex-wrap">
              {COULEURS.map(col => (
                <button key={col} type="button"
                  onClick={() => setForm(p => ({ ...p, couleur: col }))}
                  className={cn('w-8 h-8 rounded-full border-4 transition-all',
                    form.couleur === col ? 'border-gray-400 scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer le compte'}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 border border-[var(--color-border)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Solde global */}
      {comptes.length > 0 && (
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-red-700 rounded-2xl p-5 text-white shadow-[var(--shadow-md)]">
          <p className="text-sm font-medium text-red-100">Trésorerie globale (tous comptes)</p>
          <p className={cn('text-4xl font-bold mt-1', totalSolde < 0 && 'text-red-200')}>
            {formatMontant(totalSolde)}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-red-100">{comptes.length} compte{comptes.length > 1 ? 's' : ''} actif{comptes.length > 1 ? 's' : ''}</p>
            {compteDefault && (
              <p className="text-xs text-red-100 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                Défaut : <strong>{compteDefault.icone} {compteDefault.nom}</strong>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Liste des comptes */}
      {comptes.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun compte</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">Créez vos comptes bancaires pour gérer votre trésorerie.</p>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors">
            Créer le premier compte
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {comptes.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden group hover:shadow-[var(--shadow)] transition-shadow">
              {/* Bande couleur */}
              <div className="h-1.5" style={{ backgroundColor: c.couleur }} />

              <div className="p-5">
                {/* En-tête */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: c.couleur + '20' }}>
                      {c.icone}
                      {c.is_default && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-sm" title="Compte par défaut">
                          <Star className="w-3 h-3 fill-white text-white" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-[var(--color-text)]">{c.nom}</h3>
                        {c.is_default && (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Défaut</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">{COMPTE_TYPES[c.type].label}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!c.is_default && (
                      <button
                        onClick={() => handleSetDefault(c.id)}
                        className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Définir comme compte par défaut"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    )}
                    <button onClick={() => handleEdit(c)} className="p-1.5 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors" title="Modifier">
                      <Pencil className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                    </button>
                    <button onClick={() => handleDelete(c.id, c.nom)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Solde */}
                <div className="space-y-1">
                  <p className="text-xs text-[var(--color-text-muted)]">Solde actuel</p>
                  <p className={cn('text-2xl font-bold', c.solde >= 0 ? 'text-[var(--color-text)]' : 'text-red-600')}>
                    {formatMontant(c.solde)}
                  </p>
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                  <div>
                    <p className="text-xs text-green-600 font-medium">↑ Recettes</p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{formatMontant(c.total_recettes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-500 font-medium">↓ Dépenses</p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{formatMontant(c.total_depenses)}</p>
                  </div>
                </div>

                {/* Solde initial */}
                {c.solde_initial !== 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    Solde initial : {formatMontant(c.solde_initial)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
