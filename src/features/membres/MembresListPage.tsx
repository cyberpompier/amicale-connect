import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, Pencil, Trash2, Users, Download, FileJson, File, FileText } from 'lucide-react'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { useExportAmicalistes, EXPORT_COLUMNS, type ExportColumn } from '@/hooks/useExportAmicalistes'
import { useAssociation } from '@/features/association/AssociationContext'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'

const STATUS_STYLES: Record<string, string> = {
  actif: 'bg-green-100 text-green-700',
  inactif: 'bg-gray-100 text-gray-600',
}

export function MembresListPage() {
  const { amicalistes, loading, deleteAmicaliste } = useAmicalistes()
  const { exportToCSV, exportToExcel, exportToPDF } = useExportAmicalistes()
  const { currentAssociation } = useAssociation()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string>('all')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<ExportColumn[]>([
    'nom', 'prenom', 'email', 'telephone', 'grade', 'statut', 'adhesion'
  ])
  const navigate = useNavigate()

  const allColumns: ExportColumn[] = [
    'photo', 'nom', 'prenom', 'email', 'telephone', 'grade', 'statut', 'adhesion', 'naissance', 'adresse', 'etat_civil', 'notes'
  ]

  const toggleColumn = (col: ExportColumn) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }

  const setAllColumns = () => {
    setSelectedColumns(allColumns)
  }

  const clearAllColumns = () => {
    setSelectedColumns([])
  }

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

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (selectedColumns.length === 0) {
      alert('Sélectionnez au moins une colonne')
      return
    }
    setExporting(true)
    try {
      const status = exportStatus === 'all' ? undefined : exportStatus
      if (format === 'csv') {
        exportToCSV(amicalistes, selectedColumns, status)
      } else if (format === 'xlsx') {
        await exportToExcel(amicalistes, selectedColumns, status)
      } else if (format === 'pdf') {
        await exportToPDF(amicalistes, selectedColumns, status)
      }
      setShowExportMenu(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'export')
    }
    setExporting(false)
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
        title={currentAssociation?.name || 'Amicalistes'}
        subtitle={`${amicalistes.length} membre${amicalistes.length !== 1 ? 's' : ''} inscrit${amicalistes.length !== 1 ? 's' : ''}`}
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
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting}
                className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exporter</span>
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-80 bg-white rounded-lg border border-[var(--color-border)] shadow-lg z-10 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-[var(--color-border)] sticky top-0 bg-white">
                    <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase">Statut à exporter</label>
                    <select
                      value={exportStatus}
                      onChange={(e) => setExportStatus(e.target.value)}
                      className="w-full px-2 py-1 border border-[var(--color-border)] rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                    >
                      <option value="all">Tous les statuts</option>
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 border-b border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Colonnes</label>
                      <div className="flex gap-1">
                        <button
                          onClick={setAllColumns}
                          className="px-2 py-0.5 text-xs text-[var(--color-primary)] hover:bg-blue-50 rounded transition-colors"
                        >
                          Tout
                        </button>
                        <button
                          onClick={clearAllColumns}
                          className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          Rien
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {allColumns.map((col) => (
                        <label key={col} className="flex items-center gap-2 p-1.5 hover:bg-[var(--color-bg-secondary)] rounded cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(col)}
                            onChange={() => toggleColumn(col)}
                            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/25"
                          />
                          <span className="text-[var(--color-text-muted)]">{EXPORT_COLUMNS[col]}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleExport('xlsx')}
                    disabled={exporting || selectedColumns.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
                  >
                    <FileJson className="w-4 h-4" />
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={exporting || selectedColumns.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    CSV (.csv)
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={exporting || selectedColumns.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50 border-t border-[var(--color-border)]"
                  >
                    <File className="w-4 h-4" />
                    PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
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
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden sm:table-cell">Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden lg:table-cell">Téléphone</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden sm:table-cell">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide hidden md:table-cell">Depuis</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/membres/${m.id}`)}
                          className="flex justify-center focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded-lg transition-all"
                        >
                          {m.avatar_url ? (
                            <img
                              src={m.avatar_url}
                              alt={`${m.first_name} ${m.last_name}`}
                              className="w-10 h-10 rounded-lg object-cover mx-auto hover:shadow-md hover:scale-110 transition-all cursor-pointer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center mx-auto hover:shadow-md hover:scale-110 transition-all cursor-pointer">
                              <span className="text-xs font-bold text-[var(--color-primary)]">
                                {m.first_name[0]}{m.last_name[0]}
                              </span>
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--color-text)]">
                        {m.last_name} {m.first_name}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] hidden sm:table-cell">{m.grade || '—'}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] hidden md:table-cell">{m.email || '—'}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] hidden lg:table-cell">{m.phone || '—'}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
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
                            className="hidden sm:block p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
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
