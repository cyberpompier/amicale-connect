import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, Pencil, Trash2, Users } from 'lucide-react'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

const STATUS_STYLES: Record<string, string> = {
  actif: 'bg-green-100 text-green-700',
  inactif: 'bg-gray-100 text-gray-600',
}

export function MembresListPage() {
  const { amicalistes, loading, deleteAmicaliste } = useAmicalistes()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const navigate = useNavigate()

  const filtered = amicalistes.filter((m) => {
    const matchSearch =
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
      (m.grade && m.grade.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = filterStatus === 'all' || m.status === filterStatus
    return matchSearch && matchStatus
  })

  const statuses = [...new Set(amicalistes.map((m) => m.status))]

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return
    setDeletingId(id)
    try {
      await deleteAmicaliste(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setDeletingId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Amicalistes"
        subtitle={`${amicalistes.length} membre${amicalistes.length !== 1 ? 's' : ''} au total`}
        action={
          <button
            onClick={() => navigate('/membres/ajouter')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un membre</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        }
      />

      {amicalistes.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun membre</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            Commencez par ajouter les membres de votre amicale.
          </p>
          <button
            onClick={() => navigate('/membres/ajouter')}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Ajouter le premier membre
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
            >
              <option value="all">Tous les statuts</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </p>

          <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-sm)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                    <th className="text-center px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide w-12">Photo</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Nom</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden lg:table-cell">Téléphone</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden md:table-cell">Depuis</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                      <td className="px-4 py-3 text-center">
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt={`${m.first_name} ${m.last_name}`}
                            className="w-10 h-10 rounded-lg object-cover mx-auto"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center mx-auto">
                            <span className="text-xs font-bold text-[var(--color-primary)]">
                              {m.first_name[0]}{m.last_name[0]}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                        {m.last_name} {m.first_name}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{m.grade || '—'}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] hidden md:table-cell">{m.email || '—'}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] hidden lg:table-cell">{m.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[m.status] || 'bg-amber-100 text-amber-700'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] hidden md:table-cell">{formatDate(m.join_date)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => navigate(`/membres/editer/${m.id}`)}
                            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id, `${m.first_name} ${m.last_name}`)}
                            disabled={deletingId === m.id}
                            className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
