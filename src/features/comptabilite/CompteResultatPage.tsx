import { useState, useMemo } from 'react'
import { Download, TrendingUp, TrendingDown } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useAssociation } from '@/features/association/AssociationContext'
import { cn } from '@/lib/utils'
import jsPDF from 'jspdf'

// ── Helpers ───────────────────────────────────────────────────────────────────
const eur = (n: number) => {
  const formatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const parts = formatter.formatToParts(n)
  let result = ''
  for (const part of parts) {
    result += part.type === 'group' ? ' ' : part.value
  }
  return result + ' €'
}

const pct = (n: number, total: number) =>
  total === 0 ? '—' : ((n / total) * 100).toFixed(1) + ' %'

const stripEmoji = (s: string) =>
  s.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[☀-➿]/gu, '').replace(/\s{2,}/g, ' ').trim()

const delta = (n: number, prev: number) => {
  if (prev === 0) return null
  const d = n - prev
  const p = ((d / prev) * 100).toFixed(1)
  return { d, p, up: d >= 0 }
}

function useAnneeStats(annee: number) {
  const { transactions } = useTransactions({ from: `${annee}-01-01`, to: `${annee}-12-31` })
  return useMemo(() => {
    const totalProduits  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const totalCharges   = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    const resultat       = totalProduits - totalCharges

    const produits = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => {
        const k = t.categories?.name || 'Sans catégorie'
        acc[k] = (acc[k] || 0) + Number(t.amount)
        return acc
      }, {} as Record<string, number>)

    const charges = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const k = t.categories?.name || 'Sans catégorie'
        acc[k] = (acc[k] || 0) + Number(t.amount)
        return acc
      }, {} as Record<string, number>)

    return { totalProduits, totalCharges, resultat, produits, charges }
  }, [transactions])
}

