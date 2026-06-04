import { useState, type FormEvent } from 'react'
import { useBureauDriveLinks } from '@/hooks/useBureauDriveLinks'
import { Plus, Trash2, FolderOpen, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

export function BureauDrivePage() {
  const { links, loading, addLink, deleteLink } = useBureauDriveLinks()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ title: '', url: '', icon: '📄' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.url.trim()) return
    setSaving(true)
    try {
      await addLink({ title: formData.title, url: formData.url, icon: formData.icon, order: links.length })
      setFormData({ title: '', url: '', icon: '📄' })
      setShowForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce lien ?')) return
    try { await deleteLink(id) } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Drive"
        subtitle="Accès rapide aux documents du bureau"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un lien</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        }
      />

      {showForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 mb-5 shadow-[var(--shadow-sm)]">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input type="text" required placeholder="Titre du lien"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
              <input type="url" required placeholder="URL Google Drive"
                value={formData.url}
                onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
                className="sm:col-span-2 px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
              <input type="text" placeholder="Icône (emoji)" maxLength={2}
                value={formData.icon}
                onChange={(e) => setFormData((p) => ({ ...p, icon: e.target.value.slice(0, 2) }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {links.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun lien Drive</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">Ajoutez des liens vers vos documents Google Drive.</p>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            Ajouter le premier lien
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
              className="group bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm hover:shadow-md hover:border-[var(--color-primary)] transition-all">
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{link.icon}</span>
                <button
                  onClick={(e) => { e.preventDefault(); handleDelete(link.id) }}
                  className="p-1 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors truncate">
                {link.title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] mt-2 group-hover:text-[var(--color-primary)] transition-colors">
                Ouvrir <ExternalLink className="w-3 h-3" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
