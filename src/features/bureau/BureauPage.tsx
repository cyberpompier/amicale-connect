import { useState, type FormEvent } from 'react'
import { useBureauPositions } from '@/hooks/useBureauPositions'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { Plus, Trash2, Users2 } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

const BUREAU_POSITIONS = [
  'Président',
  'Vice-président',
  'Trésorier',
  'Trésorier adjoint',
  'Secrétaire',
  'Secrétaire adjoint',
  'Conseiller',
  'Membre du bureau',
]

export function BureauPage() {
  const { positions, loading, addPosition, endMandate, deletePosition } = useBureauPositions()
  const { amicalistes } = useAmicalistes()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    position: BUREAU_POSITIONS[0],
    amicaliste_id: '',
    start_date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.position.trim() || !formData.amicaliste_id.trim()) return

    setSaving(true)
    try {
      await addPosition({
        position: formData.position,
        amicaliste_id: formData.amicaliste_id,
        start_date: formData.start_date,
        end_date: null,
      })
      setFormData({
        position: BUREAU_POSITIONS[0],
        amicaliste_id: '',
        start_date: new Date().toISOString().split('T')[0],
      })
      setShowForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const handleEndMandate = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir terminer ce mandat ?')) return
    try {
      await endMandate(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce poste ?')) return
    try {
      await deletePosition(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const getMemberName = (amicalisteId: string) => {
    const member = amicalistes.find((a) => a.id === amicalisteId)
    return member ? `${member.first_name} ${member.last_name}` : '—'
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
        title="Composition du bureau"
        subtitle={`${positions.length} poste${positions.length !== 1 ? 's' : ''} actif${positions.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un poste</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        }
      />

      {showForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 mb-5 shadow-[var(--shadow-sm)]">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Nouveau poste</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={formData.position}
                onChange={(e) => setFormData((p) => ({ ...p, position: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              >
                {BUREAU_POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>

              <select
                required
                value={formData.amicaliste_id}
                onChange={(e) => setFormData((p) => ({ ...p, amicaliste_id: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              >
                <option value="">— Sélectionner un membre —</option>
                {amicalistes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.first_name} {a.last_name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData((p) => ({ ...p, start_date: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>

            <div className="flex gap-2 mt-4">
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

      {positions.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users2 className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun poste défini</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Commencez par définir la composition de votre bureau.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Ajouter le premier poste
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Structure hiérarchique */}
          <div>
            {/* Président */}
            {positions.filter((p) => p.position === 'Président').map((pos) => {
              const member = amicalistes.find((a) => a.id === pos.amicaliste_id)
              return (
                <div key={pos.id} className="flex justify-center mb-8">
                  <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-2xl p-6 text-white text-center max-w-xs w-full shadow-lg border-2 border-[var(--color-primary)]">
                    <div className="text-sm font-semibold uppercase tracking-wide opacity-90 mb-2">Président</div>
                    {member?.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={getMemberName(pos.amicaliste_id)}
                        className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-3 border-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-white/20 flex items-center justify-center border-3 border-white">
                        <span className="text-xl font-bold">{member?.first_name[0]}{member?.last_name[0]}</span>
                      </div>
                    )}
                    <div className="text-lg font-bold">{getMemberName(pos.amicaliste_id)}</div>
                    <div className="text-xs opacity-75 mt-2">Depuis le {formatDateShort(pos.start_date)}</div>
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/20">
                      <button
                        onClick={() => handleEndMandate(pos.id)}
                        className="px-3 py-1 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        Terminer
                      </button>
                      <button
                        onClick={() => handleDelete(pos.id)}
                        className="p-1.5 text-white/60 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Autres postes en grille */}
          {positions.filter((p) => p.position !== 'Président').length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-4 px-4">Direction & Conseil</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {positions
                  .filter((p) => p.position !== 'Président')
                  .map((pos) => {
                    const member = amicalistes.find((a) => a.id === pos.amicaliste_id)
                    return (
                      <div
                        key={pos.id}
                        className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wide">
                              {pos.position}
                            </div>
                            <div className="text-sm font-bold text-[var(--color-text)] mt-1">
                              {getMemberName(pos.amicaliste_id)}
                            </div>
                          </div>
                          {member?.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={getMemberName(pos.amicaliste_id)}
                              className="w-10 h-10 rounded-lg object-cover ml-2"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center ml-2 flex-shrink-0">
                              <span className="text-xs font-bold text-[var(--color-primary)]">
                                {member?.first_name[0]}{member?.last_name[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mb-3">
                          Depuis le {formatDateShort(pos.start_date)}
                        </div>
                        <div className="flex items-center gap-1 pt-3 border-t border-[var(--color-border)]">
                          <button
                            onClick={() => handleEndMandate(pos.id)}
                            className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors flex-1"
                          >
                            Terminer
                          </button>
                          <button
                            onClick={() => handleDelete(pos.id)}
                            className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