// ── Composant ─────────────────────────────────────────────────────────────────
export function CompteResultatPage() {
  const currentYear = new Date().getFullYear()
  const [annee, setAnnee] = useState(currentYear)
  const [showN1, setShowN1] = useState(true)
  const [generating, setGenerating] = useState(false)

  const { currentAssociation } = useAssociation()
  const statsN  = useAnneeStats(annee)
  const statsN1 = useAnneeStats(annee - 1)

  // Fusionner toutes les lignes (même catégorie peut apparaître des deux côtés)
  const allChargesCats  = Object.keys(statsN.charges).sort((a, b) => statsN.charges[b] - statsN.charges[a])
  const allProduitsCats = Object.keys(statsN.produits).sort((a, b) => statsN.produits[b] - statsN.produits[a])
  const maxRows = Math.max(allChargesCats.length, allProduitsCats.length)

  // ── Export PDF ────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setGenerating(true)
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const PW = pdf.internal.pageSize.getWidth()
      const PH = pdf.internal.pageSize.getHeight()
      const M = 14
      let Y = M
      const assocName = stripEmoji(currentAssociation?.name ?? 'Amicale')

      // ── En-tête ────────────────────────────────────────────────────────
      pdf.setFillColor(180, 20, 20)
      pdf.rect(0, 0, PW, 18, 'F')

      let logoOffset = 0
      if (currentAssociation?.logo_url) {
        try {
          const res = await fetch(currentAssociation.logo_url)
          if (res.ok) {
            const blob = await res.blob()
            const b64 = await new Promise<string>(r => {
              const rd = new FileReader(); rd.onloadend = () => r(rd.result as string); rd.readAsDataURL(blob)
            })
            pdf.addImage(b64, 'JPEG', M, 2, 14, 14)
            logoOffset = 18
          }
        } catch { /* facultatif */ }
      }

      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(255, 255, 255)
      pdf.text(`${assocName}  —  COMPTE DE RESULTAT`, M + logoOffset, 8)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(255, 200, 200)
      pdf.text(`Exercice clos le 31 decembre ${annee}`, M + logoOffset, 14)
      Y = 24

      // ── Sous-titre colonnes ────────────────────────────────────────────
      const half = (PW - 2 * M - 4) / 2
      const colW = showN1 ? half / 2 : half * 0.7
      const labelW = showN1 ? half - colW : half - colW

      // En-tête tableau : CHARGES (gauche) | PRODUITS (droite)
      const drawTableHeader = () => {
        pdf.setFillColor(40, 40, 40)
        pdf.rect(M, Y, PW - 2 * M, 10, 'F')
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(255, 255, 255)

        // CHARGES
        const chargesCenter = M + half / 2
        pdf.text('CHARGES', chargesCenter, Y + 4.5, { align: 'center' })
        pdf.setFontSize(7); pdf.setTextColor(200, 200, 200)
        if (showN1) {
          pdf.text(String(annee), M + labelW + colW * 0.5, Y + 8, { align: 'center' })
          pdf.text(String(annee - 1), M + labelW + colW * 1.5, Y + 8, { align: 'center' })
        } else {
          pdf.text(String(annee), M + labelW + colW * 0.5, Y + 8, { align: 'center' })
        }

        // Séparateur
        const midX = M + half + 2
        pdf.setDrawColor(255, 255, 255); pdf.setLineWidth(0.5)
        pdf.line(midX, Y, midX, Y + 10)

        // PRODUITS
        const produitsCenter = midX + half / 2
        pdf.setFontSize(9); pdf.setTextColor(255, 255, 255)
        pdf.text('PRODUITS', produitsCenter, Y + 4.5, { align: 'center' })
        pdf.setFontSize(7); pdf.setTextColor(200, 200, 200)
        if (showN1) {
          pdf.text(String(annee), midX + labelW + colW * 0.5, Y + 8, { align: 'center' })
          pdf.text(String(annee - 1), midX + labelW + colW * 1.5, Y + 8, { align: 'center' })
        } else {
          pdf.text(String(annee), midX + labelW + colW * 0.5, Y + 8, { align: 'center' })
        }

        Y += 10
      }
      drawTableHeader()

      // ── Lignes de données ──────────────────────────────────────────────
      const midX = M + half + 2
      const ROW = 7

      for (let i = 0; i < maxRows; i++) {
        if (Y + ROW > PH - 30) { pdf.addPage(); Y = M; drawTableHeader() }

        const charCat = allChargesCats[i]
        const prodCat = allProduitsCats[i]
        const isEven  = i % 2 === 0

        if (isEven) {
          pdf.setFillColor(250, 250, 250); pdf.rect(M, Y, PW - 2 * M, ROW, 'F')
        }

        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)

        // Charges
        if (charCat) {
          pdf.setTextColor(50, 50, 50)
          pdf.text(charCat, M + 2, Y + ROW - 2, { maxWidth: labelW - 3 })
          pdf.setTextColor(220, 38, 38); pdf.setFont('helvetica', 'bold')
          pdf.text(eur(statsN.charges[charCat]), M + labelW + colW - 1, Y + ROW - 2, { align: 'right' })
          if (showN1 && statsN1.charges[charCat]) {
            pdf.setTextColor(160, 100, 100); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
            pdf.text(eur(statsN1.charges[charCat] || 0), M + labelW + colW * 2 - 1, Y + ROW - 2, { align: 'right' })
          }
        }

        // Produits
        if (prodCat) {
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(50, 50, 50)
          pdf.text(prodCat, midX + 2, Y + ROW - 2, { maxWidth: labelW - 3 })
          pdf.setTextColor(22, 163, 74); pdf.setFont('helvetica', 'bold')
          pdf.text(eur(statsN.produits[prodCat]), midX + labelW + colW - 1, Y + ROW - 2, { align: 'right' })
          if (showN1 && statsN1.produits[prodCat]) {
            pdf.setTextColor(80, 160, 100); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5)
            pdf.text(eur(statsN1.produits[prodCat] || 0), midX + labelW + colW * 2 - 1, Y + ROW - 2, { align: 'right' })
          }
        }

        pdf.setDrawColor(235, 235, 235); pdf.setLineWidth(0.2)
        pdf.line(M, Y + ROW, PW - M, Y + ROW)
        Y += ROW
      }

      // ── Séparateur avant totaux ────────────────────────────────────────
      pdf.setDrawColor(100, 100, 100); pdf.setLineWidth(0.5)
      pdf.line(M, Y + 2, PW - M, Y + 2)
      Y += 5

      // ── Ligne TOTAUX ───────────────────────────────────────────────────
      if (Y + 9 > PH - 25) { pdf.addPage(); Y = M }
      pdf.setFillColor(60, 60, 60); pdf.rect(M, Y, PW - 2 * M, 9, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(255, 255, 255)
      pdf.text('TOTAL CHARGES', M + 2, Y + 6)
      pdf.text(eur(statsN.totalCharges), M + labelW + colW - 1, Y + 6, { align: 'right' })
      if (showN1) {
        pdf.setFontSize(8); pdf.setTextColor(200, 200, 200)
        pdf.text(eur(statsN1.totalCharges), M + labelW + colW * 2 - 1, Y + 6, { align: 'right' })
      }
      pdf.setFontSize(9); pdf.setTextColor(255, 255, 255)
      pdf.text('TOTAL PRODUITS', midX + 2, Y + 6)
      pdf.text(eur(statsN.totalProduits), midX + labelW + colW - 1, Y + 6, { align: 'right' })
      if (showN1) {
        pdf.setFontSize(8); pdf.setTextColor(200, 200, 200)
        pdf.text(eur(statsN1.totalProduits), midX + labelW + colW * 2 - 1, Y + 6, { align: 'right' })
      }
      Y += 9

      // ── Résultat ───────────────────────────────────────────────────────
      if (Y + 10 > PH - 20) { pdf.addPage(); Y = M }
      const isExcedent = statsN.resultat >= 0
      const resColor: [number, number, number] = isExcedent ? [37, 99, 235] : [245, 158, 11]

      pdf.setFillColor(...resColor); pdf.rect(M, Y, PW - 2 * M, 11, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(255, 255, 255)
      pdf.text(isExcedent ? 'EXCEDENT DE L\'EXERCICE' : 'DEFICIT DE L\'EXERCICE', M + 4, Y + 7.5)
      pdf.text(eur(Math.abs(statsN.resultat)), PW - M - 2, Y + 7.5, { align: 'right' })

      if (showN1 && statsN1.totalProduits > 0) {
        const res1 = statsN1.resultat
        pdf.setFontSize(8); pdf.setTextColor(200, 200, 255)
        pdf.text(`${annee - 1} : ${res1 >= 0 ? '+' : ''}${eur(res1)}`, PW - M - 2, Y + 11.5 + 2, { align: 'right' })
      }
      Y += 14

      // ── Ligne TOTAL GÉNÉRAL ────────────────────────────────────────────
      if (Y + 8 > PH - 15) { pdf.addPage(); Y = M }
      pdf.setFillColor(220, 220, 220); pdf.rect(M, Y, PW - 2 * M, 8, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(40, 40, 40)
      pdf.text('TOTAL GENERAL', M + 2, Y + 5.5)
      pdf.text(eur(isExcedent ? statsN.totalCharges + statsN.resultat : statsN.totalCharges), M + labelW + colW - 1, Y + 5.5, { align: 'right' })
      pdf.text('TOTAL GENERAL', midX + 2, Y + 5.5)
      pdf.text(eur(isExcedent ? statsN.totalProduits : statsN.totalProduits + Math.abs(statsN.resultat)), midX + labelW + colW - 1, Y + 5.5, { align: 'right' })
      Y += 10

      // ── Certification ──────────────────────────────────────────────────
      const certY = Math.min(Y + 6, PH - 35)
      pdf.setFont('helvetica', 'italic'); pdf.setFontSize(8); pdf.setTextColor(100, 100, 100)
      pdf.text(
        `Certifie sincere et veritable, arrête a la somme de ${eur(Math.abs(statsN.resultat))} (${isExcedent ? 'excedent' : 'deficit'}).`,
        PW / 2, certY, { align: 'center' }
      )
      pdf.text(
        `Etabli conformement aux dispositions legales et reglementaires applicables aux associations — Exercice ${annee}`,
        PW / 2, certY + 5, { align: 'center' }
      )

      // ── Signatures ────────────────────────────────────────────────────
      const sigY = PH - 28
      const sigW = 75
      ;[
        { x: M, role: 'LE PRESIDENT' },
        { x: PW - M - sigW, role: 'LE TRESORIER' },
      ].forEach(({ x, role }) => {
        pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.4)
        pdf.rect(x, sigY, sigW, 20)
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(100, 100, 100)
        pdf.text(role, x + sigW / 2, sigY + 6, { align: 'center' })
        pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(160, 160, 160)
        pdf.text('Lu et approuve — Signature :', x + 4, sigY + 17)
      })

      // ── Pied de page ──────────────────────────────────────────────────
      const totalP = (pdf.internal as any).getNumberOfPages()
      for (let p = 1; p <= totalP; p++) {
        pdf.setPage(p)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(160, 160, 160)
        pdf.text(
          `${assocName}  —  Compte de resultat ${annee}  —  Page ${p}/${totalP}  —  Genere le ${new Date().toLocaleDateString('fr-FR')}`,
          PW / 2, PH - 5, { align: 'center' }
        )
      }

      pdf.save(`compte-resultat-${annee}-${assocName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la génération du PDF')
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-5">
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Compte de résultat</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {currentAssociation?.name} — Exercice {annee}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowN1(!showN1)}
            className={cn(
              'px-3 py-2 text-xs font-semibold rounded-lg border transition-colors',
              showN1
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-[var(--color-border)] text-[var(--color-text-muted)]'
            )}
          >
            {showN1 ? `▼ Masquer ${annee - 1}` : `▲ Comparer ${annee - 1}`}
          </button>
          <select
            value={annee}
            onChange={e => setAnnee(Number(e.target.value))}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={generatePDF}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {generating ? 'Génération...' : 'Exporter PDF'}
          </button>
        </div>
      </div>

      {/* ── Résumé rapide ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total produits', val: statsN.totalProduits, prev: statsN1.totalProduits,
            icon: <TrendingUp className="w-4 h-4 text-green-600" />,
            bg: 'bg-green-50 border-green-200', text: 'text-green-700',
          },
          {
            label: 'Total charges', val: statsN.totalCharges, prev: statsN1.totalCharges,
            icon: <TrendingDown className="w-4 h-4 text-red-600" />,
            bg: 'bg-red-50 border-red-200', text: 'text-red-700',
          },
          {
            label: statsN.resultat >= 0 ? 'Excédent' : 'Déficit',
            val: Math.abs(statsN.resultat), prev: Math.abs(statsN1.resultat),
            icon: statsN.resultat >= 0
              ? <TrendingUp className="w-4 h-4 text-blue-600" />
              : <TrendingDown className="w-4 h-4 text-amber-600" />,
            bg: statsN.resultat >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200',
            text: statsN.resultat >= 0 ? 'text-blue-700' : 'text-amber-700',
          },
        ].map((s, i) => {
          const d = showN1 ? delta(s.val, s.prev) : null
          return (
            <div key={i} className={cn('rounded-xl border p-4', s.bg)}>
              <div className="flex items-center gap-2 mb-1">
                {s.icon}
                <span className={cn('text-xs font-semibold uppercase tracking-wide', s.text)}>{s.label}</span>
              </div>
              <p className={cn('text-2xl font-bold', s.text)}>{eur(s.val)}</p>
              {d && (
                <p className={cn('text-xs mt-1 font-medium', d.up ? 'text-green-600' : 'text-red-500')}>
                  {d.up ? '▲' : '▼'} {eur(Math.abs(d.d))} ({d.up ? '+' : ''}{d.p}%) vs {annee - 1}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Tableau double colonne ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
        {/* En-tête */}
        <div className="grid grid-cols-2 divide-x divide-white">
          <div className="bg-red-600 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-white uppercase tracking-widest">Charges</span>
            {showN1 && (
              <div className="flex gap-4">
                <span className="text-xs text-red-200 font-medium">{annee}</span>
                <span className="text-xs text-red-300 font-medium">{annee - 1}</span>
              </div>
            )}
          </div>
          <div className="bg-green-600 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-white uppercase tracking-widest">Produits</span>
            {showN1 && (
              <div className="flex gap-4">
                <span className="text-xs text-green-200 font-medium">{annee}</span>
                <span className="text-xs text-green-300 font-medium">{annee - 1}</span>
              </div>
            )}
          </div>
        </div>

        {/* Lignes */}
        <div className="divide-y divide-[var(--color-border)]">
          {Array.from({ length: maxRows }).map((_, i) => {
            const charCat = allChargesCats[i]
            const prodCat = allProduitsCats[i]
            return (
              <div key={i} className={cn('grid grid-cols-2 divide-x divide-[var(--color-border)]', i % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-secondary)]')}>
                {/* Charges */}
                <div className="px-5 py-3 flex items-center justify-between min-h-[44px]">
                  {charCat ? (
                    <>
                      <div>
                        <span className="text-sm text-[var(--color-text)]">{charCat}</span>
                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                          ({pct(statsN.charges[charCat], statsN.totalCharges)})
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-bold text-red-700">{eur(statsN.charges[charCat])}</p>
                        {showN1 && (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {statsN1.charges[charCat] ? eur(statsN1.charges[charCat]) : '—'}
                          </p>
                        )}
                      </div>
                    </>
                  ) : <span className="text-[var(--color-text-muted)] text-xs">—</span>}
                </div>

                {/* Produits */}
                <div className="px-5 py-3 flex items-center justify-between min-h-[44px]">
                  {prodCat ? (
                    <>
                      <div>
                        <span className="text-sm text-[var(--color-text)]">{prodCat}</span>
                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                          ({pct(statsN.produits[prodCat], statsN.totalProduits)})
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-bold text-green-700">{eur(statsN.produits[prodCat])}</p>
                        {showN1 && (
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {statsN1.produits[prodCat] ? eur(statsN1.produits[prodCat]) : '—'}
                          </p>
                        )}
                      </div>
                    </>
                  ) : <span className="text-[var(--color-text-muted)] text-xs">—</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Ligne totaux */}
        <div className="grid grid-cols-2 divide-x divide-white border-t-2 border-[var(--color-border)]">
          <div className="bg-red-700 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-white">TOTAL CHARGES</span>
            <div className="text-right">
              <p className="text-base font-bold text-white">{eur(statsN.totalCharges)}</p>
              {showN1 && <p className="text-xs text-red-200">{eur(statsN1.totalCharges)}</p>}
            </div>
          </div>
          <div className="bg-green-700 px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-white">TOTAL PRODUITS</span>
            <div className="text-right">
              <p className="text-base font-bold text-white">{eur(statsN.totalProduits)}</p>
              {showN1 && <p className="text-xs text-green-200">{eur(statsN1.totalProduits)}</p>}
            </div>
          </div>
        </div>

        {/* Résultat */}
        <div className={cn(
          'grid grid-cols-2 divide-x divide-white',
          statsN.resultat >= 0 ? 'bg-blue-600' : 'bg-amber-500'
        )}>
          {/* Excédent apparaît côté charges, Déficit côté produits */}
          {statsN.resultat >= 0 ? (
            <>
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold text-white">EXCÉDENT DE L'EXERCICE</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{eur(statsN.resultat)}</p>
                  {showN1 && statsN1.totalProduits > 0 && (
                    <p className="text-xs text-blue-200">
                      {annee - 1} : {statsN1.resultat >= 0 ? '+' : ''}{eur(statsN1.resultat)}
                    </p>
                  )}
                </div>
              </div>
              <div className="px-5 py-4" />
            </>
          ) : (
            <>
              <div className="px-5 py-4" />
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm font-bold text-white">DÉFICIT DE L'EXERCICE</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{eur(Math.abs(statsN.resultat))}</p>
                  {showN1 && statsN1.totalProduits > 0 && (
                    <p className="text-xs text-amber-200">
                      {annee - 1} : {statsN1.resultat >= 0 ? '+' : ''}{eur(statsN1.resultat)}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Total général — équilibre les deux colonnes */}
        <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
          {[
            statsN.resultat >= 0
              ? statsN.totalCharges + statsN.resultat
              : statsN.totalCharges,
            statsN.resultat >= 0
              ? statsN.totalProduits
              : statsN.totalProduits + Math.abs(statsN.resultat),
          ].map((total, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wide">Total général</span>
              <span className="text-sm font-bold text-[var(--color-text)]">{eur(total)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mention légale */}
      <p className="text-xs text-[var(--color-text-muted)] text-center">
        Document établi conformément aux dispositions applicables aux associations loi 1901.
        Certifié sincère et véritable par le trésorier.
      </p>
    </div>
  )
}
