import { useState } from 'react'
import { useCotisations } from '@/hooks/useCotisations'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { Check, Clock, AlertTriangle, Plus, EuroIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

const currentYear = new Date().getFullYear()

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  paid:    { badge: 'bg-green-100 text-green-700', label: 'Payé' },
  pending: { badge: 'bg-amber-100 text-amber-700', label: 'En attente' },
  overdue: { badge: 'bg-red-100 text-red-700',     label: 'En retard' },
}

export function CotisationsPage() {
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const { cotisations, loading, markAsPaid, addCotisation } = useCotisations(selectedYear)
  const { amicalistes } = useAmicalistes()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ amicaliste_id: '', amount: '30' })
  const [saving, setSaving] = useState(false)
  const [memberFilter, setMemberFilter] = useState('all') // all, active, inactive, honorary, or specific id

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Filtrer les amicalistes selon le filtre sélectionné
  const getFilteredAmicalistes = () => {
    if (memberFilter === 'all') return amicalistes
    if (memberFilter === 'active') return amicalistes.filter((a) => a.status === 'actif')
    if (memberFilter === 'inactive') return amicalistes.filter((a) => a.status === 'inactif')
    if (memberFilter === 'honorary') return amicalistes.filter((a) => a.status === 'honoraire')
    return amicalistes.filter((a) => a.id === memberFilter)
  }

  const filteredAmicalistes = getFilteredAmicalistes()
  const filteredCotisations = cotisations.filter((c) =>
    filteredAmicalistes.some((a) => a.id === c.amicaliste_id)
  )

  const paid = filteredCotisations.filter((c) => c.status === 'paid')
  const pending = filteredCotisations.filter((c) => c.status === 'pending')
  const overdue = filteredCotisations.filter((c) => c.status === 'overdue')
  const totalAmount = paid.reduce((sum, c) => sum + Number(c.amount), 0)

  const handleAddCotisation = async () => {
    if (!formData.amicaliste_id || !formData.amount) return
    setSaving(true)
    try {
      await addCotisation({
        amicaliste_id: formData.amicaliste_id,
        year: selectedYear,
        amount: parseFloat(formData.amount),
        status: 'pending',
      })
      setShowForm(false)
      setFormData({ amicaliste_id: '', amount: '30' })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const handleAddCotisationForAll = async () => {
    if (!formData.amount) return
    setSaving(true)
    try {
      // Get members to add cotisation for
      const membersToAdd = filteredAmicalistes
      if (membersToAdd.length === 0) {
        alert('Aucun membre avec ce statut')
        setSaving(false)
        return
      }

      // Check if user confirms
      const confirmed = confirm(
        `Créer une cotisation de ${formData.amount}€ pour ${membersToAdd.length} membre${membersToAdd.length > 1 ? 's' : ''} ?`
      )
      if (!confirmed) {
        setSaving(false)
        return
      }

      // Create cotisation for each member
      for (const member of membersToAdd) {
        await addCotisation({
          amicaliste_id: member.id,
          year: selectedYear,
          amount: parseFloat(formData.amount),
          status: 'pending',
        })
      }

      setShowForm(false)
      setFormData({ amicaliste_id: '', amount: '30' })
      alert(`${membersToAdd.length} cotisation${membersToAdd.length > 1 ? 's' : ''} créée${membersToAdd.length > 1 ? 's' : ''} !`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const handleMarkPaid = async (id: string) => {
    try {
      await markAsPaid(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
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
        title="Cotisations"
        subtitle={`Exercice ${selectedYear}`}
        action={
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 shadow-[var(--shadow-xs)]"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Total</span>
            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-gray-500">#</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{filteredCotisations.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Payées</span>
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600">{paid.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">En attente</span>
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pending.length + overdue.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Encaissé</span>
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <EuroIcon className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Nouvelle cotisation — {selectedYear}</h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Filtre des membres */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide block mb-2">
                Filtrer par statut
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMemberFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                    memberFilter === 'all'
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setMemberFilter('active')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                    memberFilter === 'active'
                      ? 'bg-green-500 text-white border-green-500'
                      : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-green-500'
                  }`}
                >
                  Actifs
                </button>
                <button
                  onClick={() => setMemberFilter('inactive')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                    memberFilter === 'inactive'
                      ? 'bg-gray-500 text-white border-gray-500'
                      : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-gray-500'
                  }`}
                >
                  Inactifs
                </button>
                <button
                  onClick={() => setMemberFilter('honorary')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                    memberFilter === 'honorary'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-amber-500'
                  }`}
                >
                  Honoraires
                </button>
              </div>
            </div>

            {/* Sélection d'un membre - création individuelle */}
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide block mb-2">
                Créer pour un membre
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={formData.amicaliste_id}
                  onChange={(e) => setFormData((p) => ({ ...p, amicaliste_id: e.target.value }))}
                  className="flex-1 px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                >
                  <option value="">— Sélectionner un membre —</option>
                  {amicalistes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.last_name} {a.first_name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                  className="w-32 px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                  placeholder="Montant (€)"
                />
                <button
                  onClick={handleAddCotisation}
                  disabled={saving || !formData.amicaliste_id}
                  className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>

            {/* Création en masse pour tous les membres du statut sélectionné */}
            {memberFilter !== 'all' && filteredAmicalistes.length > 0 && (
              <div className="pt-4 border-t border-[var(--color-border)]">
                <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                  <p className="text-sm text-[var(--color-text-muted)] mb-3">
                    Créer une cotisation de <strong>{formData.amount}€</strong> pour les {filteredAmicalistes.length} membre{filteredAmicalistes.length > 1 ? 's' : ''} {
                      memberFilter === 'active' ? 'actif' :
                      memberFilter === 'inactive' ? 'inactif' :
                      memberFilter === 'honorary' ? 'honoraire' : ''
                    }{filteredAmicalistes.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCotisationForAll}
                      disabled={saving || !formData.amount}
                      className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Création...' : `Créer pour tous`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bouton Annuler */}
            <button
              onClick={() => setShowForm(false)}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Tableau */}
      {filteredCotisations.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucune cotisation pour {selectedYear}</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Ajoutez les cotisations des membres pour cet exercice.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Ajouter une cotisation
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Membre</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden sm:table-cell">Montant</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Statut</th>
                  <th className="text-right px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredCotisations.map((c) => {
                  const s = STATUS_STYLES[c.status] ?? STATUS_STYLES['pending']
                  return (
                    <tr key={c.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                      <td className="px-4 py-3.5 font-medium text-[var(--color-text)]">
                        {c.amicalistes.last_name} {c.amicalistes.first_name}
                      </td>
                      <td className="px-4 py-3.5 text-[var(--color-text)] hidden sm:table-cell">
                        {formatCurrency(Number(c.amount))}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {c.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkPaid(c.id)}
                            className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold rounded-lg transition-colors border border-green-200"
                          >
                            Marquer payé
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
