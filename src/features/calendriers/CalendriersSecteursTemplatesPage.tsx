import { useState, useMemo } from 'react'
import { Plus, Trash2, Edit, MapPin } from 'lucide-react'
import { useCalendrierSecteursTemplates } from '@/hooks/useCalendrierSecteursTemplates'
import { formatDateShort } from '@/lib/utils'

export function CalendriersSecteursTemplatesPage() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useCalendrierSecteursTemplates()
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    objective_amount: 500,
    objective_calendriers: 50,
    color: '#3B82F6',
    notes: '',
    rues: [''],
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleRueChange = (index: number, value: string) => {
    const newRues = [...formData.rues]
    newRues[index] = value
    handleChange('rues', newRues)
  }

  const handleAddRue = () => {
    handleChange('rues', [...formData.rues, ''])
  }

  const handleRemoveRue = (index: number) => {
    handleChange('rues', formData.rues.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateTemplate(editingId, {
          name: formData.name,
          description: formData.description || null,
          objective_amount: formData.objective_amount,
          objective_calendriers: formData.objective_calendriers,
          color: formData.color,
          notes: formData.notes || null,
          rues: formData.rues.filter((r) => r.trim()),
        })
        setEditingId(null)
      } else {
        await createTemplate({
          name: formData.name,
          description: formData.description || null,
          objective_amount: formData.objective_amount,
          objective_calendriers: formData.objective_calendriers,
          color: formData.color,
          notes: formData.notes || null,
          rues: formData.rues.filter((r) => r.trim()),
        })
      }
      setIsCreating(false)
      setFormData({
        name: '',
        description: '',
        objective_amount: 500,
        objective_calendriers: 50,
        color: '#3B82F6',
        notes: '',
        rues: [''],
      })
    } catch (err: any) {
      alert('Erreur: ' + (err?.message ?? 'Erreur inconnue'))
    }
  }

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      objective_amount: template.objective_amount,
      objective_calendriers: template.objective_calendriers,
      color: template.color,
      notes: template.notes || '',
      rues: template.calendrier_secteurs_templates_rues?.map((r: any) => r.name) || [''],
    })
    setEditingId(template.id)
    setIsCreating(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce modèle de secteur ?')) return
    try {
      await deleteTemplate(id)
    } catch (err: any) {
      alert('Erreur: ' + (err?.message ?? 'Erreur inconnue'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Modèles de secteurs</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Ces secteurs seront copiés automatiquement lors de la création d'une nouvelle campagne.
        </p>
      </div>

      {/* Bouton créer */}
      <button
        onClick={() => {
          setIsCreating(true)
          setEditingId(null)
          setFormData({
            name: '',
            description: '',
            objective_amount: 500,
            objective_calendriers: 50,
            color: '#3B82F6',
            notes: '',
            rues: [''],
          })
        }}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nouveau modèle
      </button>

      {/* Formulaire */}
      {isCreating && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">
            {editingId ? 'Éditer le modèle' : 'Créer un modèle'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1">
                  Couleur
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1">
                  Objectif collecte (€)
                </label>
                <input
                  type="number"
                  value={formData.objective_amount}
                  onChange={(e) => handleChange('objective_amount', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1">
                  Objectif calendriers
                </label>
                <input
                  type="number"
                  value={formData.objective_calendriers}
                  onChange={(e) => handleChange('objective_calendriers', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                />
              </div>
            </div>

            {/* Rues */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Rues à inclure
              </label>
              <div className="space-y-2">
                {formData.rues.map((rue, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Rue ${index + 1}`}
                      value={rue}
                      onChange={(e) => handleRueChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                    />
                    {formData.rues.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRue(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddRue}
                className="mt-2 px-3 py-1 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg"
              >
                + Ajouter une rue
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg font-semibold"
              >
                {editingId ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] font-medium mb-4">Aucun modèle de secteur.</p>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Créez des modèles pour les copier automatiquement dans chaque nouvelle campagne.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template: any) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl border border-[var(--color-border)] p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: template.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--color-text)] truncate">{template.name}</p>
                  {template.description && (
                    <p className="text-xs text-[var(--color-text-muted)]">{template.description}</p>
                  )}
                </div>
              </div>

              <div className="text-xs text-[var(--color-text-muted)] space-y-1 mb-3">
                <p>Objectif: {Number(template.objective_amount).toFixed(0)}€ / {template.objective_calendriers} cal.</p>
                {template.calendrier_secteurs_templates_rues && template.calendrier_secteurs_templates_rues.length > 0 && (
                  <p>{template.calendrier_secteurs_templates_rues.length} rue(s)</p>
                )}
              </div>

              <div className="flex gap-1 pt-3 border-t border-[var(--color-border)]">
                <button
                  onClick={() => handleEdit(template)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"
                >
                  <Edit className="w-3 h-3" /> Éditer
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
