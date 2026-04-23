import jsPDF from 'jspdf'

export interface ReceiptData {
  // Association
  associationName: string
  associationCity?: string | null
  logoUrl?: string | null
  // Ticket
  receiptNumber: string
  saleDate: string
  // Donor
  donorName?: string | null
  donorEmail?: string | null
  donorPhone?: string | null
  donorAddress?: string | null
  // Sale
  quantity: number
  amount: number
  unitPrice: number
  paymentMethod: string
  // Context
  campagneName: string
  secteurName: string
  amicalisteName?: string | null
  // Misc
  notes?: string | null
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Espèces',
  check: 'Chèque',
  card: 'Carte bancaire',
  transfer: 'Virement',
  other: 'Autre',
}

export function generateReceiptPDF(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const marginX = 15
  let y = 20

  // Header bar
  doc.setFillColor(234, 88, 12) // orange-600 ~ --color-primary
  doc.rect(0, 0, pageW, 10, 'F')

  // Logo si fourni
  if (data.logoUrl) {
    try {
      doc.addImage(data.logoUrl, 'PNG', marginX, 1, 8, 8)
    } catch (err) {
      console.warn('Logo image failed to load:', err)
    }
  }

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(17, 24, 39)
  doc.text('Reçu de don', data.logoUrl ? marginX + 10 : marginX, (y += 5))

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text(`Tournée des calendriers — ${data.campagneName}`, marginX, (y += 6))

  // Association block (right)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)
  const assocY = 25
  doc.text(data.associationName, pageW - marginX, assocY, { align: 'right' })
  if (data.associationCity) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text(data.associationCity, pageW - marginX, assocY + 5, { align: 'right' })
  }

  // Separator
  y += 8
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.line(marginX, y, pageW - marginX, y)

  // Receipt infos
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text(`N° de reçu : ${data.receiptNumber}`, marginX, y)
  const dateStr = new Date(data.saleDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  doc.text(`Date : ${dateStr}`, pageW - marginX, y, { align: 'right' })

  // Donor block
  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  doc.text('Donateur', marginX, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  y += 6
  doc.text(data.donorName || 'Don anonyme', marginX, y)
  if (data.donorEmail) {
    y += 5
    doc.text(`Email : ${data.donorEmail}`, marginX, y)
  }
  if (data.donorPhone) {
    y += 5
    doc.text(`Téléphone : ${data.donorPhone}`, marginX, y)
  }
  if (data.donorAddress) {
    y += 5
    const lines = doc.splitTextToSize(`Adresse : ${data.donorAddress}`, pageW - 2 * marginX)
    doc.text(lines, marginX, y)
    y += (lines.length - 1) * 5
  }

  // Sale details box
  y += 12
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(marginX, y, pageW - 2 * marginX, 42, 3, 3, 'FD')

  const boxX = marginX + 5
  let boxY = y + 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(17, 24, 39)
  doc.text('Détails du don', boxX, boxY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  boxY += 7
  doc.text(`Calendriers remis :`, boxX, boxY)
  doc.setFont('helvetica', 'bold')
  doc.text(`${data.quantity}`, pageW - marginX - 5, boxY, { align: 'right' })
  doc.setFont('helvetica', 'normal')

  boxY += 6
  doc.text(`Prix unitaire indicatif :`, boxX, boxY)
  doc.text(
    `${data.unitPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
    pageW - marginX - 5,
    boxY,
    { align: 'right' }
  )

  boxY += 6
  doc.text(`Mode de paiement :`, boxX, boxY)
  doc.text(PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod, pageW - marginX - 5, boxY, {
    align: 'right',
  })

  boxY += 8
  doc.setDrawColor(229, 231, 235)
  doc.line(boxX, boxY - 2, pageW - marginX - 5, boxY - 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(22, 163, 74)
  doc.text('Montant du don', boxX, boxY + 3)
  doc.text(
    `${data.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`,
    pageW - marginX - 5,
    boxY + 3,
    { align: 'right' }
  )

  // Context
  y += 52
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(`Secteur : ${data.secteurName}`, marginX, y)
  if (data.amicalisteName) {
    y += 5
    doc.text(`Collecté par : ${data.amicalisteName}`, marginX, y)
  }

  // Notes
  if (data.notes) {
    y += 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(17, 24, 39)
    doc.text('Notes', marginX, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(55, 65, 81)
    y += 5
    const noteLines = doc.splitTextToSize(data.notes, pageW - 2 * marginX)
    doc.text(noteLines, marginX, y)
    y += noteLines.length * 4
  }

  // Footer thank-you
  y = Math.max(y, 230)
  doc.setDrawColor(229, 231, 235)
  doc.line(marginX, y, pageW - marginX, y)
  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(234, 88, 12)
  doc.text('Merci pour votre soutien !', pageW / 2, y, { align: 'center' })
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text(
    `Votre don contribue au bon fonctionnement de ${data.associationName}.`,
    pageW / 2,
    y,
    { align: 'center' }
  )

  // Bottom meta
  doc.setFontSize(8)
  doc.setTextColor(156, 163, 175)
  doc.text(
    `Reçu généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
    pageW / 2,
    285,
    { align: 'center' }
  )

  return doc
}

export function downloadReceiptPDF(data: ReceiptData) {
  const doc = generateReceiptPDF(data)
  const safeName = (data.donorName || 'don-anonyme')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
  doc.save(`recu-${safeName}-${data.receiptNumber}.pdf`)
}

export function getReceiptDataUri(data: ReceiptData): string {
  const doc = generateReceiptPDF(data)
  return doc.output('datauristring')
}

export function getReceiptBlob(data: ReceiptData): Blob {
  const doc = generateReceiptPDF(data)
  return doc.output('blob')
}

export function buildEmailMailto(
  data: ReceiptData,
  opts: { preferredEmail?: string } = {}
): string {
  const to = opts.preferredEmail || data.donorEmail || ''
  const subject = encodeURIComponent(
    `Votre reçu — ${data.associationName} (${data.campagneName})`
  )
  const body = encodeURIComponent(
    `Bonjour${data.donorName ? ' ' + data.donorName : ''},\n\n` +
      `Merci pour votre don de ${data.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} ` +
      `en soutien à ${data.associationName} dans le cadre de la tournée des calendriers ${data.campagneName}.\n\n` +
      `Vous trouverez en pièce jointe votre reçu n°${data.receiptNumber}.\n\n` +
      `Cordialement,\n${data.associationName}`
  )
  return `mailto:${to}?subject=${subject}&body=${body}`
}

export function buildWhatsAppUrl(data: ReceiptData, phone: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '').replace(/^\+/, '')
  const text = encodeURIComponent(
    `Bonjour${data.donorName ? ' ' + data.donorName : ''}, merci pour votre don de ` +
      `${data.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} à ${data.associationName}. ` +
      `Votre reçu n°${data.receiptNumber} est joint.`
  )
  return `https://wa.me/${cleanPhone}?text=${text}`
}

export function buildSmsUrl(data: ReceiptData, phone: string): string {
  const text = encodeURIComponent(
    `Merci ${data.donorName ?? ''} pour votre don de ` +
      `${data.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} à ${data.associationName}. ` +
      `Reçu n°${data.receiptNumber} envoyé par email.`
  )
  return `sms:${phone}?body=${text}`
}

export function buildReceiptNumber(venteId: string, date: string): string {
  const year = new Date(date).getFullYear()
  const short = venteId.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `${year}-${short}`
}
