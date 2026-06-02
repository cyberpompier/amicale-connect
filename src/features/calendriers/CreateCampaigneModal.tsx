import { useState } from 'react'
import { X } from 'lucide-react'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierSecteurs } from '@/hooks/useCalendrierSecteurs'

interface CreateCampaigneModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateCampaigneModal({ isOpen, onClose, onSuccess }: CreateCampaigneModalProps) {
  const { createCampagne, activeCampagne, closeCampagne, getPreviousCampagne } = useCalendrierCampagnes()
  const { copySecteursFromPreviousCampagne, copySecteursFromTemplates } = useCalendrierSecteurs()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const [formData, setFormData] = useState({
    name: `Tournée ${currentYear}`,
    year: currentYear,
    objective_amount: 15000,
    objective_calendriers: 1500,
    unit_price: 10,
    start_date: '',
    end_date: '',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'objective_amount' || name === 'objective_calendriers' || name === 'unit_price'
        ? value === '' ? 0 : Number(value)
        : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let previousCampagneId: string | null = null

      if (activeCampagne?.id) {
        // Campagne active en cours → la fermer et l'utiliser comme source de copie
        previousCampagneId = activeCampagne.id
        await closeCampagne(activeCampagne.id)
      } else {
        // Pas de campagne active (création depuis l'écran vide) →
        // utiliser la campagne fermée la plus récente comme source de copie
        const previousCampagne = getPreviousCampagne()
        if (previousCampagne) {
          previousCampagneId = previousCampagne.id
        }
      }

      const newCampagne = await createCampagne({
        name: formData.name,
        year: formData.year,
        objective_amount: formData.objective_amount,
        objective_calendriers: formData.objective_calendriers,
        unit_price: formData.unit_price,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes || null,
      })

      // Copier les secteurs : d'abord depuis les templates, sinon depuis l'ancienne campagne
      try {
        // Essayer d'abord les templates
        await copySecteursFromTemplates(newCampagne.id)
        // Si pas de templates, copier depuis la campagne précédente
        if (previousCampagneId) {
          await copySecteursFromPreviousCampagne(previousCampagneId, newCampagne.id)
        }
      } catch (copyErr) {
        console.error('Erreur lors de la copie des secteurs:', copyErr)
        // Ne pas bloquer la création si la copie échoue
      }

      // Mettre à jour activeCampagne APRÈS la copie
      onSuccess()

      onClose()
    } catch (err) {
      const errorMsg = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
        ? (err as any).message
        : typeof err === 'object' && err !== null && 'error' in err
        ? (err as any).error?.message || JSON.stringify((err as any).error)
        : JSON.stringify(err)
      console.error('Erreur création campagne:', errorMsg, err)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-bold text-[var(--color-text)]">
            Lancer une nouvelle campagne
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Nom de la campagne
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Année
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Objectif de collecte (€)
              </label>
              <input
                type="number"
                name="objective_amount"
                value={formData.objective_amount}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Objectif en calendriers
              </label>
              <input
                type="number"
                name="objective_calendriers"
                value={formData.objective_calendriers}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Prix unitaire (€)
              </label>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleChange}
                step="0.01"
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Date de début
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                Date de fin
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg font-semibold transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer la campagne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
