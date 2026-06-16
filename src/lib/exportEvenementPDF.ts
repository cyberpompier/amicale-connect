import type { Evenement } from '@/hooks/useEvenements'
import type { Participant, Invite } from '@/hooks/useEvenementDetail'

interface ExportOptions {
  evenement: Evenement
  participants: Participant[]
  invites: Invite[]
  nomAssociation?: string
}

type RGB = [number, number, number]

const RED: RGB   = [194, 38, 38]
const DARK: RGB  = [30, 30, 30]
const GRAY: RGB  = [110, 110, 110]
const WHITE: RGB = [255, 255, 255]
const LGRAY: RGB = [248, 248, 248]

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmé', invited: 'En attente', declined: 'Refusé',
  invite: 'Invité', confirme: 'Confirmé', decline: 'Décliné',
}
const PAIEMENT_LABELS: Record<string, string> = {
  paye: 'Payé', en_attente: 'En attente', exonere: 'Exonéré',
}
const PAIEMENT_COLORS: Record<string, RGB> = {
  'Payé':       [16, 185, 129],
  'En attente': [245, 158, 11],
  'Exonéré':    [99, 102, 241],
}

export async function exportEvenementPDF({ evenement, participants, invites, nomAssociation }: ExportOptions) {
  const { default: JsPDF } = await import('jspdf')
  const doc = new JsPDF({ unit: 'mm', format: 'a4' })

  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 14   // margin
  const CW = W - M * 2

  const dateObj = new Date(evenement.date + 'T00:00:00')
  const dateStr = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const confirmes       = participants.filter(p => p.status === 'confirmed')
  const enAttente       = participants.filter(p => p.status === 'invited')
  const refuses         = participants.filter(p => p.status === 'declined')
  const invitesConfirmes = invites.filter(i => i.statut === 'confirme' || i.statut === 'invite')
  const totalPresences  = confirmes.reduce((s, p) => s + 1 + (p.nombre_accompagnants || 0), 0) + invitesConfirmes.length
  const paiementsReçus  = [...participants, ...invites].filter(x => x.paiement === 'paye').length

  const printDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 1 — Récapitulatif
  // ─────────────────────────────────────────────────────────────────────────────

  let y = 0

  // Header
  doc.setFillColor(...RED)
  doc.rect(0, 0, W, 34, 'F')

  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(evenement.titre, M, 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (nomAssociation) doc.text(nomAssociation, M, 21)
  doc.text('Récapitulatif de l\'événement', W - M, 14, { align: 'right' })
  doc.text(dateStr, W - M, 21, { align: 'right' })

  y = 42

  // Event details
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  const details: string[] = []
  if (evenement.heure) details.push(`Heure : ${evenement.heure}`)
  if (evenement.lieu)  details.push(`Lieu : ${evenement.lieu}`)
  if (evenement.tarif_amicaliste != null) details.push(`Tarif membre : ${evenement.tarif_amicaliste} €`)
  if (evenement.tarif_exterieur  != null) details.push(`Tarif extérieur : ${evenement.tarif_exterieur} €`)

  details.forEach(d => { doc.text(d, M, y); y += 5.5 })

  if (evenement.description) {
    y += 1
    doc.setTextColor(...GRAY)
    const lines = doc.splitTextToSize(evenement.description, CW)
    doc.text(lines, M, y)
    y += lines.length * 4.5
  }

  y += 4

  // Stats boxes (2 rows × 3 cols)
  const stats = [
    { label: 'Confirmés',       value: confirmes.length,    color: [34, 197, 94]  as RGB },
    { label: 'En attente',      value: enAttente.length,    color: [245, 158, 11] as RGB },
    { label: 'Refusés',         value: refuses.length,      color: [239, 68, 68]  as RGB },
    { label: 'Invités ext.',    value: invites.length,      color: [99, 102, 241] as RGB },
    { label: 'Total présences', value: totalPresences,      color: RED },
    { label: 'Paiements reçus', value: paiementsReçus,      color: [16, 185, 129] as RGB },
  ]

  const bW = (CW - 8) / 3
  const bH = 17

  stats.forEach((s, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const bx  = M + col * (bW + 4)
    const by  = y + row * (bH + 3)

    doc.setFillColor(...s.color)
    doc.roundedRect(bx, by, bW, bH, 2, 2, 'F')

    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text(String(s.value), bx + bW / 2, by + 9.5, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(s.label, bx + bW / 2, by + 14.5, { align: 'center' })
  })

  y += 2 * (bH + 3) + 8

  // ── Table inscriptions ────────────────────────────────────────────────────

  const drawTableHeader = () => {
    doc.setFillColor(...RED)
    doc.rect(M, y, CW, 7, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text('NOM', M + 2, y + 5)
    doc.text('GRADE / TYPE', M + 75, y + 5)
    doc.text('STATUT', M + 115, y + 5)
    doc.text('PAIEMENT', M + 150, y + 5)
    y += 8
  }

  // Section title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...RED)
  doc.text('Liste des inscriptions', M, y)
  y += 5

  doc.setDrawColor(...RED)
  doc.setLineWidth(0.4)
  doc.line(M, y, W - M, y)
  y += 3

  drawTableHeader()

  let rowIdx = 0
  const ROW_H = 6.5

  const drawRow = (nom: string, grade: string, statut: string, paiement: string, accompagnants: number) => {
    if (y + ROW_H > H - 14) {
      addFooter()
      doc.addPage()
      y = 14
      drawTableHeader()
    }

    if (rowIdx % 2 === 0) {
      doc.setFillColor(...LGRAY)
      doc.rect(M, y, CW, ROW_H, 'F')
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...DARK)
    const nomDisplay = nom + (accompagnants > 0 ? `  +${accompagnants} acc.` : '')
    doc.text(nomDisplay, M + 2, y + 4.5, { maxWidth: 70 })

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(grade, M + 75, y + 4.5, { maxWidth: 38 })

    // Statut
    const sColors: Record<string, RGB> = {
      'Confirmé': [34, 197, 94], 'En attente': [245, 158, 11],
      'Refusé': [239, 68, 68], 'Invité': [99, 102, 241], 'Décliné': [239, 68, 68],
    }
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...(sColors[statut] ?? GRAY))
    doc.text(statut, M + 115, y + 4.5)

    doc.setTextColor(...(PAIEMENT_COLORS[paiement] ?? GRAY))
    doc.text(paiement, M + 150, y + 4.5)

    rowIdx++
    y += ROW_H
  }

  const drawSectionLabel = (label: string, color: RGB) => {
    if (y + 8 > H - 14) {
      addFooter(); doc.addPage(); y = 14; drawTableHeader()
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...color)
    doc.text(label, M + 2, y + 4)
    y += 6
  }

  if (confirmes.length > 0) {
    drawSectionLabel(`✓ Membres confirmés (${confirmes.length})`, [34, 197, 94])
    confirmes.forEach(p => drawRow(
      `${p.amicalistes.last_name} ${p.amicalistes.first_name}`,
      p.amicalistes.grade ?? 'Membre',
      STATUS_LABELS[p.status],
      PAIEMENT_LABELS[p.paiement],
      p.nombre_accompagnants,
    ))
  }

  if (enAttente.length > 0) {
    drawSectionLabel(`⏳ Membres en attente (${enAttente.length})`, [245, 158, 11])
    enAttente.forEach(p => drawRow(
      `${p.amicalistes.last_name} ${p.amicalistes.first_name}`,
      p.amicalistes.grade ?? 'Membre',
      STATUS_LABELS[p.status],
      PAIEMENT_LABELS[p.paiement],
      p.nombre_accompagnants,
    ))
  }

  if (refuses.length > 0) {
    drawSectionLabel(`✗ Membres refusés (${refuses.length})`, [239, 68, 68])
    refuses.forEach(p => drawRow(
      `${p.amicalistes.last_name} ${p.amicalistes.first_name}`,
      p.amicalistes.grade ?? 'Membre',
      STATUS_LABELS[p.status],
      PAIEMENT_LABELS[p.paiement],
      0,
    ))
  }

  if (invites.length > 0) {
    drawSectionLabel(`⊕ Invités externes (${invites.length})`, [99, 102, 241])
    invites.forEach(inv => drawRow(
      inv.nom,
      inv.email ?? 'Invité ext.',
      STATUS_LABELS[inv.statut],
      PAIEMENT_LABELS[inv.paiement],
      0,
    ))
  }

  addFooter()

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 2 — Feuille de pointage
  // ─────────────────────────────────────────────────────────────────────────────

  doc.addPage()
  y = 0

  // Header
  doc.setFillColor(...RED)
  doc.rect(0, 0, W, 30, 'F')

  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('FEUILLE DE POINTAGE', M, 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(evenement.titre, M, 21)
  doc.text(dateStr, W - M, 21, { align: 'right' })

  y = 38

  // Info + signature fields
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  if (evenement.lieu)  doc.text(`Lieu : ${evenement.lieu}`, M, y)
  if (evenement.heure) doc.text(`Heure : ${evenement.heure}`, W / 2, y)
  y += 8

  doc.text('Responsable : _______________________________', M, y)
  doc.text('Signature : _______________________________', W - M - 75, y)
  y += 8

  doc.setDrawColor(...GRAY)
  doc.setLineWidth(0.3)
  doc.line(M, y, W - M, y)
  y += 5

  // Pointage table header
  const PC = {
    n:    M + 1,
    nom:  M + 11,
    pres: M + 95,
    acc:  M + 118,
    pay:  M + 132,
    sig:  M + 158,
  }

  const drawPointageHeader = () => {
    doc.setFillColor(...RED)
    doc.rect(M, y, CW, 8, 'F')
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text('N°',        PC.n,    y + 5.5)
    doc.text('NOM',       PC.nom,  y + 5.5)
    doc.text('PRÉSENT',   PC.pres, y + 5.5)
    doc.text('ACC.',      PC.acc,  y + 5.5)
    doc.text('PAIEMENT',  PC.pay,  y + 5.5)
    doc.text('SIGNATURE', PC.sig,  y + 5.5)
    y += 9
  }

  drawPointageHeader()

  const PROW = 9

  // Build the pointage list: confirmed members + invited/confirmed guests
  const pointageList: Array<{
    nom: string; grade: string; paiement: string; accompagnants: number
  }> = [
    ...confirmes.map(p => ({
      nom:           `${p.amicalistes.last_name} ${p.amicalistes.first_name}`,
      grade:         p.amicalistes.grade ?? '',
      paiement:      PAIEMENT_LABELS[p.paiement],
      accompagnants: p.nombre_accompagnants,
    })),
    ...enAttente.map(p => ({
      nom:           `${p.amicalistes.last_name} ${p.amicalistes.first_name}`,
      grade:         p.amicalistes.grade ?? '',
      paiement:      PAIEMENT_LABELS[p.paiement],
      accompagnants: p.nombre_accompagnants,
    })),
    ...invitesConfirmes.map(inv => ({
      nom:           inv.nom,
      grade:         'Invité ext.',
      paiement:      PAIEMENT_LABELS[inv.paiement],
      accompagnants: 0,
    })),
  ]

  pointageList.forEach((person, idx) => {
    if (y + PROW > H - 18) {
      addFooter()
      doc.addPage()
      y = 14
      drawPointageHeader()
    }

    if (idx % 2 === 0) {
      doc.setFillColor(...LGRAY)
      doc.rect(M, y, CW, PROW, 'F')
    }

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(M, y + PROW, W - M, y + PROW)

    // N°
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(String(idx + 1), PC.n, y + 6)

    // Nom + grade
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...DARK)
    doc.text(person.nom, PC.nom, y + 5, { maxWidth: 80 })
    if (person.grade) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...GRAY)
      doc.text(person.grade, PC.nom, y + 8.5)
    }

    // Checkbox présent
    doc.setDrawColor(...DARK)
    doc.setLineWidth(0.5)
    doc.rect(PC.pres + 7, y + 1.5, 5.5, 5.5)

    // Accompagnants
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...DARK)
    doc.text(person.accompagnants > 0 ? `+${person.accompagnants}` : '—', PC.acc + 3, y + 6)

    // Paiement
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...(PAIEMENT_COLORS[person.paiement] ?? GRAY))
    doc.text(person.paiement, PC.pay, y + 6)

    // Signature line
    doc.setDrawColor(190, 190, 190)
    doc.setLineWidth(0.3)
    doc.line(PC.sig, y + 7, PC.sig + 34, y + 7)

    y += PROW
  })

  // Empty rows for walk-ins
  const remaining = Math.floor((H - y - 20) / PROW)
  const emptyRows = Math.min(5, remaining)
  for (let i = 0; i < emptyRows; i++) {
    const idx = pointageList.length + i

    if ((idx) % 2 === 0) {
      doc.setFillColor(...LGRAY)
      doc.rect(M, y, CW, PROW, 'F')
    }

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.2)
    doc.line(M, y + PROW, W - M, y + PROW)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    doc.text(String(idx + 1), PC.n, y + 6)

    doc.setDrawColor(...DARK)
    doc.setLineWidth(0.5)
    doc.rect(PC.pres + 7, y + 1.5, 5.5, 5.5)

    doc.setDrawColor(190, 190, 190)
    doc.setLineWidth(0.3)
    doc.line(PC.sig, y + 7, PC.sig + 34, y + 7)

    y += PROW
  }

  addFooter()

  // ── Footer helper ─────────────────────────────────────────────────────────

  function addFooter() {
    const page = doc.getCurrentPageInfo().pageNumber
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(`Généré le ${printDate} via Amicale Connect`, M, H - 7)
    doc.text(
      `${evenement.titre}  ·  Page ${page}`,
      W - M, H - 7, { align: 'right' }
    )
  }

  // Save
  const slug = evenement.titre.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  doc.save(`${slug}_export.pdf`)
}
