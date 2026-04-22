import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, ChevronRight } from 'lucide-react'
import { useBoutiqueCommandes, type Commande } from '@/hooks/useBoutiqueCommandes'
import { formatDateShort } from '@/lib/utils'

const STATUS_CONFIG: Record<Commande['status'], { label: string; class: string }> = {
  pending: { label: 'En attente', class: 'bg-amber-100 text-amber-700' },
  processing: { label: 'En cours', class: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Expédié', class: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Livré', class: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulé', class: 'bg-gray-100 text-gray-500' },
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: 'En attente', class: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Payé', class: 'bg-green-50 text-green-700' },
  failed: { label: 'Échoué', class: 'bg-red-50 text-red-700' },
}

export function BoutiqueGestionCommandesAdminPage() {
  const navigate = useNavigate()
  const { allCommandes, loading, updateStatus, markAsPaid } = useBoutiqueCommandes()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<Commande['status'] | 'all'>('all')
  const [filterPayment, setFilterPayment] = useState<'all' | 'pending' | 'completed' | 'failed'>('all')

  const STATUS_NEXT: Record<string, Commande['status'][]> = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  }

  const filteredCommandes = useMemo(() => {
    return allCommandes.filter((c) => {
      const matchesSearch =
        c.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = filterStatus === 'all' || c.status === filterStatus
      const matchesPayment = filterPayment === 'all' || c.payment_status === filterPayment

      return matchesSearch && matchesStatus && matchesPayment
    })
  }, [allCommandes, searchTerm, filterStatus, filterPayment])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Gestion des commandes</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Suivi et administration de toutes les commandes</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['pending', 'processing', 'shipped', 'delivered'] as const).map((status) => {
          const count = allCommandes.filter((c) => c.status === status).length
          const config = STATUS_CONFIG[status]
          return (
            <div key={status} className="bg-white rounded-lg border border-[var(--color-border)] p-3 shadow-sm">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{config.label}</p>
              <p className="text-2xl font-bold text-[var(--color-text)] mt-1">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm mb-6">
        <div className="flex flex-col gap-4">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Chercher par nom, email ou numéro de commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                <Filter className="w-3 h-3 inline mr-1" />
                Statut
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <option key={status} value={status}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">Paiement</label>
              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="all">Tous les paiements</option>
                <option value="pending">En attente</option>
                <option value="completed">Payé</option>
                <option value="failed">Échoué</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des commandes */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
          <h2 className="font-semibold text-[var(--color-text)] text-sm">
            Commandes ({filteredCommandes.length})
          </h2>
        </div>

        {filteredCommandes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              {searchTerm || filterStatus !== 'all' || filterPayment !== 'all'
                ? 'Aucune commande ne correspond à vos critères'
                : 'Aucune commande'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filteredCommandes.map((commande) => {
              const status = STATUS_CONFIG[commande.status]
              const paymentStatus = PAYMENT_STATUS_CONFIG[commande.payment_status]
              const nextStatuses = STATUS_NEXT[commande.status]

              return (
                <div key={commande.id} className="px-5 py-4 hover:bg-[var(--color-background)] transition-colors">
                  {/* En-tête : ID, statuts */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-background)] px-2 py-1 rounded">
                        #{commande.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${status.class}`}>
                        {status.label}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${paymentStatus.class}`}>
                        {paymentStatus.label}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/boutique/commandes/${commande.id}`)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors"
                    >
                      Détails
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Infos client */}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{commande.user_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{commande.user_email}</p>
                    {commande.user_phone && (
                      <p className="text-xs text-[var(--color-text-muted)]">{commande.user_phone}</p>
                    )}
                  </div>

                  {/* Infos commande */}
                  <div className="flex flex-wrap gap-4 mb-3 text-sm text-[var(--color-text-muted)]">
                    <span>Montant: <strong className="text-[var(--color-text)]">{commande.total_amount.toFixed(2)} €</strong></span>
                    <span>Date: <strong className="text-[var(--color-text)]">{formatDateShort(commande.created_at)}</strong></span>
                    <span>
                      Paiement:{' '}
                      <strong className="text-[var(--color-text)]">
                        {commande.payment_method === 'stripe' ? 'Stripe' : 'Manuel'}
                      </strong>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {commande.payment_status === 'pending' && commande.payment_method === 'manual' && (
                      <button
                        onClick={() => markAsPaid(commande.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        ✓ Marquer payé
                      </button>
                    )}
                    {nextStatuses.length > 0 && (
                      <div className="flex gap-2">
                        {nextStatuses.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(commande.id, s)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${STATUS_CONFIG[s].class} hover:opacity-80`}
                          >
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
