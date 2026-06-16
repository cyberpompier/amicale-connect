import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface DonateurModalProps {
  isOpen: boolean
  donateur?: any
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

export function DonateurModal({ isOpen, donateur, onClose, onSave }: DonateurModalProps) {
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    notes: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (donateur) {
      // Coercer les valeurs null de la BD en chaînes vides (inputs contrôlés)
      setFormData({
        prenom: donateur.prenom ?? '',
        nom: donateur.nom ?? '',
        email: donateur.email ?? '',
        telephone: donateur.telephone ?? '',
        adresse: donateur.adresse ?? '',
        code_postal: donateur.code_postal ?? '',
        ville: donateur.ville ?? '',
        notes: donateur.notes ?? '',
      })
    } else {
      setFormData({
        prenom: '',
        nom: '',
        email: '',
        telephone: '',
        adresse: '',
        code_postal: '',
        ville: '',
        notes: '',
      })
    }
  }, [donateur, isOpen])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nom.trim() || !formData.ville.trim()) {
      alert('Le nom et la ville sont obligatoires')
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        prenom: formData.prenom.trim() || null,
        nom: formData.nom.trim(),
        email: formData.email.trim() || null,
        telephone: formData.telephone.trim() || null,
        adresse: formData.adresse.trim() || null,
        code_postal: formData.code_postal.trim() || null,
        ville: formData.ville.trim(),
        notes: formData.notes.trim() || null,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-[var(--color-text)]">
            {donateur ? 'Modifier le donateur' : 'Ajouter un donateur'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Prénom
              </label>
              <input
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Nom *
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Téléphone
            </label>
            <input
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Adresse
            </label>
            <input
              type="text"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Code postal
              </label>
              <input
                type="text"
                name="code_postal"
                value={formData.code_postal}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                Ville *
              </label>
              <input
                type="text"
                name="ville"
                value={formData.ville}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
              placeholder="Informations supplémentaires..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 disabled:opacity-50 transition"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
