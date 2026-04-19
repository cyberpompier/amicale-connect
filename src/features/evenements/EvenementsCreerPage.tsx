import { useState, useEffect, type FormEvent } from 'react'
import { useEvenements } from '@/hooks/useEvenements'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Upload, X } from 'lucide-react'

export function EvenementsCreerPage() {
  const { addEvenement, updateEvenement, evenements, loading } = useEvenements()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    heure: '',
    lieu: '',
    image_url: '',
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editId && evenements.length > 0) {
      const event = evenements.find((e) => e.id === editId)
      if (event) {
        setFormData({
          titre: event.titre,
          description: event.description || '',
          date: event.date,
          heure: event.heure || '',
          lieu: event.lieu || '',
          image_url: event.image_url || '',
        })
        if (event.image_url) {
          setImagePreview(event.image_url)
        }
      }
    }
  }, [editId, evenements])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setImagePreview(base64)
        setFormData((p) => ({ ...p, image_url: base64 }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.titre.trim() || !formData.date) return

    setSaving(true)
    try {
      if (editId) {
        await updateEvenement(editId, formData)
      } else {
        await addEvenement(formData)
      }
      navigate('/evenements')
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/evenements')}
          className="p-2 hover:bg-white hover:shadow-[var(--shadow-sm)] rounded-lg transition-all border border-transparent hover:border-[var(--color-border)]"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            {editId ? "Modifier l'événement" : 'Créer un événement'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {editId ? 'Modifiez les informations ci-dessous' : 'Remplissez les informations de votre événement'}
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          {/* Section header */}
          <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-sm font-semibold text-[var(--color-text)]">Informations de l'événement</span>
          </div>

          <div className="p-6 space-y-5">
            {/* Bannière image */}
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Bannière <span className="text-[var(--color-text-muted)] font-normal">(optionnel)</span>
              </label>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-xl border border-[var(--color-border)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null)
                      setFormData((p) => ({ ...p, image_url: '' }))
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="block w-full px-4 py-6 border-2 border-dashed border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="w-5 h-5 text-[var(--color-text-muted)]" />
                    <span className="text-sm font-medium text-[var(--color-text)]">Cliquez pour ajouter une image</span>
                    <span className="text-xs text-[var(--color-text-muted)]">PNG, JPG ou GIF</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Titre <span className="text-[var(--color-primary)]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.titre}
                onChange={(e) => setFormData((p) => ({ ...p, titre: e.target.value }))}
                placeholder="Ex : Repas annuel de l'amicale"
                className="w-full px-3.5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Date <span className="text-[var(--color-primary)]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Heure <span className="text-[var(--color-text-muted)] font-normal">(optionnel)</span>
                </label>
                <input
                  type="time"
                  value={formData.heure}
                  onChange={(e) => setFormData((p) => ({ ...p, heure: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Lieu <span className="text-[var(--color-text-muted)] font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                value={formData.lieu}
                onChange={(e) => setFormData((p) => ({ ...p, lieu: e.target.value }))}
                placeholder="Ex : Caserne centrale"
                className="w-full px-3.5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Description <span className="text-[var(--color-text-muted)] font-normal">(optionnel)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Détails supplémentaires sur l'événement..."
                rows={4}
                className="w-full px-3.5 py-2.5 border border-[var(--color-border)] rounded-xl text-sm bg-[var(--color-bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] transition-colors resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {saving ? 'Sauvegarde...' : editId ? 'Enregistrer les modifications' : 'Créer l\'événement'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/evenements')}
              className="px-5 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg hover:bg-white transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
