import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { useAssociation } from '@/features/association/AssociationContext'
import type { TransactionWithCategory } from './useTransactions'
import type { VirementAvecComptes } from './useVirements'
import type { CompteAvecSolde } from './useComptes'

export type ExportColCompta = 'date' | 'description' | 'type' | 'categorie' | 'compte' | 'montant' | 'notes'

export const EXPORT_COLS_COMPTA: Record<ExportColCompta, string> = {
  date:        'Date',
  description: 'Description',
  type:        'Type',
  categorie:   'Catégorie',
  compte:      'Compte',
  montant:     'Montant (€)',
  notes:       'Notes',
}

export type ExportTypeFilter = 'all' | 'income' | 'expense' | 'virement'

/** Supprime les emojis et caractères Unicode non supportés par Helvetica (jsPDF) */
const stripEmoji = (str: string): string =>
  str
    // Emojis Emoticons, Misc Symbols, Supplemental Symbols, etc.
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    // Dingbats, Misc symbols, arrows
    .replace(/[☀-➿]/gu, '')
    // Symboles divers supplémentaires
    .replace(/[\u{E000}-\u{F8FF}]/gu, '')
    // Remplacer double espace éventuel + trim
    .replace(/\s{2,}/g, ' ')
    .trim()

// ── Types fusionnés ────────────────────────────────────────────────────────────
type LigneTx = {
  kind: 'tx'
  date: string
  description: string
  type: 'income' | 'expense'
  categorie: string
  compte: string
  montant: number
  notes: string
}
type LigneVir = {
  kind: 'vir'
  date: string
  description: string
  type: 'virement'
  categorie: string
  compte: string   // "Source → Dest"
  montant: number
  notes: string
}
export type LigneExport = LigneTx | LigneVir

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR')
const nomMois = (m: number, y: number) =>
  new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useExportComptabilite() {
  const { currentAssociation } = useAssociation()

  /** Construit la liste fusionnée triée par date */
  const buildLignes = (
    transactions: TransactionWithCategory[],
    virements: VirementAvecComptes[],
    comptes: CompteAvecSolde[],
    options: {
      mois?: number
      annee?: number
      compteId?: string
      typeFilter: ExportTypeFilter
    }
  ): LigneExport[] => {
    const { mois, annee, compteId, typeFilter } = options

    const filterDate = (d: string) => {
      if (!mois || !annee) return true
      const dt = new Date(d + 'T00:00:00')
      return dt.getMonth() + 1 === mois && dt.getFullYear() === annee
    }

    const txLignes: LigneTx[] = transactions
      .filter(t => filterDate(t.date))
      .filter(t => !compteId || t.compte_id === compteId)
      .filter(t => typeFilter === 'all' || typeFilter === t.type)
      .map(t => ({
        kind: 'tx',
        date: t.date,
        description: t.description,
        type: t.type,
        categorie: t.categories?.name || '',
        compte: comptes.find(c => c.id === t.compte_id)?.nom || '',
        montant: Number(t.amount),
        notes: t.notes || '',
      }))

    const virLignes: LigneVir[] = virements
      .filter(v => filterDate(v.date))
      .filter(v => !compteId || v.compte_source_id === compteId || v.compte_destination_id === compteId)
      .filter(() => typeFilter === 'all' || typeFilter === 'virement')
      .map(v => ({
        kind: 'vir',
        date: v.date,
        description: v.description,
        type: 'virement',
        categorie: 'Virement',
        compte: `${v.compte_source?.icone ?? ''} ${v.compte_source?.nom ?? ''} → ${v.compte_destination?.icone ?? ''} ${v.compte_destination?.nom ?? ''}`,
        montant: Number(v.montant),
        notes: v.notes || '',
      }))

    return [...txLignes, ...virLignes].sort((a, b) =>
      b.date.localeCompare(a.date) || b.description.localeCompare(a.description)
    )
  }

  const buildRow = (l: LigneExport, cols: ExportColCompta[]): Record<string, string> => {
    const row: Record<string, string> = {}
    for (const col of cols) {
      switch (col) {
        case 'date':        row['Date'] = fmtDate(l.date); break
        case 'description': row['Description'] = l.description; break
        case 'type':        row['Type'] = l.type === 'income' ? 'Recette' : l.type === 'expense' ? 'Dépense' : 'Virement'; break
        case 'categorie':   row['Catégorie'] = l.categorie; break
        case 'compte':      row['Compte'] = l.compte; break
        case 'montant':     row['Montant (€)'] = (l.kind === 'tx' && l.type === 'expense' ? '-' : '+') + fmt(l.montant); break
        case 'notes':       row['Notes'] = l.notes; break
      }
    }
    return row
  }

  // ── Export Excel ─────────────────────────────────────────────────────────────
  const exportToExcel = (
    lignes: LigneExport[],
    cols: ExportColCompta[],
    mois: number,
    annee: number,
    compteLabel?: string,
  ) => {
    const wb = XLSX.utils.book_new()

    // ── Feuille Relevé ──────────────────────────────────────────────────────
    const data = lignes.map(l => buildRow(l, cols))

    // Totaux
    const totalRecettes = lignes.filter(l => l.kind === 'tx' && l.type === 'income').reduce((s, l) => s + l.montant, 0)
    const totalDepenses = lignes.filter(l => l.kind === 'tx' && l.type === 'expense').reduce((s, l) => s + l.montant, 0)
    const totalVirements = lignes.filter(l => l.kind === 'vir').reduce((s, l) => s + l.montant, 0)
    const solde = totalRecettes - totalDepenses

    // Ligne vide + totaux
    data.push({} as any)
    if (cols.includes('description')) {
      data.push({ 'Description': '── TOTAUX ──' } as any)
      data.push({ 'Description': 'Recettes',   'Montant (€)': '+' + fmt(totalRecettes) } as any)
      data.push({ 'Description': 'Dépenses',   'Montant (€)': '-' + fmt(totalDepenses) } as any)
      if (totalVirements > 0)
        data.push({ 'Description': 'Virements', 'Montant (€)': fmt(totalVirements) } as any)
      data.push({ 'Description': 'Solde net',  'Montant (€)': (solde >= 0 ? '+' : '') + fmt(solde) } as any)
    }

    const ws = XLSX.utils.json_to_sheet(data)

    // Largeurs colonnes
    const widths: Record<ExportColCompta, number> = {
      date: 12, description: 40, type: 12, categorie: 18, compte: 30, montant: 16, notes: 30,
    }
    ws['!cols'] = cols.map(c => ({ wch: widths[c] }))

    const sheetName = `Relevé ${String(mois).padStart(2, '0')}-${annee}`
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

    // ── Feuille Résumé par catégorie ──────────────────────────────────────
    const catMap: Record<string, { recettes: number; depenses: number }> = {}
    lignes.forEach(l => {
      const cat = l.categorie || '—'
      if (!catMap[cat]) catMap[cat] = { recettes: 0, depenses: 0 }
      if (l.kind === 'tx') {
        if (l.type === 'income')  catMap[cat].recettes  += l.montant
        if (l.type === 'expense') catMap[cat].depenses  += l.montant
      }
    })
    const resumeData = Object.entries(catMap).map(([cat, v]) => ({
      'Catégorie': cat,
      'Recettes': fmt(v.recettes),
      'Dépenses': fmt(v.depenses),
      'Solde': (v.recettes - v.depenses >= 0 ? '+' : '') + fmt(v.recettes - v.depenses),
    }))
    const wsResume = XLSX.utils.json_to_sheet(resumeData)
    wsResume['!cols'] = [{ wch: 25 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, wsResume, 'Résumé catégories')

    const filename = `comptabilite_${String(mois).padStart(2, '0')}-${annee}${compteLabel ? '_' + compteLabel : ''}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  // ── Export PDF ────────────────────────────────────────────────────────────────
  const exportToPDF = async (
    lignes: LigneExport[],
    cols: ExportColCompta[],
    mois: number,
    annee: number,
    compteLabel?: string,
    comptesolde?: number,
  ) => {
    const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
    const PW = pdf.internal.pageSize.getWidth()
    const PH = pdf.internal.pageSize.getHeight()
    const M = 12
    let Y = M

    // ── En-tête ────────────────────────────────────────────────────────────
    // Logo
    let logoW = 0
    if (currentAssociation?.logo_url) {
      try {
        const res = await fetch(currentAssociation.logo_url)
        if (res.ok) {
          const blob = await res.blob()
          const b64 = await new Promise<string>(resolve => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
          logoW = 16
          pdf.addImage(b64, 'JPEG', M, Y, logoW, logoW)
        }
      } catch { /* logo facultatif */ }
    }

    const textX = M + logoW + (logoW > 0 ? 4 : 0)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14)
    pdf.text(stripEmoji(currentAssociation?.name ?? 'Comptabilite'), textX, Y + 5)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9)
    const sous = [
      `Releve de compte — ${nomMois(mois, annee)}`,
      compteLabel ? `Compte : ${stripEmoji(compteLabel)}` : 'Tous les comptes',
      `Genere le ${new Date().toLocaleDateString('fr-FR')}`,
    ].join('   |   ')
    pdf.text(sous, textX, Y + 12)
    Y = Math.max(Y + 20, (logoW > 0 ? logoW : 0) + M + 4)

    // ── Résumé chiffres ────────────────────────────────────────────────────
    const totalRecettes  = lignes.filter(l => l.kind === 'tx' && l.type === 'income').reduce((s, l) => s + l.montant, 0)
    const totalDepenses  = lignes.filter(l => l.kind === 'tx' && l.type === 'expense').reduce((s, l) => s + l.montant, 0)
    const totalVirements = lignes.filter(l => l.kind === 'vir').reduce((s, l) => s + l.montant, 0)
    const solde          = totalRecettes - totalDepenses

    const stats = [
      { label: 'Recettes', val: '+' + fmt(totalRecettes), color: [34, 197, 94] as [number,number,number] },
      { label: 'Dépenses', val: '-'  + fmt(totalDepenses), color: [239, 68, 68] as [number,number,number] },
      ...(totalVirements > 0 ? [{ label: 'Virements', val: fmt(totalVirements), color: [99, 102, 241] as [number,number,number] }] : []),
      { label: 'Solde net', val: (solde >= 0 ? '+' : '') + fmt(solde), color: (solde >= 0 ? [59, 130, 246] : [245, 158, 11]) as [number,number,number] },
      ...(comptesolde !== undefined ? [{ label: 'Solde compte', val: (comptesolde >= 0 ? '+' : '') + fmt(comptesolde), color: [107, 114, 128] as [number,number,number] }] : []),
    ]

    const boxW = (PW - 2 * M - 4 * (stats.length - 1)) / stats.length
    stats.forEach((s, i) => {
      const bx = M + i * (boxW + 4)
      pdf.setFillColor(245, 245, 245); pdf.roundedRect(bx, Y, boxW, 14, 2, 2, 'F')
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(100, 100, 100)
      pdf.text(s.label, bx + boxW / 2, Y + 4.5, { align: 'center' })
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...s.color)
      pdf.text(s.val, bx + boxW / 2, Y + 10.5, { align: 'center' })
    })
    pdf.setTextColor(0, 0, 0)
    Y += 19

    // ── Tableau ────────────────────────────────────────────────────────────
    const fixedWidths: Record<ExportColCompta, number> = {
      date: 22, description: 0, type: 18, categorie: 26, compte: 38, montant: 24, notes: 0,
    }
    const fixedTotal = cols.reduce((s, c) => s + (fixedWidths[c] !== 0 ? fixedWidths[c] : 0), 0)
    const flexCols   = cols.filter(c => fixedWidths[c] === 0)
    const flexW      = flexCols.length > 0 ? (PW - 2 * M - fixedTotal) / flexCols.length : 0
    const colWidths  = cols.map(c => fixedWidths[c] !== 0 ? fixedWidths[c] : flexW)

    const ROW_H = 7
    const HEAD_H = 8

    const drawHeader = () => {
      pdf.setFillColor(60, 60, 60); pdf.rect(M, Y, PW - 2 * M, HEAD_H, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255)
      let x = M
      cols.forEach((c, i) => {
        pdf.text(EXPORT_COLS_COMPTA[c], x + 2, Y + 5.5, { maxWidth: colWidths[i] - 4 })
        x += colWidths[i]
      })
      pdf.setTextColor(0, 0, 0)
      Y += HEAD_H
    }

    drawHeader()

    lignes.forEach((l, idx) => {
      if (Y + ROW_H > PH - M - 15) { pdf.addPage(); Y = M; drawHeader() }

      const isVir = l.kind === 'vir'
      const isIncome = l.kind === 'tx' && l.type === 'income'

      if (idx % 2 === 0) { pdf.setFillColor(250, 250, 250); pdf.rect(M, Y, PW - 2 * M, ROW_H, 'F') }
      if (isVir)    { pdf.setFillColor(238, 242, 255); pdf.rect(M, Y, PW - 2 * M, ROW_H, 'F') }

      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)

      let x = M
      cols.forEach((c, i) => {
        let val = ''
        switch (c) {
          case 'date':        val = fmtDate(l.date); break
          case 'description': val = stripEmoji(l.description); break
          case 'type':        val = l.type === 'income' ? 'Recette' : l.type === 'expense' ? 'Depense' : 'Virement'; break
          case 'categorie':   val = stripEmoji(l.categorie); break
          case 'compte':      val = stripEmoji(l.compte); break
          case 'montant':
            val = (l.kind === 'tx' && l.type === 'expense' ? '-' : '+') + fmt(l.montant)
            break
          case 'notes':       val = stripEmoji(l.notes); break
        }

        // Couleur montant
        if (c === 'montant') {
          if (isVir)    pdf.setTextColor(99, 102, 241)
          else if (isIncome) pdf.setTextColor(22, 163, 74)
          else               pdf.setTextColor(220, 38, 38)
        } else {
          pdf.setTextColor(40, 40, 40)
        }

        pdf.text(String(val), x + 2, Y + ROW_H - 1.5, { maxWidth: colWidths[i] - 4 })
        x += colWidths[i]
      })

      // Séparateur léger
      pdf.setDrawColor(230, 230, 230); pdf.line(M, Y + ROW_H, PW - M, Y + ROW_H)
      Y += ROW_H
    })

    pdf.setTextColor(0, 0, 0)

    // ── Ligne de totaux ────────────────────────────────────────────────────
    if (Y + 10 > PH - M) { pdf.addPage(); Y = M }
    Y += 3
    pdf.setFillColor(40, 40, 40); pdf.rect(M, Y, PW - 2 * M, 9, 'F')
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255)

    const totLine = `Recettes : +${fmt(totalRecettes)}   Depenses : -${fmt(totalDepenses)}${totalVirements > 0 ? `   Virements : ${fmt(totalVirements)}` : ''}   Solde net : ${(solde >= 0 ? '+' : '')}${fmt(solde)}`
    pdf.text(totLine, PW / 2, Y + 6, { align: 'center' })
    Y += 12

    // ── Pied de page ───────────────────────────────────────────────────────
    const totalPages = (pdf.internal as any).getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(150, 150, 150)
      pdf.text(`Page ${p}/${totalPages}  -  ${stripEmoji(currentAssociation?.name ?? '')}  -  ${nomMois(mois, annee)}`, PW / 2, PH - 5, { align: 'center' })
    }

    const filename = `comptabilite_${String(mois).padStart(2, '0')}-${annee}${compteLabel ? '_' + compteLabel.replace(/\s+/g, '_') : ''}.pdf`
    pdf.save(filename)
  }

  return { buildLignes, exportToExcel, exportToPDF }
}
