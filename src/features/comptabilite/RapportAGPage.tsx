import { useState, useMemo } from 'react'
import { FileText, Download, TrendingUp, TrendingDown, Wallet, Building2, CheckCircle } from 'lucide-react'
import { useTransactions } from '@/hooks/useTransactions'
import { useComptes } from '@/hooks/useComptes'
import { useVirements } from '@/hooks/useVirements'
import { useAssociation } from '@/features/association/AssociationContext'
import { useBureauPositions } from '@/hooks/useBureauPositions'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import jsPDF from 'jspdf'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const stripEmoji = (s: string) => s.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[☀-➿]/gu, '').replace(/\s{2,}/g, ' ').trim()

// ── Calculs récurrents ────────────────────────────────────────────────────────
function calcStats(transactions: ReturnType<typeof useTransactions>['transactions']) {
  const recettes = transactions.filter(t => t.type === 'income')
  const depenses = transactions.filter(t => t.type === 'expense')
  const totalRecettes = recettes.reduce((s, t) => s + Number(t.amount), 0)
  const totalDepenses = depenses.reduce((s, t) => s + Number(t.amount), 0)
  const resultat = totalRecettes - totalDepenses

  const byCategorie = (type: 'income' | 'expense') =>
    transactions
      .filter(t => t.type === type)
      .reduce((acc, t) => {
        const cat = t.categories?.name || 'Sans catégorie'
        acc[cat] = (acc[cat] || 0) + Number(t.amount)
        return acc
      }, {} as Record<string, number>)

  const parMois = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const tx = transactions.filter(t => new Date(t.date + 'T00:00:00').getMonth() + 1 === m)
    const r = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const d = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { mois: m, recettes: r, depenses: d, solde: r - d }
  })

  return { totalRecettes, totalDepenses, resultat, byCategorie, parMois, recettes, depenses }
}

