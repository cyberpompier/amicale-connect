import { useState } from 'react'
import { X, Download, ExternalLink, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

interface DocumentViewerProps {
  document: {
    titre: string
    url: string
    type: string
  }
  onClose: () => void
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [scale, setScale] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const isPDF = document.url.toLowerCase().endsWith('.pdf')
  const isGoogleDrive = document.url.includes('drive.google.com') || document.url.includes('docs.google.com')
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(document.url)

  const getGoogleDriveEmbedUrl = (url: string) => {
    // Extract file ID from Google Drive URL
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
    }
    return url
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full h-screen max-h-[90vh] max-w-5xl flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-lg font-semibold text-[var(--color-text)] truncate">{document.titre}</h2>
          <div className="flex items-center gap-2">
            {!isGoogleDrive && !isImage && (
              <>
                <button
                  onClick={() => setScale(Math.max(0.5, scale - 0.2))}
                  className="p-2 hover:bg-[var(--color-bg-secondary)] rounded transition-colors"
                  title="Dézoomer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-[var(--color-text-muted)] w-12 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(Math.min(2, scale + 0.2))}
                  className="p-2 hover:bg-[var(--color-bg-secondary)] rounded transition-colors"
                  title="Zoomer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-[var(--color-bg-secondary)] rounded transition-colors"
              title="Ouvrir dans nouvel onglet"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={document.url}
              download
              className="p-2 hover:bg-[var(--color-bg-secondary)] rounded transition-colors"
              title="Télécharger"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--color-bg-secondary)] rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center">
          {isGoogleDrive ? (
            // Google Drive / Google Docs
            <iframe
              src={getGoogleDriveEmbedUrl(document.url)}
              className="w-full h-full border-0"
              title={document.titre}
              onLoad={() => setLoading(false)}
            />
          ) : isImage ? (
            // Images
            <div className="flex items-center justify-center p-4">
              <img
                src={document.url}
                alt={document.titre}
                className="max-w-full max-h-full object-contain"
                style={{ transform: `scale(${scale})` }}
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : isPDF ? (
            // PDF
            <div className="w-full h-full flex flex-col items-center justify-center">
              <iframe
                src={`${document.url}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0"
                title={document.titre}
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : (
            // Autres fichiers - iframe générique
            <div className="w-full h-full flex flex-col items-center justify-center p-8">
              <div className="text-center space-y-4">
                <div className="text-5xl">📄</div>
                <h3 className="text-lg font-semibold text-[var(--color-text)]">
                  Aperçu non disponible
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] max-w-sm">
                  Ce type de fichier ne peut pas être prévisualisé directement.
                  Cliquez sur "Ouvrir" ou "Télécharger" pour y accéder.
                </p>
                <div className="flex gap-2 justify-center pt-4">
                  <a
                    href={document.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Ouvrir dans nouvel onglet
                  </a>
                  <a
                    href={document.url}
                    download
                    className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] text-sm font-semibold rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    Télécharger
                  </a>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
                <p className="text-sm text-[var(--color-text-muted)]">Chargement du document...</p>
              </div>
            </div>
          )}
        </div>

        {/* Contrôles de pagination (pour PDF seulement) */}
        {isPDF && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-[var(--color-text-muted)]">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
