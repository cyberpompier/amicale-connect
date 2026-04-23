import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Package,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  User,
  Euro,
  X,
} from 'lucide-react'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierSecteurs } from '@/hooks/useCalendrierSecteurs'
import { useCalendrierVentes, type CalendrierVente } from '@/hooks/useCalendrierVentes'
import { useCalendrierAdresses } from '@/hooks/useCalendrierAdresses'
import { useAssociation } from '@/features/association/AssociationContext'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { ReceiptActions } from './ReceiptActions'
import { buildReceiptNumber, type ReceiptData } from '@/lib/generateReceipt'

const PAYMENT_METHODS: Array<{ value: CalendrierVente['payment_method']; label: string }> = [
  { value: 'cash', label: 'Espèces' },
  { value: 'check', label: 'Chèque' },
  { value: 'card', label: 'Carte' },
  { value: 'transfer', label: 'Virement' },
  { value: 'other', label: 'Autre' },
]

export function CalendriersSaisieVentePage() {
  const { id: secteurId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentAssociation } = useAssociation()
  const { activeCampagne, loading: campLoading } = useCalendrierCampagnes()
  const { secteurs, loading: secLoading } = useCalendrierSecteurs(activeCampagne?.id)
  const { createVente } = useCalendrierVentes(activeCampagne?.id, secteurId)
  const { adresses, checkAddressAlreadyVisited, createAdresse } = useCalendrierAdresses(secteurId)
  const { amicalistes } = useAmicalistes()

  const secteur = useMemo(() => secteurs.find((s) => s.id === secteurId), [secteurs, secteurId])
  const equipiers = secteur?.calendrier_secteur_equipiers ?? []
  const rues = secteur?.calendrier_secteur_rues ?? []
  const stock = secteur?.calendrier_stocks
  const remainingStock = stock ? stock.allocated_qty - stock.used_qty - stock.returned_qty : null
  const unitPrice = Number(activeCampagne?.unit_price ?? 10)

  // Form state
  const [amicalisteId, setAmicalisteId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [amount, setAmount] = useState<number>(unitPrice)
  const [paymentMethod, setPaymentMethod] = useState<CalendrierVente['payment_method']>('cash')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [donorPhone, setDonorPhone] = useState('')
  const [streetName, setStreetName] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [building, setBuilding] = useState('')
  const [donorAddress, setDonorAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [saveAddress, setSaveAddress] = useState(true)

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  useEffect(() => {
    if (activeCampagne) setAmount(unitPrice * quantity)
  }, [unitPrice, quantity, activeCampagne])

  useEffect(() => {
    setAmicalisteId((prev) => {
      if (prev) return prev
      if (equipiers.length === 0) return ''
      const resp = equipiers.find((e) => e.role === 'responsable')
      return resp?.amicaliste_id ?? equipiers[0]?.amicaliste_id ?? ''
    })
  }, [equipiers])

  // Check duplicate on street + number change
  useEffect(() => {
    if (!secteurId || !streetName.trim()) {
      setDuplicateWarning(null)
      return
    }
    const timer = setTimeout(async () => {
      const existing = await checkAddressAlreadyVisited(
        secteurId,
        streetName,
        streetNumber.trim() || null
      )
      if (existing) {
        setDuplicateWarning(
          `⚠️ Cette adresse (${streetNumber} ${streetName}) a déjà été visitée (statut : ${existing.status}).`
        )
      } else {
        setDuplicateWarning(null)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [secteurId, streetName, streetNumber, checkAddressAlreadyVisited])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCampagne || !secteurId || !secteur) return
    setSaving(true)
    setError(null)
    try {
      let adresseId: string | null = null

      if (streetName.trim() && saveAddress) {
        // Trouver une adresse existante
        const existing = adresses.find(
          (a) =>
            a.street_name.toLowerCase().trim() === streetName.toLowerCase().trim() &&
            (a.number ?? '').trim() === (streetNumber.trim() || '') &&
            (a.building ?? '').trim() === (building.trim() || '')
        )
        if (existing) {
          adresseId = existing.id
        } else {
          try {
            const created = await createAdresse({
              secteur_id: secteurId,
              street_name: streetName.trim(),
              number: streetNumber.trim() || null,
              building: building.trim() || null,
            })
            adresseId = created.id
          } catch (err) {
            console.error('Erreur création adresse', err)
          }
        }
      }

      const fullAddress =
        donorAddress.trim() ||
        (streetName
          ? `${streetNumber ? streetNumber + ' ' : ''}${streetName}${
              building ? ' — Bât. ' + building : ''
            }`
          : null)

      const vente = await createVente({
        campagne_id: activeCampagne.id,
        secteur_id: secteurId,
        amicaliste_id: amicalisteId || null,
        adresse_id: adresseId,
        amount,
        quantity,
        payment_method: paymentMethod,
        donor_name: donorName.trim() || null,
        donor_email: donorEmail.trim() || null,
        donor_phone: donorPhone.trim() || null,
        donor_address: fullAddress,
        notes: notes.trim() || null,
      })

      // Préparation des données du reçu
      const vendor = amicalistes.find((a) => a.id === amicalisteId)
      const receipt: ReceiptData = {
        associationName: currentAssociation?.name ?? 'Amicale',
        associationCity: currentAssociation?.city ?? null,
        logoUrl: currentAssociation?.logo_url ?? null,
        receiptNumber: buildReceiptNumber(vente.id, vente.sale_date),
        saleDate: vente.sale_date,
        donorName: donorName.trim() || null,
        donorEmail: donorEmail.trim() || null,
        donorPhone: donorPhone.trim() || null,
        donorAddress: fullAddress,
        quantity,
        amount,
        unitPrice,
        paymentMethod,
        campagneName: activeCampagne.name,
        secteurName: secteur.name,
        amicalisteName: vendor ? `${vendor.first_name} ${vendor.last_name}` : null,
        notes: notes.trim() || null,
      }
      setReceiptData(receipt)
    } catch (err: any) {
      setError(err?.message ?? 'Erreur lors de la sauvegarde de la vente')
    }
    setSaving(false)
  }

  const handleCloseModal = () => {
    setReceiptData(null)
    navigate(`/calendriers/secteurs/${secteurId}`)
  }

  if (campLoading || secLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!secteur || !activeCampagne) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
        <p className="text-[var(--color-text-muted)]">Secteur ou campagne introuvable.</p>
      </div>
    )
  }

  const outOfStock = remainingStock !== null && remainingStock < quantity

  return (
    <>
    {receiptData && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-[var(--color-text)]">Vente enregistrée</h2>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Reçu n°{receiptData.receiptNumber}
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseModal}
              className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                Don enregistré
              </p>
              <p className="text-2xl font-bold text-green-700">
                {receiptData.amount.toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {receiptData.quantity} calendrier{receiptData.quantity > 1 ? 's' : ''}
                {receiptData.donorName ? ` • ${receiptData.donorName}` : ''}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                Envoyer le reçu au donateur
              </p>
              <ReceiptActions data={receiptData} />
              {!receiptData.donorEmail && !receiptData.donorPhone && (
                <p className="text-[11px] text-[var(--color-text-muted)] italic mt-2">
                  Saisissez un email ou un téléphone dans la fiche donateur pour pouvoir envoyer directement le reçu.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 p-5 border-t border-[var(--color-border)]">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-sm font-semibold transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={() => {
                setReceiptData(null)
                // Reset form pour saisir une nouvelle vente sans changer de page
                setDonorName('')
                setDonorEmail('')
                setDonorPhone('')
                setStreetName('')
                setStreetNumber('')
                setBuilding('')
                setDonorAddress('')
                setNotes('')
                setQuantity(1)
                setAmount(unitPrice)
              }}
              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
            >
              + Nouvelle vente
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Nouvelle vente</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Secteur <span className="font-semibold">{secteur.name}</span> — {activeCampagne.name}
          </p>
        </div>
      </div>

      {/* Stock info */}
      {stock && (
        <div
          className={`flex items-center gap-3 p-3 rounded-xl border ${
            outOfStock
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <Package className="w-5 h-5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold">
              Stock restant : {remainingStock} / {stock.allocated_qty} calendriers
            </p>
            {outOfStock && <p className="text-xs">Stock insuffisant pour cette quantité.</p>}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amicaliste + montant */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
            <Euro className="w-4 h-4 text-[var(--color-primary)]" /> Détails de la vente
          </h2>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              Vendeur (amicaliste) *
            </label>
            {equipiers.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg text-sm">
                Aucun équipier assigné à ce secteur.{' '}
                <button
                  type="button"
                  onClick={() => navigate(`/calendriers/secteurs/${secteurId}/editer`)}
                  className="underline font-semibold"
                >
                  Ajouter
                </button>
              </div>
            ) : (
              <select
                value={amicalisteId}
                onChange={(e) => setAmicalisteId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              >
                <option value="">— Sélectionner —</option>
                {equipiers.map((eq) => (
                  <option key={eq.id} value={eq.amicaliste_id}>
                    {eq.amicalistes?.first_name} {eq.amicalistes?.last_name}
                    {eq.role === 'responsable' ? ' ★' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Quantité *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                required
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Montant (€) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Paiement
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as CalendrierVente['payment_method'])}
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              >
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Adresse */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--color-primary)]" /> Adresse visitée (pointage)
          </h2>

          <div className="grid grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="N°"
              value={streetNumber}
              onChange={(e) => setStreetNumber(e.target.value)}
              className="col-span-1 px-2 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
            />
            {rues.length > 0 ? (
              <>
                <input
                  type="text"
                  placeholder="Rue"
                  value={streetName}
                  onChange={(e) => setStreetName(e.target.value)}
                  list="rues-list"
                  className="col-span-2 px-2 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
                />
                <datalist id="rues-list">
                  {rues.map((r) => (
                    <option key={r.id} value={r.name} />
                  ))}
                </datalist>
              </>
            ) : (
              <input
                type="text"
                placeholder="Rue"
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
                className="col-span-2 px-2 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            )}
            <input
              type="text"
              placeholder="Bât."
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="col-span-1 px-2 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
            />
          </div>

          {duplicateWarning && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {streetName && !duplicateWarning && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              Adresse non visitée.
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
            />
            Enregistrer cette adresse dans le pointage du secteur
          </label>
        </div>

        {/* Donateur */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm space-y-4">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
            <User className="w-4 h-4 text-[var(--color-primary)]" /> Donateur (optionnel)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Nom
              </label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                Email
              </label>
              <input
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

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
            disabled={saving || !amicalisteId || outOfStock}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer la vente'}
          </button>
        </div>
      </form>
    </div>
    </>
  )
}
