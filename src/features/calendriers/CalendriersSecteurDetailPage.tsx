import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Users,
  Plus,
  Package,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Home,
  Edit,
  Trash2,
  Circle,
  Clock,
  RotateCcw,
  X,
} from 'lucide-react'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierSecteurs } from '@/hooks/useCalendrierSecteurs'
import { useCalendrierVentes } from '@/hooks/useCalendrierVentes'
import { useCalendrierAdresses, type CalendrierAdresse } from '@/hooks/useCalendrierAdresses'
import { useAssociation } from '@/features/association/AssociationContext'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { ReceiptActions } from './ReceiptActions'
import { buildReceiptNumber, type ReceiptData } from '@/lib/generateReceipt'

const STATUS_ADRESSE_CONFIG: Record<
  CalendrierAdresse['status'],
  { label: string; icon: any; class: string; dot: string }
> = {
  todo: { label: 'À faire', icon: Circle, class: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  done: { label: 'Visitée', icon: CheckCircle2, class: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  absent: { label: 'Absent', icon: Clock, class: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  refuse: { label: 'Refus', icon: XCircle, class: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  skip: { label: 'Sauter', icon: MinusCircle, class: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
}

export function CalendriersSecteurDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentAssociation } = useAssociation()
  const { activeCampagne } = useCalendrierCampagnes()
  const { secteurs, loading: secLoading, updateStatus: updateSecteurStatus } = useCalendrierSecteurs(activeCampagne?.id)
  const { ventes, loading: ventesLoading } = useCalendrierVentes(activeCampagne?.id, id)
  const {
    adresses,
    loading: adrLoading,
    doneCount,
    todoCount,
    totalCount,
    createAdresse,
    updateStatus: updateAdresseStatus,
    deleteAdresse,
  } = useCalendrierAdresses(id)

  const secteur = useMemo(() => secteurs.find((s) => s.id === id), [secteurs, id])

  const [adresseStreet, setAdresseStreet] = useState('')
  const [adresseNumber, setAdresseNumber] = useState('')
  const [adresseBuilding, setAdresseBuilding] = useState('')
  const [adding, setAdding] = useState(false)
  const [selectedVenteId, setSelectedVenteId] = useState<string | null>(null)

  const handleAddAdresse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !adresseStreet.trim()) return
    setAdding(true)
    try {
      await createAdresse({
        secteur_id: id,
        street_name: adresseStreet.trim(),
        number: adresseNumber.trim() || null,
        building: adresseBuilding.trim() || null,
      })
      setAdresseStreet('')
      setAdresseNumber('')
      setAdresseBuilding('')
    } catch (err: any) {
      alert(err?.message ?? 'Erreur lors de l\'ajout')
    }
    setAdding(false)
  }

  const handleDeleteAdresse = async (adrId: string) => {
    if (!confirm('Supprimer cette adresse ?')) return
    try {
      await deleteAdresse(adrId)
    } catch (err: any) {
      alert(err?.message ?? 'Erreur')
    }
  }

  const stock = secteur?.calendrier_stocks
  const totalCollected = secteur?.total_collected ?? 0
  const totalSold = secteur?.total_calendriers_sold ?? 0
  const progression = secteur?.progression_percent ?? 0
  const remainingStock = stock ? stock.allocated_qty - stock.used_qty - stock.returned_qty : null

  // Group adresses by rue
  const adressesByRue = useMemo(() => {
    const map = new Map<string, CalendrierAdresse[]>()
    adresses.forEach((a) => {
      if (!map.has(a.street_name)) map.set(a.street_name, [])
      map.get(a.street_name)!.push(a)
    })
    return map
  }, [adresses])

  if (secLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!secteur) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
        <p className="text-[var(--color-text-muted)]">Secteur introuvable.</p>
        <button
          onClick={() => navigate('/calendriers/secteurs')}
          className="mt-4 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold"
        >
          Retour aux secteurs
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--color-text)] truncate">{secteur.name}</h1>
            {secteur.description && (
              <p className="text-sm text-[var(--color-text-muted)] truncate">{secteur.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            to={`/calendriers/secteurs/${secteur.id}/editer`}
            className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-sm font-semibold transition-colors"
          >
            <Edit className="w-4 h-4" /> Éditer
          </Link>
          <Link
            to={`/calendriers/secteurs/${secteur.id}/vente`}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Saisir un don
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Collecté</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalCollected)}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            Objectif {formatCurrency(Number(secteur.objective_amount))}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-blue-600" />
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Vendus</p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{totalSold}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            Objectif {secteur.objective_calendriers}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-4 h-4 text-purple-600" />
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Adresses</p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {doneCount}
            <span className="text-xs text-[var(--color-text-muted)] font-normal"> / {totalCount}</span>
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{todoCount} restantes</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Stock</p>
          <p className="text-2xl font-bold text-[var(--color-text)]">
            {remainingStock ?? '—'}
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            {stock ? `${stock.used_qty} utilisés / ${stock.allocated_qty}` : 'Aucun stock alloué'}
          </p>
        </div>
      </div>

      {/* Progression bar */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
            Progression du secteur
          </p>
          <span className="text-sm font-bold text-[var(--color-primary)]">{progression.toFixed(0)}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-primary)] to-orange-500 rounded-full transition-all duration-500"
            style={{ width: `${progression}%` }}
          />
        </div>
        {secteur.status !== 'done' ? (
          <button
            onClick={() => updateSecteurStatus(secteur.id, 'done')}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Marquer comme terminé
          </button>
        ) : (
          <button
            onClick={() => updateSecteurStatus(secteur.id, 'in_progress')}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[var(--color-text)] bg-white hover:bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Repasser en cours
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adresses / pointage */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
              <Home className="w-4 h-4 text-[var(--color-primary)]" /> Pointage des adresses
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Suivez les adresses visitées pour éviter les doublons.
            </p>
          </div>

          {/* Add form */}
          <form onSubmit={handleAddAdresse} className="p-4 border-b border-[var(--color-border)] space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="N°"
                value={adresseNumber}
                onChange={(e) => setAdresseNumber(e.target.value)}
                className="col-span-1 px-2 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
              <input
                type="text"
                placeholder="Rue*"
                value={adresseStreet}
                onChange={(e) => setAdresseStreet(e.target.value)}
                required
                className="col-span-2 px-2 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
              <input
                type="text"
                placeholder="Bât."
                value={adresseBuilding}
                onChange={(e) => setAdresseBuilding(e.target.value)}
                className="col-span-1 px-2 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !adresseStreet.trim()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Ajouter l'adresse
            </button>
          </form>

          {/* Liste */}
          <div className="max-h-[500px] overflow-y-auto">
            {adrLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin w-6 h-6 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
              </div>
            ) : adresses.length === 0 ? (
              <p className="text-center text-xs text-[var(--color-text-muted)] py-10 italic">
                Aucune adresse enregistrée.
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {Array.from(adressesByRue.entries()).map(([rue, adrs]) => (
                  <div key={rue} className="p-4">
                    <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                      <MapPin className="w-3 h-3 inline-block mr-1" />
                      {rue} ({adrs.length})
                    </p>
                    <ul className="space-y-1">
                      {adrs.map((a) => {
                        const cfg = STATUS_ADRESSE_CONFIG[a.status]
                        return (
                          <li
                            key={a.id}
                            className="flex items-center gap-2 p-2 bg-[var(--color-bg-secondary)] rounded-lg"
                          >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[var(--color-text)]">
                                {a.number ? `${a.number} ` : ''}
                                {a.building ? `— Bât. ${a.building}` : ''}
                                {!a.number && !a.building && 'Sans numéro'}
                              </p>
                              {a.visited_at && (
                                <p className="text-[10px] text-[var(--color-text-muted)]">
                                  Visitée le {formatDateShort(a.visited_at)}
                                </p>
                              )}
                            </div>
                            <select
                              value={a.status}
                              onChange={(e) =>
                                updateAdresseStatus(a.id, e.target.value as CalendrierAdresse['status'])
                              }
                              className={`text-[10px] font-bold uppercase rounded-md px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 ${cfg.class}`}
                            >
                              {(Object.keys(STATUS_ADRESSE_CONFIG) as CalendrierAdresse['status'][]).map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_ADRESSE_CONFIG[s].label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDeleteAdresse(a.id)}
                              className="p-1 text-red-400 hover:text-red-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Équipe + Ventes */}
        <div className="space-y-6">
          {/* Équipe */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
            <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
              <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
                <Users className="w-4 h-4 text-[var(--color-primary)]" />
                Équipe ({secteur.calendrier_secteur_equipiers?.length ?? 0})
              </h2>
              <Link
                to={`/calendriers/secteurs/${secteur.id}/editer`}
                className="text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
              >
                + Gérer
              </Link>
            </div>
            <div className="p-4">
              {secteur.calendrier_secteur_equipiers && secteur.calendrier_secteur_equipiers.length > 0 ? (
                <div className="space-y-2">
                  {secteur.calendrier_secteur_equipiers.map((eq) => (
                    <div
                      key={eq.id}
                      className="flex items-center gap-3 p-2 bg-[var(--color-bg-secondary)] rounded-lg"
                    >
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-sm font-bold">
                        {eq.amicalistes?.first_name?.[0]}
                        {eq.amicalistes?.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text)]">
                          {eq.amicalistes?.first_name} {eq.amicalistes?.last_name}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          {eq.role === 'responsable' ? '★ Responsable' : 'Équipier'}
                          {eq.amicalistes?.grade ? ` • ${eq.amicalistes.grade}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)] italic text-center py-4">
                  Aucun équipier assigné.
                </p>
              )}
            </div>
          </div>

          {/* Dernières ventes */}
          <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
            <div className="p-4 border-b border-[var(--color-border)]">
              <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--color-primary)]" />
                Ventes du secteur ({ventes.length})
              </h2>
            </div>
            {ventesLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin w-6 h-6 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
              </div>
            ) : ventes.length === 0 ? (
              <p className="text-center text-xs text-[var(--color-text-muted)] py-10 italic">
                Aucune vente enregistrée.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)] max-h-[500px] overflow-y-auto">
                {ventes.map((v) => {
                  const receipt: ReceiptData = {
                    associationName: currentAssociation?.name ?? 'Amicale',
                    associationCity: currentAssociation?.city ?? null,
                    logoUrl: currentAssociation?.logo_url ?? null,
                    receiptNumber: buildReceiptNumber(v.id, v.sale_date),
                    saleDate: v.sale_date,
                    donorName: v.donor_name,
                    donorEmail: v.donor_email,
                    donorPhone: v.donor_phone,
                    donorAddress:
                      v.donor_address ??
                      (v.calendrier_adresses
                        ? `${v.calendrier_adresses.number ?? ''} ${v.calendrier_adresses.street_name}`
                        : null),
                    quantity: v.quantity,
                    amount: Number(v.amount),
                    unitPrice: Number(activeCampagne?.unit_price ?? 10),
                    paymentMethod: v.payment_method,
                    campagneName: activeCampagne?.name ?? '',
                    secteurName: secteur?.name ?? '',
                    amicalisteName: v.amicalistes
                      ? `${v.amicalistes.first_name} ${v.amicalistes.last_name}`
                      : null,
                    notes: v.notes,
                  }
                  return (
                    <li
                      key={v.id}
                      onClick={() => setSelectedVenteId(v.id)}
                      className="p-3 space-y-2 cursor-pointer hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            {v.donor_name || 'Don anonyme'}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)]">
                            {formatDateShort(v.sale_date)}
                            {v.amicalistes
                              ? ` • par ${v.amicalistes.first_name} ${v.amicalistes.last_name}`
                              : ''}
                            {v.calendrier_adresses
                              ? ` • ${v.calendrier_adresses.number ?? ''} ${v.calendrier_adresses.street_name}`
                              : ''}
                          </p>
                          {(v.donor_email || v.donor_phone) && (
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                              {v.donor_email ? `✉ ${v.donor_email}` : ''}
                              {v.donor_email && v.donor_phone ? ' • ' : ''}
                              {v.donor_phone ? `☎ ${v.donor_phone}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-green-600">
                            {formatCurrency(Number(v.amount))}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)]">
                            {v.quantity} cal.
                          </p>
                        </div>
                      </div>
                      <ReceiptActions data={receipt} variant="compact" />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Ticket de vente détaillé */}
      {selectedVenteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Détail du ticket de vente</h3>
              <button
                onClick={() => setSelectedVenteId(null)}
                className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-muted)]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {(() => {
                const vente = ventes.find((v) => v.id === selectedVenteId)
                if (!vente) return null

                const receipt: ReceiptData = {
                  associationName: currentAssociation?.name ?? 'Amicale',
                  associationCity: currentAssociation?.city ?? null,
                  logoUrl: currentAssociation?.logo_url ?? null,
                  receiptNumber: buildReceiptNumber(vente.id, vente.sale_date),
                  saleDate: vente.sale_date,
                  donorName: vente.donor_name,
                  donorEmail: vente.donor_email,
                  donorPhone: vente.donor_phone,
                  donorAddress:
                    vente.donor_address ??
                    (vente.calendrier_adresses
                      ? `${vente.calendrier_adresses.number ?? ''} ${vente.calendrier_adresses.street_name}`
                      : null),
                  quantity: vente.quantity,
                  amount: Number(vente.amount),
                  unitPrice: Number(activeCampagne?.unit_price ?? 10),
                  paymentMethod: vente.payment_method,
                  campagneName: activeCampagne?.name ?? '',
                  secteurName: secteur?.name ?? '',
                  amicalisteName: vente.amicalistes
                    ? `${vente.amicalistes.first_name} ${vente.amicalistes.last_name}`
                    : null,
                  notes: vente.notes,
                }

                return (
                  <div className="space-y-6">
                    {/* Receipt Preview */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">
                        Aperçu du ticket
                      </h4>
                      <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-[var(--color-border)]">
                        {/* Donation details */}
                        <div className="space-y-3 text-center">
                          <p className="text-sm font-semibold text-[var(--color-text)]">
                            Ticket n° {buildReceiptNumber(vente.id, vente.sale_date)}
                          </p>
                          <p className="text-[13px] text-[var(--color-text-muted)]">
                            {new Date(vente.sale_date).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <div className="h-px bg-[var(--color-border)] my-3" />
                          <p className="text-[11px] text-[var(--color-text-muted)]">
                            <strong>Donataire :</strong> {vente.donor_name || 'Don anonyme'}
                          </p>
                          {vente.donor_address && (
                            <p className="text-[11px] text-[var(--color-text-muted)]">
                              {vente.donor_address}
                            </p>
                          )}
                          <div className="h-px bg-[var(--color-border)] my-3" />
                          <div className="flex justify-between text-sm">
                            <span className="text-[var(--color-text)]">{vente.quantity} × {activeCampagne?.name}</span>
                            <span className="font-bold text-green-600">{formatCurrency(Number(vente.amount))}</span>
                          </div>
                          {vente.notes && (
                            <p className="text-[10px] text-[var(--color-text-muted)] italic mt-3">
                              {vente.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">
                        Partager ou télécharger
                      </h4>
                      <ReceiptActions data={receipt} variant="inline" />
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">
                        Informations
                      </h4>
                      <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 space-y-2 text-sm">
                        {vente.amicalistes && (
                          <p>
                            <strong className="text-[var(--color-text)]">Collecteur :</strong>{' '}
                            <span className="text-[var(--color-text-muted)]">
                              {vente.amicalistes.first_name} {vente.amicalistes.last_name}
                            </span>
                          </p>
                        )}
                        <p>
                          <strong className="text-[var(--color-text)]">Secteur :</strong>{' '}
                          <span className="text-[var(--color-text-muted)]">{secteur?.name}</span>
                        </p>
                        <p>
                          <strong className="text-[var(--color-text)]">Campagne :</strong>{' '}
                          <span className="text-[var(--color-text-muted)]">{activeCampagne?.name}</span>
                        </p>
                        {vente.donor_email && (
                          <p>
                            <strong className="text-[var(--color-text)]">Email :</strong>{' '}
                            <span className="text-[var(--color-text-muted)]">{vente.donor_email}</span>
                          </p>
                        )}
                        {vente.donor_phone && (
                          <p>
                            <strong className="text-[var(--color-text)]">Téléphone :</strong>{' '}
                            <span className="text-[var(--color-text-muted)]">{vente.donor_phone}</span>
                          </p>
                        )}
                        <p>
                          <strong className="text-[var(--color-text)]">Mode de paiement :</strong>{' '}
                          <span className="text-[var(--color-text-muted)]">
                            {vente.payment_method === 'cash'
                              ? 'Espèces'
                              : vente.payment_method === 'check'
                                ? 'Chèque'
                                : vente.payment_method === 'transfer'
                                  ? 'Virement'
                                  : 'Autre'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
