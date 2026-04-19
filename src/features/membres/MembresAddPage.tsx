import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAmicalistes, type AmicalisteInput } from '@/hooks/useAmicalistes'
import { ArrowLeft, Upload, X } from 'lucide-react'
import { useEffect } from 'react'

const GRADES = [
  'Sapeur',
  'Caporal',
  'Caporal-chef',
  'Sergent',
  'Sergent-chef',
  'Adjudant',
  'Adjudant-chef',
  'Lieutenant',
  'Capitaine',
  'Commandant',
  'Lieutenant-colonel',
  'Colonel',
  'Retraité',
  'Civil',
]

export function MembresAddPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { amicalistes, addAmicaliste, updateAmicaliste } = useAmicalistes()

  const isEdit = Boolean(id)
  const existing = isEdit ? amicalistes.find((a) => a.id === id) : null

  const [form, setForm] = useState<AmicalisteInput>({
    first_name: '',
    last_name: '',
    email: null,
    phone: null,
    grade: null,
    status: 'actif',
    join_date: new Date().toISOString().split('T')[0],
    notes: null,
    avatar_url: null,
  })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (existing) {
      setForm({
        first_name: existing.first_name,
        last_name: existing.last_name,
        email: existing.email,
        phone: existing.phone,
        grade: existing.grade,
        status: existing.status,
        join_date: existing.join_date,
        notes: existing.notes,
        avatar_url: existing.avatar_url || null,
      })
      if (existing.avatar_url) {
        setAvatarPreview(existing.avatar_url)
      }
    }
  }, [existing])

  const handleChange = (field: keyof AmicalisteInput, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setAvatarPreview(base64)
        setForm((prev) => ({ ...prev, avatar_url: base64 }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Le nom et le prénom sont obligatoires')
      return
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await updateAmicaliste(id, form)
      } else {
        await addAmicaliste(form)
      }
      navigate('/membres')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  return (
    <div>
      <button
        onClick={() => navigate('/membres')}
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la liste
      </button>

      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">
        {isEdit ? 'Modifier un membre' : 'Ajouter un membre'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mb-4">
            {error}
          </div>
        )}

        {/* Avatar upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Photo</label>
          {avatarPreview ? (
            <div className="relative w-fit">
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-24 h-24 rounded-xl object-cover border-2 border-[var(--color-primary)]"
              />
              <button
                type="button"
                onClick={() => {
                  setAvatarPreview(null)
                  setForm((p) => ({ ...p, avatar_url: null }))
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="block w-full px-4 py-6 border-2 border-dashed border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-colors">
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="w-5 h-5 text-[var(--color-text-muted)]" />
                <span className="text-sm font-medium text-[var(--color-text)]">Ajouter une photo</span>
                <span className="text-xs text-[var(--color-text-muted)]">PNG, JPG ou GIF</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="Jean"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="Dupont"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Email</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={(e) => handleChange('email', e.target.value || null)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="jean.dupont@email.fr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Téléphone</label>
            <input
              type="tel"
              value={form.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value || null)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="06 12 34 56 78"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Grade</label>
            <select
              value={form.grade || ''}
              onChange={(e) => handleChange('grade', e.target.value || null)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
            >
              <option value="">— Sélectionner —</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Statut</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
            >
              <option value="actif">Actif</option>
              <option value="inactif">Inactif</option>
              <option value="honoraire">Honoraire</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Date d'adhésion
            </label>
            <input
              type="date"
              value={form.join_date}
              onChange={(e) => handleChange('join_date', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Notes</label>
          <textarea
            value={form.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value || null)}
            rows={3}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
            placeholder="Notes libres..."
          />
        </div>

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer les modifications' : 'Ajouter le membre'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/membres')}
            className="px-6 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] font-medium rounded-lg text-sm hover:bg-[var(--color-bg-secondary)] transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
