import { useEffect, useState } from 'react'
import { X, Mail, Phone, MapPin, Gift, Calendar, CreditCard } from 'lucide-react'
import type { Donateur, DonVente } from '@/hooks/useDonateurs'

interface DonateurDetailModalProps {
  isOpen: boolean
  donateur: Donateur | null
  onClose: () => void
  fetchDons: (donateur: Donateur) => Promise<DonVente[]>
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  check: 'Chèque',
  card: 'Carte',
  transfer: 'Virement',
  other: 'Autre',
}

export function DonateurDetailModal({
  isOpen,
  donateur,
  onClose,
  fetchDons,
}: DonateurDetailModalProps) {
  const [dons, setDons] = useState<DonVente[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && donateur) {
      setLoading(true)
      fetchDons(donateur)
        .then(setDons)
        .finally(() => setLoading(false))
    } else {
      setDons([])
    }
  }, [isOpen, donateur])

  if (!isOpen || !donateur) return null

  const localisation = [donateur.adresse, donateur.ville].filter(Boolean).join(', ')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)] sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              {donateur.prenom} {donateur.nom}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">Fiche donateur</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Coordonnées */}
          <div className="grid sm:grid-cols-2 gap-4">
            {donateur.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-[var(--color-text-muted)]" />
                <a
                  href={`mailto:${donateur.email}`}
                  className="text-[var(--color-text)] hover:text-[var(--color-primary)]"
                >
                  {donateur.email}
                </a>
              </div>
            )}
            {donateur.telephone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-[var(--color-text-muted)]" />
                <a
                  href={`tel:${donateur.telephone}`}
                  className="text-[var(--color-text)] hover:text-[var(--color-primary)]"
                >
                  {donateur.telephone}
                </a>
              </div>
            )}
            {localisation && (
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <MapPin className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text)]">{localisation}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-primary)]">
                {Number(donateur.total_dons).toFixed(2)} €
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">Total donné</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[var(--color-text)]">
                {donateur.nombre_dons}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">Nombre de dons</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-sm font-bold text-[var(--color-text)] mt-1">
                {donateur.derniere_donation
                  ? new Date(donateur.derniere_donation).toLocaleDateString('fr-FR')
                  : '—'}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">Dernier don</div>
            </div>
          </div>

          {/* Notes */}
          {donateur.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-[var(--color-text)]">
              {donateur.notes}
            </div>
          )}

          {/* Liste des dons */}
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-[var(--color-text)] mb-3">
              <Gift className="w-5 h-5 text-[var(--color-primary)]" />
              Historique des dons
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
              </div>
            ) : dons.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
                Aucun don enregistré pour ce donateur.
              </p>
            ) : (
              <div className="space-y-2">
                {dons.map((don) => (
                  <div
                    key={don.id}
                    className="flex items-center justify-between p-3 border border-[var(--color-border)] rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(don.sale_date).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mt-0.5">
                          <CreditCard className="w-3.5 h-3.5" />
                          {PAYMENT_LABELS[don.payment_method] ?? don.payment_method}
                          {don.quantity > 1 && ` · ${don.quantity} calendriers`}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-[var(--color-text)]">
                      {Number(don.amount).toFixed(2)} €
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
