import { useState, type FormEvent } from 'react'
import { Plus, Trash2, Eye, Filter } from 'lucide-react'
import { useBureauDocuments, type BureauDocument } from '@/hooks/useBureauDocuments'
import { cn, formatDateShort } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { DocumentViewer } from '@/components/DocumentViewer'

export function BureauDocumentsPage() {
  const { documents, loading, DOCUMENT_TYPES, addDocument, deleteDocument } = useBureauDocuments()
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [saving, setSaving] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<BureauDocument | null>(null)
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    type: 'pv' as const,
    date_document: new Date().toISOString().split('T')[0],
    url: '',
    icone: '📋',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.titre.trim() || !formData.url.trim()) return

    setSaving(true)
    try {
      await addDocument({
        titre: formData.titre,
        description: formData.description || null,
        type: formData.type,
        date_document: formData.date_document,
        url: formData.url,
        icone: formData.icone,
        order: documents.length,
      })
      setFormData({
        titre: '',
        description: '',
        type: 'pv',
        date_document: new Date().toISOString().split('T')[0],
        url: '',
        icone: '📋',
      })
      setShowForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce document ?')) return
    try {
      await deleteDocument(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const filteredDocuments = selectedType === 'all'
    ? documents
    : documents.filter((d) => d.type === selectedType)

  const groupedByType = filteredDocuments.reduce(
    (acc, doc) => {
      if (!acc[doc.type]) acc[doc.type] = []
      acc[doc.type].push(doc)
      return acc
    },
    {} as Record<string, BureauDocument[]>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents & Procédures"
        subtitle={`${documents.length} document${documents.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un document</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        }
      />

      {/* Formulaire d'ajout */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-[var(--shadow-sm)]">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4 uppercase tracking-wide">Ajouter un nouveau document</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Titre du document *"
                value={formData.titre}
                onChange={(e) => setFormData((p) => ({ ...p, titre: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
              <select
                value={formData.type}
                onChange={(e) => {
                  const type = e.target.value as any
                  const icon = DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES]?.icon || '📄'
                  setFormData((p) => ({ ...p, type, icone: icon }))
                }}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              >
                {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <textarea
              placeholder="Description (optionnel)"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] resize-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="date"
                value={formData.date_document}
                onChange={(e) => setFormData((p) => ({ ...p, date_document: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
              <input
                type="text"
                placeholder="Icône (emoji)"
                maxLength={2}
                value={formData.icone}
                onChange={(e) => setFormData((p) => ({ ...p, icone: e.target.value.slice(0, 2) }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
              />
            </div>

            <input
              type="url"
              required
              placeholder="URL du document (Google Drive, PDF, etc.) *"
              value={formData.url}
              onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filtres */}
      {documents.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
          <button
            onClick={() => setSelectedType('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
              selectedType === 'all'
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:bg-[var(--color-border)]'
            )}
          >
            Tous
          </button>
          {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                selectedType === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text)] hover:bg-[var(--color-border)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Documents vides */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="text-4xl mb-3">📄</div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun document</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">Commencez par ajouter les PV et autres documents du bureau.</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Ajouter le premier document
          </button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-12 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[var(--color-text-muted)] text-sm">Aucun document de ce type</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByType).map(([type, docs]) => {
            const typeInfo = DOCUMENT_TYPES[type as keyof typeof DOCUMENT_TYPES]
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <h2 className={cn('text-lg font-bold px-3 py-1 rounded', typeInfo.color)}>
                    {typeInfo.label}
                  </h2>
                  <span className="text-xs text-[var(--color-text-muted)] font-semibold">({docs.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)] transition-shadow overflow-hidden group"
                    >
                      {/* En-tête coloré */}
                      <div className={cn('h-2', {
                        'bg-blue-500': doc.type === 'pv',
                        'bg-purple-500': doc.type === 'statuts',
                        'bg-green-500': doc.type === 'reglement',
                        'bg-amber-500': doc.type === 'procedure',
                        'bg-gray-500': doc.type === 'autre',
                      })} />

                      <div className="p-5">
                        {/* Icône et titre */}
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-3xl flex-shrink-0">{doc.icone}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[var(--color-text)] line-clamp-2 text-sm">
                              {doc.titre}
                            </h3>
                            <p className="text-xs text-[var(--color-text-muted)] mt-1">
                              {formatDateShort(doc.date_document)}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        {doc.description && (
                          <p className="text-xs text-[var(--color-text-muted)] mb-4 line-clamp-2 leading-relaxed">
                            {doc.description}
                          </p>
                        )}

                        {/* Boutons d'action */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDocument(doc)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Consulter
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-2 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          document={{
            titre: selectedDocument.titre,
            url: selectedDocument.url,
            type: selectedDocument.type,
          }}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  )
}