// ── Composant ─────────────────────────────────────────────────────────────────
export function RapportAGPage() {
  const currentYear = new Date().getFullYear()
  const [annee, setAnnee] = useState(currentYear)
  const [tresorier, setTresorier] = useState('')
  const [president, setPresident] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [generating, setGenerating] = useState(false)

  const { currentAssociation } = useAssociation()
  const { positions } = useBureauPositions()
  const { amicalistes } = useAmicalistes()
  const { comptes } = useComptes()
  const { virements } = useVirements()

  // Transactions N et N-1
  const { transactions: txN } = useTransactions({ from: `${annee}-01-01`, to: `${annee}-12-31` })
  const { transactions: txN1 } = useTransactions({ from: `${annee - 1}-01-01`, to: `${annee - 1}-12-31` })

  const statsN  = useMemo(() => calcStats(txN),  [txN])
  const statsN1 = useMemo(() => calcStats(txN1), [txN1])

  // Pré-remplissage depuis le bureau
  const getMemberName = (amicalisteId: string) => {
    const a = amicalistes.find(m => m.id === amicalisteId)
    return a ? `${a.first_name} ${a.last_name}` : ''
  }

  const bureauTresorier  = positions.find(p => p.position === 'Trésorier')
  const bureauPresident  = positions.find(p => p.position === 'Président')

  // Virements de l'année
  const virementsN = virements.filter(v => v.date.startsWith(String(annee)))

  // ── Barres de progression mois ────────────────────────────────────────────
  const maxMois = Math.max(...statsN.parMois.map(m => Math.max(m.recettes, m.depenses)), 1)

  // ── Génération PDF ────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setGenerating(true)
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const PW = pdf.internal.pageSize.getWidth()
      const PH = pdf.internal.pageSize.getHeight()
      const M = 15
      let Y = M

      const tresorierName = tresorier || (bureauTresorier ? getMemberName(bureauTresorier.amicaliste_id) : '')
      const presidentName = president || (bureauPresident ? getMemberName(bureauPresident.amicaliste_id) : '')
      const assocName = stripEmoji(currentAssociation?.name ?? 'Amicale')

      // ─────────────────────────────────────────────────────────────────────
      // PAGE 1 : COUVERTURE
      // ─────────────────────────────────────────────────────────────────────

      // Fond rouge en-tête
      pdf.setFillColor(180, 20, 20)
      pdf.rect(0, 0, PW, 60, 'F')

      // Logo
      let logoH = 0
      if (currentAssociation?.logo_url) {
        try {
          const res = await fetch(currentAssociation.logo_url)
          if (res.ok) {
            const blob = await res.blob()
            const b64 = await new Promise<string>(r => {
              const rd = new FileReader(); rd.onloadend = () => r(rd.result as string); rd.readAsDataURL(blob)
            })
            logoH = 20
            pdf.addImage(b64, 'JPEG', M, 10, logoH, logoH)
          }
        } catch { /* facultatif */ }
      }

      // Titre couverture
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(255, 255, 255)
      pdf.text(assocName, M + (logoH > 0 ? logoH + 5 : 0), 22)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(13); pdf.setTextColor(255, 200, 200)
      pdf.text('RAPPORT FINANCIER ANNUEL', M + (logoH > 0 ? logoH + 5 : 0), 32)
      pdf.setFontSize(18); pdf.setTextColor(255, 255, 255)
      pdf.text(`Exercice ${annee}`, M + (logoH > 0 ? logoH + 5 : 0), 44)
      pdf.setFontSize(9); pdf.setTextColor(255, 200, 200)
      pdf.text(`Presente en Assemblee Generale`, M + (logoH > 0 ? logoH + 5 : 0), 53)

      Y = 75
      pdf.setTextColor(0, 0, 0)

      // ── 3 grandes cases résumé ──────────────────────────────────────────
      const boxW = (PW - 2 * M - 8) / 3
      const boxes = [
        { label: 'TOTAL RECETTES', val: fmt(statsN.totalRecettes), delta: statsN.totalRecettes - statsN1.totalRecettes, color: [22, 163, 74] as [number, number, number], bg: [240, 253, 244] as [number, number, number] },
        { label: 'TOTAL DEPENSES', val: fmt(statsN.totalDepenses), delta: statsN.totalDepenses - statsN1.totalDepenses, color: [220, 38, 38] as [number, number, number], bg: [254, 242, 242] as [number, number, number] },
        { label: statsN.resultat >= 0 ? 'EXCEDENT' : 'DEFICIT', val: fmt(Math.abs(statsN.resultat)), delta: statsN.resultat - statsN1.resultat, color: statsN.resultat >= 0 ? [37, 99, 235] as [number, number, number] : [245, 158, 11] as [number, number, number], bg: statsN.resultat >= 0 ? [239, 246, 255] as [number, number, number] : [255, 251, 235] as [number, number, number] },
      ]
      boxes.forEach((b, i) => {
        const bx = M + i * (boxW + 4)
        pdf.setFillColor(...b.bg); pdf.roundedRect(bx, Y, boxW, 28, 3, 3, 'F')
        pdf.setDrawColor(...b.color); pdf.roundedRect(bx, Y, boxW, 28, 3, 3, 'S')
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(100, 100, 100)
        pdf.text(b.label, bx + boxW / 2, Y + 7, { align: 'center' })
        pdf.setFontSize(14); pdf.setTextColor(...b.color)
        pdf.text(b.val, bx + boxW / 2, Y + 17, { align: 'center' })
        if (statsN1.totalRecettes > 0) {
          const sign = b.delta >= 0 ? '+' : ''
          pdf.setFontSize(7); pdf.setTextColor(b.delta >= 0 ? 34 : 220, b.delta >= 0 ? 197 : 38, b.delta >= 0 ? 94 : 38)
          pdf.text(`${sign}${fmt(b.delta)} vs ${annee - 1}`, bx + boxW / 2, Y + 25, { align: 'center' })
        }
      })
      Y += 35

      // ── Trésorerie par compte ────────────────────────────────────────────
      if (comptes.length > 0) {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(0, 0, 0)
        pdf.text('ETAT DE LA TRESORERIE', M, Y + 6)
        pdf.setDrawColor(180, 20, 20); pdf.setLineWidth(0.5)
        pdf.line(M, Y + 8, PW - M, Y + 8)
        Y += 13

        const totalTreso = comptes.reduce((s, c) => s + c.solde, 0)

        comptes.forEach(c => {
          const pct = totalTreso !== 0 ? (c.solde / totalTreso) * 100 : 0
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(40, 40, 40)
          pdf.text(stripEmoji(c.nom), M + 2, Y + 5)
          pdf.setTextColor(100, 100, 100); pdf.setFontSize(8)
          pdf.text(stripEmoji(c.type === 'courant' ? 'Compte courant' : c.type === 'caisse' ? 'Caisse' : c.type === 'epargne' ? 'Epargne' : 'Autre'), M + 2, Y + 10)

          // Barre de proportion
          const barW = 50
          const barX = PW - M - barW - 35
          pdf.setFillColor(230, 230, 230); pdf.roundedRect(barX, Y + 1, barW, 4, 1, 1, 'F')
          pdf.setFillColor(180, 20, 20); pdf.roundedRect(barX, Y + 1, Math.max(barW * (pct / 100), 0.5), 4, 1, 1, 'F')
          pdf.setFontSize(7); pdf.setTextColor(120, 120, 120)
          pdf.text(`${pct.toFixed(0)}%`, barX + barW + 2, Y + 5.5)

          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10)
          pdf.setTextColor(c.solde >= 0 ? 22 : 220, c.solde >= 0 ? 163 : 38, c.solde >= 0 ? 74 : 38)
          pdf.text(fmt(c.solde), PW - M, Y + 6, { align: 'right' })

          // Ligne séparatrice
          pdf.setDrawColor(240, 240, 240); pdf.setLineWidth(0.3)
          pdf.line(M, Y + 13, PW - M, Y + 13)
          Y += 14
        })

        // Total trésorerie
        pdf.setFillColor(40, 40, 40); pdf.roundedRect(M, Y, PW - 2 * M, 10, 2, 2, 'F')
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(255, 255, 255)
        pdf.text('TRESORERIE TOTALE', M + 4, Y + 7)
        pdf.text(fmt(totalTreso), PW - M - 2, Y + 7, { align: 'right' })
        Y += 16
      }

      // ── Récap virements ──────────────────────────────────────────────────
      if (virementsN.length > 0) {
        const totalVir = virementsN.reduce((s, v) => s + Number(v.montant), 0)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(80, 80, 80)
        pdf.text(`Virements internes de l'exercice : ${virementsN.length} operation(s) — ${fmt(totalVir)}`, M, Y)
        Y += 8
      }

      // ─────────────────────────────────────────────────────────────────────
      // PAGE 2 : COMPTE DE RÉSULTAT
      // ─────────────────────────────────────────────────────────────────────
      pdf.addPage()
      Y = M

      pdf.setFillColor(180, 20, 20); pdf.rect(0, 0, PW, 16, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(255, 255, 255)
      pdf.text(`COMPTE DE RESULTAT — Exercice ${annee}`, PW / 2, 11, { align: 'center' })
      Y = 24

      // En-tête colonnes
      pdf.setFillColor(60, 60, 60); pdf.rect(M, Y, PW - 2 * M, 8, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255)
      pdf.text('INTITULE', M + 3, Y + 5.5)
      pdf.text('MONTANT', PW - M - 2, Y + 5.5, { align: 'right' })
      Y += 8

      const drawRow = (label: string, amount: number, isTotal = false) => {
        if (Y > PH - 30) { pdf.addPage(); Y = M }
        if (isTotal) {
          pdf.setFillColor(245, 245, 245); pdf.rect(M, Y, PW - 2 * M, 8, 'F')
          pdf.setFont('helvetica', 'bold')
        } else {
          pdf.setFont('helvetica', 'normal')
          if ((Y / 8) % 2 === 0) { pdf.setFillColor(252, 252, 252); pdf.rect(M, Y, PW - 2 * M, 7, 'F') }
        }
        pdf.setFontSize(8.5); pdf.setTextColor(40, 40, 40)
        pdf.text(label, M + 4, Y + (isTotal ? 5.5 : 5))
        pdf.setTextColor(amount >= 0 ? 22 : 220, amount >= 0 ? 163 : 38, amount >= 0 ? 74 : 38)
        pdf.text(fmt(amount), PW - M - 2, Y + (isTotal ? 5.5 : 5), { align: 'right' })
        pdf.setDrawColor(230, 230, 230); pdf.setLineWidth(0.2)
        pdf.line(M, Y + (isTotal ? 8 : 7), PW - M, Y + (isTotal ? 8 : 7))
        Y += isTotal ? 8 : 7
        pdf.setTextColor(0, 0, 0)
      }

      // PRODUITS (recettes)
      pdf.setFillColor(240, 253, 244); pdf.rect(M, Y, PW - 2 * M, 8, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(22, 163, 74)
      pdf.text('PRODUITS (Recettes)', M + 3, Y + 5.5)
      Y += 8

      const produits = Object.entries(statsN.byCategorie('income')).sort(([, a], [, b]) => b - a)
      produits.forEach(([cat, amt]) => drawRow(cat, amt))
      drawRow('TOTAL PRODUITS', statsN.totalRecettes, true)
      Y += 4

      // CHARGES (dépenses)
      pdf.setFillColor(254, 242, 242); pdf.rect(M, Y, PW - 2 * M, 8, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(220, 38, 38)
      pdf.text('CHARGES (Depenses)', M + 3, Y + 5.5)
      Y += 8

      const charges = Object.entries(statsN.byCategorie('expense')).sort(([, a], [, b]) => b - a)
      charges.forEach(([cat, amt]) => drawRow(cat, -amt))
      drawRow('TOTAL CHARGES', -statsN.totalDepenses, true)
      Y += 6

      // RÉSULTAT FINAL
      const resColor: [number, number, number] = statsN.resultat >= 0 ? [37, 99, 235] : [245, 158, 11]
      pdf.setFillColor(...resColor); pdf.rect(M, Y, PW - 2 * M, 12, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(255, 255, 255)
      pdf.text(statsN.resultat >= 0 ? 'EXCEDENT DE L\'EXERCICE' : 'DEFICIT DE L\'EXERCICE', M + 4, Y + 8.5)
      pdf.text(fmt(Math.abs(statsN.resultat)), PW - M - 2, Y + 8.5, { align: 'right' })
      Y += 18

      // Comparaison N-1
      if (statsN1.totalRecettes > 0) {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(100, 100, 100)
        pdf.text(`Exercice precedent ${annee - 1} : Recettes ${fmt(statsN1.totalRecettes)} | Depenses ${fmt(statsN1.totalDepenses)} | Resultat ${statsN1.resultat >= 0 ? '+' : ''}${fmt(statsN1.resultat)}`, M, Y)
        Y += 8
      }

      // ─────────────────────────────────────────────────────────────────────
      // PAGE 3 : ÉVOLUTION MENSUELLE
      // ─────────────────────────────────────────────────────────────────────
      pdf.addPage()
      Y = M

      pdf.setFillColor(180, 20, 20); pdf.rect(0, 0, PW, 16, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(255, 255, 255)
      pdf.text(`EVOLUTION MENSUELLE — Exercice ${annee}`, PW / 2, 11, { align: 'center' })
      Y = 24

      // Tableau mensuel
      const months = ['Janv', 'Fevr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec']
      const colW2 = (PW - 2 * M) / 5

      // En-tête
      pdf.setFillColor(60, 60, 60); pdf.rect(M, Y, PW - 2 * M, 8, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255)
      ;['Mois', 'Recettes', 'Depenses', 'Solde', 'Cumul'].forEach((h, i) => {
        pdf.text(h, M + i * colW2 + (i === 0 ? 3 : colW2 / 2), Y + 5.5, { align: i === 0 ? 'left' : 'center' })
      })
      Y += 8

      let cumul = 0
      statsN.parMois.forEach((m, i) => {
        cumul += m.solde
        const bg = i % 2 === 0 ? [250, 250, 250] : [255, 255, 255]
        pdf.setFillColor(bg[0], bg[1], bg[2]); pdf.rect(M, Y, PW - 2 * M, 8, 'F')
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5)

        pdf.setTextColor(40, 40, 40); pdf.text(months[i], M + 3, Y + 5.5)

        pdf.setTextColor(22, 163, 74)
        pdf.text(m.recettes > 0 ? fmt(m.recettes) : '—', M + colW2 * 1.5, Y + 5.5, { align: 'center' })

        pdf.setTextColor(220, 38, 38)
        pdf.text(m.depenses > 0 ? fmt(m.depenses) : '—', M + colW2 * 2.5, Y + 5.5, { align: 'center' })

        const sc: [number, number, number] = m.solde >= 0 ? [37, 99, 235] : [245, 158, 11]
        pdf.setTextColor(...sc)
        pdf.text((m.solde >= 0 ? '+' : '') + fmt(m.solde), M + colW2 * 3.5, Y + 5.5, { align: 'center' })

        const cc: [number, number, number] = cumul >= 0 ? [22, 163, 74] : [220, 38, 38]
        pdf.setTextColor(...cc)
        pdf.text((cumul >= 0 ? '+' : '') + fmt(cumul), M + colW2 * 4.5, Y + 5.5, { align: 'center' })

        pdf.setDrawColor(230, 230, 230); pdf.line(M, Y + 8, PW - M, Y + 8)
        Y += 8
      })

      // Ligne totaux
      pdf.setFillColor(40, 40, 40); pdf.rect(M, Y, PW - 2 * M, 10, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(255, 255, 255)
      pdf.text('TOTAL', M + 3, Y + 6.5)
      pdf.setTextColor(150, 255, 150)
      pdf.text(fmt(statsN.totalRecettes), M + colW2 * 1.5, Y + 6.5, { align: 'center' })
      pdf.setTextColor(255, 150, 150)
      pdf.text(fmt(statsN.totalDepenses), M + colW2 * 2.5, Y + 6.5, { align: 'center' })
      pdf.setTextColor(255, 255, 255)
      pdf.text((statsN.resultat >= 0 ? '+' : '') + fmt(statsN.resultat), M + colW2 * 3.5, Y + 6.5, { align: 'center' })
      Y += 16

      // ── Commentaire du trésorier ─────────────────────────────────────
      if (commentaire.trim()) {
        Y += 4
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(0, 0, 0)
        pdf.text('COMMENTAIRE DU TRESORIER', M, Y)
        Y += 7
        pdf.setFillColor(248, 248, 248); pdf.roundedRect(M, Y, PW - 2 * M, 30, 2, 2, 'F')
        pdf.setFont('helvetica', 'italic'); pdf.setFontSize(9); pdf.setTextColor(60, 60, 60)
        const lines = pdf.splitTextToSize(stripEmoji(commentaire), PW - 2 * M - 8)
        pdf.text(lines, M + 4, Y + 7)
        Y += 35
      }

      // ── Bloc signatures ──────────────────────────────────────────────
      const signY = Math.min(Y + 10, PH - 50)
      pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(80, 80, 80)
      pdf.text(`Arrête et présenté en Assemblée Générale — Exercice ${annee}`, PW / 2, signY, { align: 'center' })

      const sigW = 70
      const sigXL = M
      const sigXR = PW - M - sigW

      const drawSig = (x: number, role: string, name: string) => {
        pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.4)
        pdf.rect(x, signY + 6, sigW, 22)
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(100, 100, 100)
        pdf.text(role, x + sigW / 2, signY + 12, { align: 'center' })
        if (name) {
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(40, 40, 40)
          pdf.text(name, x + sigW / 2, signY + 18, { align: 'center' })
        }
        pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(160, 160, 160)
        pdf.text('Signature :', x + 4, signY + 26)
      }

      drawSig(sigXL, 'LE PRESIDENT', stripEmoji(presidentName))
      drawSig(sigXR, 'LE TRESORIER', stripEmoji(tresorierName))

      // ─── Pied de page toutes les pages ──────────────────────────────
      const totalP = (pdf.internal as any).getNumberOfPages()
      for (let p = 1; p <= totalP; p++) {
        pdf.setPage(p)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(160, 160, 160)
        pdf.text(
          `${assocName}  —  Rapport financier ${annee}  —  Page ${p}/${totalP}  —  Genere le ${new Date().toLocaleDateString('fr-FR')}`,
          PW / 2, PH - 6, { align: 'center' }
        )
      }

      pdf.save(`rapport-ag-${annee}-${assocName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la génération du PDF')
    }
    setGenerating(false)
  }

  // ── Affichage des noms par défaut du bureau ───────────────────────────────
  const tresorierDisplay = tresorier || (bureauTresorier ? getMemberName(bureauTresorier.amicaliste_id) : '')
  const presidentDisplay = president || (bureauPresident ? getMemberName(bureauPresident.amicaliste_id) : '')

  const totalTreso = comptes.reduce((s, c) => s + c.solde, 0)

  return (
    <div className="space-y-6">
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Rapport financier AG</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Document officiel de présentation des comptes en Assemblée Générale
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* ── Configuration ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-semibold text-[var(--color-text)] uppercase tracking-wide mb-4">
          Informations du rapport
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Président (signature)</label>
            <input
              type="text"
              placeholder={presidentDisplay || 'Nom du président'}
              value={president}
              onChange={e => setPresident(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
            {presidentDisplay && !president && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Auto-rempli depuis le bureau : {presidentDisplay}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Trésorier (signature)</label>
            <input
              type="text"
              placeholder={tresorierDisplay || 'Nom du trésorier'}
              value={tresorier}
              onChange={e => setTresorier(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
            {tresorierDisplay && !tresorier && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Auto-rempli depuis le bureau : {tresorierDisplay}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Commentaire du trésorier (optionnel)</label>
            <textarea
              rows={3}
              placeholder="Commentaires, observations sur l'exercice..."
              value={commentaire}
              onChange={e => setCommentaire(e.target.value)}
              className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]"
            />
          </div>
        </div>
      </div>

      {/* ── Prévisualisation ─────────────────────────────────────────────── */}
      {/* --- Chiffres clés --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Total recettes {annee}</span>
          </div>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(statsN.totalRecettes)}</p>
          {statsN1.totalRecettes > 0 && (
            <p className={cn('text-xs mt-2 font-medium', (statsN.totalRecettes - statsN1.totalRecettes) >= 0 ? 'text-green-600' : 'text-red-500')}>
              {(statsN.totalRecettes - statsN1.totalRecettes) >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(statsN.totalRecettes - statsN1.totalRecettes))} vs {annee - 1}
            </p>
          )}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Total dépenses {annee}</span>
          </div>
          <p className="text-3xl font-bold text-red-700">{formatCurrency(statsN.totalDepenses)}</p>
          {statsN1.totalDepenses > 0 && (
            <p className={cn('text-xs mt-2 font-medium', (statsN.totalDepenses - statsN1.totalDepenses) <= 0 ? 'text-green-600' : 'text-red-500')}>
              {(statsN.totalDepenses - statsN1.totalDepenses) >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(statsN.totalDepenses - statsN1.totalDepenses))} vs {annee - 1}
            </p>
          )}
        </div>
        <div className={cn(
          'rounded-xl p-5 border',
          statsN.resultat >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className={cn('w-4 h-4', statsN.resultat >= 0 ? 'text-blue-600' : 'text-amber-600')} />
            <span className={cn('text-xs font-semibold uppercase tracking-wide', statsN.resultat >= 0 ? 'text-blue-700' : 'text-amber-700')}>
              {statsN.resultat >= 0 ? 'Excédent' : 'Déficit'} {annee}
            </span>
          </div>
          <p className={cn('text-3xl font-bold', statsN.resultat >= 0 ? 'text-blue-700' : 'text-amber-700')}>
            {formatCurrency(Math.abs(statsN.resultat))}
          </p>
          {statsN1.totalRecettes > 0 && (
            <p className="text-xs mt-2 font-medium text-[var(--color-text-muted)]">
              Résultat {annee - 1} : {formatCurrency(statsN1.resultat)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* --- Compte de résultat --- */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--color-primary)]" />
            <h2 className="font-semibold text-[var(--color-text)]">Compte de résultat</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Produits */}
            <div>
              <div className="flex items-center justify-between px-2 py-1.5 bg-green-50 rounded-lg mb-1">
                <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Produits</span>
                <span className="text-sm font-bold text-green-700">{formatCurrency(statsN.totalRecettes)}</span>
              </div>
              {Object.entries(statsN.byCategorie('income')).sort(([,a],[,b])=>b-a).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between px-2 py-1 text-sm">
                  <span className="text-[var(--color-text-muted)]">{cat}</span>
                  <span className="font-medium text-green-700">{formatCurrency(amt)}</span>
                </div>
              ))}
            </div>
            {/* Charges */}
            <div>
              <div className="flex items-center justify-between px-2 py-1.5 bg-red-50 rounded-lg mb-1">
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Charges</span>
                <span className="text-sm font-bold text-red-700">{formatCurrency(statsN.totalDepenses)}</span>
              </div>
              {Object.entries(statsN.byCategorie('expense')).sort(([,a],[,b])=>b-a).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between px-2 py-1 text-sm">
                  <span className="text-[var(--color-text-muted)]">{cat}</span>
                  <span className="font-medium text-red-700">{formatCurrency(amt)}</span>
                </div>
              ))}
            </div>
            {/* Résultat */}
            <div className={cn(
              'flex items-center justify-between px-3 py-2.5 rounded-lg font-bold',
              statsN.resultat >= 0 ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
            )}>
              <span>{statsN.resultat >= 0 ? 'EXCÉDENT' : 'DÉFICIT'}</span>
              <span>{formatCurrency(Math.abs(statsN.resultat))}</span>
            </div>
          </div>
        </div>

        {/* --- État de trésorerie + Évolution mensuelle --- */}
        <div className="space-y-5">
          {/* Trésorerie */}
          {comptes.length > 0 && (
            <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                <h2 className="font-semibold text-[var(--color-text)]">État de trésorerie</h2>
              </div>
              <div className="p-4 space-y-2">
                {comptes.map(c => {
                  const pct = totalTreso !== 0 ? Math.abs(c.solde / totalTreso * 100) : 0
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[var(--color-text)]">{c.icone} {c.nom}</span>
                        <span className={cn('text-sm font-bold', c.solde >= 0 ? 'text-green-700' : 'text-red-600')}>
                          {formatCurrency(c.solde)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: c.couleur }} />
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] mt-2">
                  <span className="text-sm font-bold text-[var(--color-text)]">TOTAL</span>
                  <span className={cn('text-lg font-bold', totalTreso >= 0 ? 'text-green-700' : 'text-red-600')}>
                    {formatCurrency(totalTreso)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Évolution mensuelle */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold text-[var(--color-text)]">Évolution mensuelle</h2>
            </div>
            <div className="p-4">
              <div className="flex items-end gap-1 h-24">
                {statsN.parMois.map((m, i) => {
                  const rH = maxMois > 0 ? (m.recettes / maxMois) * 96 : 0
                  const dH = maxMois > 0 ? (m.depenses / maxMois) * 96 : 0
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][i]}`}>
                      <div className="w-full flex items-end justify-center gap-px" style={{ height: 96 }}>
                        <div className="w-1/2 bg-green-400 rounded-t-sm opacity-80 transition-all" style={{ height: `${rH}%` }} />
                        <div className="w-1/2 bg-red-400 rounded-t-sm opacity-80 transition-all" style={{ height: `${dH}%` }} />
                      </div>
                      <span className="text-[9px] text-[var(--color-text-muted)]">
                        {['J','F','M','A','M','J','J','A','S','O','N','D'][i]}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                  <div className="w-3 h-3 bg-green-400 rounded-sm" /> Recettes
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                  <div className="w-3 h-3 bg-red-400 rounded-sm" /> Dépenses
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Ce que le PDF contiendra --- */}
      <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-5">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">📄 Contenu du PDF généré (3 pages A4)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-[var(--color-text-muted)]">
          {[
            { p: 'Page 1', title: 'Couverture & Trésorerie', items: ['Logo + nom association', 'Résumé recettes/dépenses/résultat', 'Comparaison N vs N-1', 'Solde par compte bancaire'] },
            { p: 'Page 2', title: 'Compte de résultat', items: ['Produits par catégorie', 'Charges par catégorie', 'Excédent ou Déficit', 'Comparaison exercice précédent'] },
            { p: 'Page 3', title: 'Évolution & Signatures', items: ['Tableau mensuel (12 mois)', 'Cumul mensuel', 'Commentaire du trésorier', 'Blocs signatures Président + Trésorier'] },
          ].map(p => (
            <div key={p.p} className="bg-white rounded-lg border border-[var(--color-border)] p-4">
              <p className="text-xs font-bold text-[var(--color-primary)] mb-1">{p.p}</p>
              <p className="font-semibold text-[var(--color-text)] text-sm mb-2">{p.title}</p>
              <ul className="space-y-1">
                {p.items.map(item => (
                  <li key={item} className="flex items-start gap-1.5 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
