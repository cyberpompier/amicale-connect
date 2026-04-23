import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Users, MapPin, Save, Package, Star } from 'lucide-react'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierSecteurs } from '@/hooks/useCalendrierSecteurs'
import { useAmicalistes } from '@/hooks/useAmicalistes'

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
]

type Equipier = { amicaliste_id: string; role: 'responsable' | 'equipier' }

export function CalendriersSecteurFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { activeCampagne, loading: campLoading } = useCalendrierCampagnes()
  const { secteurs, loading: secLoading, createSecteur, updateSecteur } = useCalendrierSecteurs(
    activeCampagne?.id
  )
  const { amicalistes, loading: amLoading } = useAmicalistes()

  const existingSecteur = useMemo(
    () => (isEdit ? secteurs.find((s) => s.id === id) : null),
    [isEdit, secteurs, id]
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [objectiveAmount, setObjectiveAmount] = useState<number>(500)
  const [objectiveCalendriers, setObjectiveCalendriers] = useState<number>(50)
  const [allocatedQty, setAllocatedQty] = useState<number>(50)
  const [color, setColor] = useState(COLORS[0])
  const [rues, setRues] = useState<string[]>([''])
  const [equipiers, setEquipiers] = useState<Equipier[]>([])
  const [amSearch, setAmSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existingSecteur) {
      setName(existingSecteur.name)
      setDescription(existingSecteur.description ?? '')
      setObjectiveAmount(Number(existingSecteur.objective_amount))
      setObjectiveCalendriers(existingSecteur.objective_calendriers)
      setAllocatedQty(existingSecteur.calendrier_stocks?.allocated_qty ?? 0)
      setColor(existingSecteur.color || COLORS[0])
      setRues(
        existingSecteur.calendrier_secteur_rues && existingSecteur.calendrier_secteur_rues.length > 0
          ? existingSecteur.calendrier_secteur_rues.map((r) => r.name)
          : ['']
      )
      setEquipiers(
        existingSecteur.calendrier_secteur_equipiers?.map((e) => ({
          amicaliste_id: e.amicaliste_id,
          role: e.role,
        })) ?? []
      )
    }
  }, [existingSecteur])

  const filteredAmicalistes = useMemo(() => {
    const assignedIds = new Set(equipiers.map((e) => e.amicaliste_id))
    const q = amSearch.toLowerCase().trim()
    return amicalistes.filter(
      (a) =>
        !assignedIds.has(a.id) &&
        (!q ||
          a.first_name.toLowerCase().includes(q) ||
          a.last_name.toLowerCase().includes(q) ||
          (a.grade?.toLowerCase().includes(q) ?? false))
    )
  }, [amicalistes, equipiers, amSearch])

  const handleAddRue = () => setRues((prev) => [...prev, ''])
  const handleChangeRue = (idx: number, val: string) =>
    setRues((prev) => prev.map((r, i) => (i === idx ? val : r)))
  const handleRemoveRue = (idx: number) =>
    setRues((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== idx)))

  const handleAddEquipier = (amicalisteId: string) => {
    setEquipiers((prev) => [...prev, { amicaliste_id: amicalisteId, role: 'equipier' }])
    setAmSearch('')
  }
  const handleRemoveEquipier = (amicalisteId: string) =>
    setEquipiers((prev) => prev.filter((e) => e.amicaliste_id !== amicalisteId))
  const handleToggleRole = (amicalisteId: string) =>
    setEquipiers((prev) =>
      prev.map((e) =>
        e.amicaliste_id === amicalisteId
          ? { ...e, role: e.role === 'responsable' ? 'equipier' : 'responsable' }
          : e
      )
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCampagne || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        campagne_id: activeCampagne.id,
        name: name.trim(),
        description: description.trim() || null,
        objective_amount: objectiveAmount,
        objective_calendriers: objectiveCalendriers,
        color,
        rues: rues.filter((r) => r.trim()),
        equipiers,
        allocated_qty: allocatedQty,
      }
      if (isEdit && id) {
        await updateSecteur(id, payload)
        navigate(`/calendriers/secteurs/${id}`)
      } else {
        const created = await createSecteur(payload)
        navigate(`/calendriers/secteurs/${created.id}`)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  if (campLoading || (isEdit && secLoading) || amLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!activeCampagne) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
        <p className="text-[var(--color-text-muted)]">Aucune campagne active.</p>
      </div>
    )
  }

  const assignedAmicalistes = equipiers
    .map((e) => ({ ...e, info: amicalistes.find((a) => a.id === e.amicaliste_id) }))
    .filter((e) => e.info)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            {isEdit ? 'Éditer le secteur' : 'Nouveau secteur'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">Campagne : {activeCampagne.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations générales */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-[var(--color-text)]">Informations générales</h2>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              Nom du secteur *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Centre-ville, Quartier Nord..."
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              Couleur
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    color === c ? 'border-[var(--color-text)] scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Objectif collecte (€)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={objectiveAmount}
                onChange={(e) => setObjectiveAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Objectif calendriers
              </label>
              <input
                type="number"
                min="0"
                value={objectiveCalendriers}
                onChange={(e) => setObjectiveCalendriers(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                <Package className="w-3 h-3" /> Stock alloué
              </label>
              <input
                type="number"
                min="0"
                value={allocatedQty}
                onChange={(e) => setAllocatedQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>
          </div>
        </div>

        {/* Rues */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-primary)]" /> Rues du secteur
            </h2>
            <button
              type="button"
              onClick={handleAddRue}
              className="flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>

          <div className="space-y-2">
            {rues.map((rue, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  type="text"
                  value={rue}
                  onChange={(e) => handleChangeRue(idx, e.target.value)}
                  placeholder="Nom de la rue"
                  className="flex-1 px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveRue(idx)}
                  className="px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Équipe */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--color-primary)]" /> Équipe assignée
          </h2>

          {/* Équipiers déjà assignés */}
          {assignedAmicalistes.length > 0 && (
            <div className="space-y-2">
              {assignedAmicalistes.map((eq) => (
                <div
                  key={eq.amicaliste_id}
                  className="flex items-center gap-3 p-3 bg-[var(--color-bg-secondary)] rounded-lg"
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-sm font-bold">
                    {eq.info!.first_name[0]}
                    {eq.info!.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)]">
                      {eq.info!.first_name} {eq.info!.last_name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {eq.info!.grade ?? ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleRole(eq.amicaliste_id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-colors ${
                      eq.role === 'responsable'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-white text-[var(--color-text-muted)] border border-[var(--color-border)]'
                    }`}
                  >
                    <Star className="w-3 h-3" />
                    {eq.role === 'responsable' ? 'Responsable' : 'Équipier'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveEquipier(eq.amicaliste_id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Sélecteur amicaliste */}
          <div>
            <input
              type="text"
              value={amSearch}
              onChange={(e) => setAmSearch(e.target.value)}
              placeholder="Rechercher un amicaliste à ajouter..."
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
            />
            {amSearch && filteredAmicalistes.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto bg-white border border-[var(--color-border)] rounded-lg shadow-lg">
                {filteredAmicalistes.slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => handleAddEquipier(a.id)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-[var(--color-bg-secondary)] text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-xs font-bold">
                      {a.first_name[0]}
                      {a.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)]">
                        {a.first_name} {a.last_name}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{a.grade ?? ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {amSearch && filteredAmicalistes.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] italic mt-2">
                Aucun amicaliste trouvé.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-sm font-semibold transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer le secteur'}
          </button>
        </div>
      </form>
    </div>
  )
}
