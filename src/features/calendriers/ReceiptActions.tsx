import { useState } from 'react'
import { Download, Mail, MessageCircle, Share2, FileText, Check, Loader2 } from 'lucide-react'
import {
  downloadReceiptPDF,
  buildEmailMailto,
  buildWhatsAppUrl,
  buildSmsUrl,
  getReceiptBlob,
  type ReceiptData,
} from '@/lib/generateReceipt'

type Variant = 'inline' | 'menu' | 'compact'

interface ReceiptActionsProps {
  data: ReceiptData
  variant?: Variant
  className?: string
}

export function ReceiptActions({ data, variant = 'inline', className = '' }: ReceiptActionsProps) {
  const [downloaded, setDownloaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sharing, setSharing] = useState(false)

  const hasEmail = Boolean(data.donorEmail?.trim())
  const hasPhone = Boolean(data.donorPhone?.trim())

  const handleDownload = async () => {
    setLoading(true)
    try {
      await downloadReceiptPDF(data)
      setDownloaded(true)
      window.setTimeout(() => setDownloaded(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  const handleEmail = async () => {
    if (!hasEmail) return
    setLoading(true)
    try {
      await downloadReceiptPDF(data)
      window.location.href = buildEmailMailto(data)
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsApp = async () => {
    if (!hasPhone) return
    setLoading(true)
    try {
      await downloadReceiptPDF(data)
      window.open(buildWhatsAppUrl(data, data.donorPhone!), '_blank')
    } finally {
      setLoading(false)
    }
  }

  const handleSms = async () => {
    if (!hasPhone) return
    setLoading(true)
    try {
      await downloadReceiptPDF(data)
      window.location.href = buildSmsUrl(data, data.donorPhone!)
    } finally {
      setLoading(false)
    }
  }

  const handleNativeShare = async () => {
    if (!navigator.share) { await handleDownload(); return }
    setSharing(true)
    try {
      const blob = await getReceiptBlob(data)
      const file = new File([blob], `recu-${data.receiptNumber}.pdf`, { type: 'application/pdf' })
      const canShare = (navigator as any).canShare
      if (canShare && canShare({ files: [file] })) {
        await navigator.share({
          title: `Reçu ${data.associationName}`,
          text: `Votre reçu de don n°${data.receiptNumber}`,
          files: [file],
        })
      } else {
        await navigator.share({
          title: `Reçu ${data.associationName}`,
          text: `Votre reçu de don n°${data.receiptNumber} (${data.amount}€)`,
        })
        await downloadReceiptPDF(data)
      }
    } catch (err) {
      console.warn('Share cancelled/failed', err)
    }
    setSharing(false)
  }

  const LoadingIcon = () => <Loader2 className="w-3.5 h-3.5 animate-spin" />

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <button
          onClick={handleDownload}
          disabled={loading}
          title="Télécharger le reçu PDF"
          className="p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-md transition-colors disabled:opacity-50"
        >
          {loading ? <LoadingIcon /> : downloaded ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
        </button>
        {hasEmail && (
          <button
            onClick={handleEmail}
            disabled={loading}
            title={`Envoyer à ${data.donorEmail}`}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" />
          </button>
        )}
        {hasPhone && (
          <button
            onClick={handleWhatsApp}
            disabled={loading}
            title={`WhatsApp ${data.donorPhone}`}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-60"
      >
        {loading ? <LoadingIcon /> : downloaded ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
        {loading ? 'Génération...' : downloaded ? 'Téléchargé' : 'Télécharger le reçu'}
      </button>

      {hasEmail && (
        <button
          onClick={handleEmail}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-60"
          title={`Envoyer par email à ${data.donorEmail}`}
        >
          <Mail className="w-3.5 h-3.5" />
          Email
        </button>
      )}

      {hasPhone && (
        <>
          <button
            onClick={handleWhatsApp}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-60"
            title={`Envoyer par WhatsApp à ${data.donorPhone}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={handleSms}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-60"
          >
            SMS
          </button>
        </>
      )}

      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleNativeShare}
          disabled={sharing || loading}
          className="flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
        >
          {sharing ? <LoadingIcon /> : <Share2 className="w-3.5 h-3.5" />}
          Partager
        </button>
      )}

      {!hasEmail && !hasPhone && (
        <p className="text-[11px] text-[var(--color-text-muted)] italic">
          Ajoutez un email ou un téléphone pour envoyer le reçu au donateur.
        </p>
      )}
    </div>
  )
}
