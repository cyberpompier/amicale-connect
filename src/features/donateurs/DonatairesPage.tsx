import { useMemo, useState } from 'react'
import { Plus, Search, Mail, Phone, MapPin, Trash2, Edit, Gift, Eye } from 'lucide-react'
import { useDonateurs, type Donateur } from '@/hooks/useDonateurs'
import { DonateurModal } from './DonateurModal'
import { DonateurDetailModal } from './DonateurDetailModal'

export function DonatairesPage() {
  const {
    donateurs,
    loading,
    createDonateur,
    updateDonateur,
    deleteDonateur,
    fetchDonsForDonateur,
  } = useDonateurs()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDonateur, setEditingDonateur] = useState<Donateur | null>(null)
  const [detailDonateur, setDetailDonateur] = useState<Donateur | null>(null)

  const filtered = useMemo(() => {
    if (!search) return donateurs
    const q = search.toLowerCase()
    return donateurs.filter(
      (d) =>
        `${d.prenom} ${d.nom}`.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.telephone?.includes(q) ||
        d.ville?.toLowerCase().includes(q)
    )
  }, [donateurs, search])

  const handleDelete = async (id: string, nom: string, prenom: string) => {
    if (!confirm(`Supprimer le donateur "${prenom} ${nom}" ?`)) return
    try {
      await deleteDonateur(id)
    } catch (err: any) {
      alert(err?.message ?? 'Erreur lors de la suppression')
    }
  }

  const handleAddNew = () => {
    setEditingDonateur(null)
    setIsModalOpen(true)
  }

  const handleEdit = (donateur: Donateur) => {
    setEditingDonateur(donateur)
    setIsModalOpen(true)
  }

  const handleSave = async (data: any) => {
    try {
      if (editingDonateur) {
        await updateDonateur(editingDonateur.id, data)
      } else {
        await createDonateur(data)
      }
      setIsModalOpen(false)
      setEditingDonateur(null)
    } catch (err: any) {
      alert(err?.message ?? 'Erreur lors de la sauvegarde')
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Donateurs</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Gérez vos donateurs pour les campagnes et événements
          </p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 transition"
        >
          <Plus className="w-5 h-5" />
          Ajouter un donateur
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-[var(--color-text-muted)]" />
        <input
          type="text"
          placeholder="Rechercher par nom, email, téléphone ou ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
          <Gift className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-[var(--color-text-muted)] font-medium">
            {donateurs.length === 0
              ? 'Aucun donateur ajouté. Créez votre premier donateur.'
              : 'Aucun donateur ne correspond à votre recherche.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-sm text-[var(--color-text)]">
                    Nom
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-sm text-[var(--color-text)]">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-sm text-[var(--color-text)]">
                    Téléphone
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-sm text-[var(--color-text)]">
                    Localisation
                  </th>
                  <th className="text-right px-6 py-3 font-semibold text-sm text-[var(--color-text)]">
                    Dons
                  </th>
                  <th className="text-right px-6 py-3 font-semibold text-sm text-[var(--color-text)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filtered.map((donateur) => {
                  const localisation = [donateur.adresse, donateur.ville]
                    .filter(Boolean)
                    .join(', ')
                  return (
                    <tr
                      key={donateur.id}
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => setDetailDonateur(donateur)}
                    >
                      {/* Nom */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-[var(--color-text)]">
                          {donateur.prenom} {donateur.nom}
                        </div>
                        {donateur.notes && (
                          <div className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-1">
                            {donateur.notes}
                          </div>
                        )}
                      </td>

                      {/* Email icon only */}
                      <td className="px-6 py-4 text-center">
                        {donateur.email ? (
                          <a
                            href={`mailto:${donateur.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-block text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                            title={donateur.email}
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Téléphone icon only */}
                      <td className="px-6 py-4 text-center">
                        {donateur.telephone ? (
                          <a
                            href={`tel:${donateur.telephone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-block text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                            title={donateur.telephone}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Localisation icon only */}
                      <td className="px-6 py-4 text-center">
                        {localisation ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`https://maps.google.com?q=${encodeURIComponent(localisation)}`, '_blank')
                            }}
                            className="inline-block text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                            title={localisation}
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Dons */}
                      <td className="px-6 py-4 text-right">
                        <div className="text-sm">
                          <div className="font-semibold text-[var(--color-text)]">
                            {Number(donateur.total_dons).toFixed(2)} €
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {donateur.nombre_dons || 0} don
                            {donateur.nombre_dons !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetailDonateur(donateur)
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg text-[var(--color-text-muted)] transition"
                            title="Voir la fiche"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(donateur)
                            }}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(donateur.id, donateur.nom, donateur.prenom)
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DonateurModal
        isOpen={isModalOpen}
        donateur={editingDonateur}
        onClose={() => {
          setIsModalOpen(false)
          setEditingDonateur(null)
        }}
        onSave={handleSave}
      />

      <DonateurDetailModal
        isOpen={!!detailDonateur}
        donateur={detailDonateur}
        onClose={() => setDetailDonateur(null)}
        fetchDons={fetchDonsForDonateur}
      />
    </div>
  )
}
