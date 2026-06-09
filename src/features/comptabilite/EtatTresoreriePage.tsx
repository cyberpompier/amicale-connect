import { useState, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, Building2 } from 'lucide-react'
import { useComptes, COMPTE_TYPES } from '@/hooks/useComptes'
import { useAssociation } from '@/features/association/AssociationContext'
import { supabase } from '@/lib/supabase'
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
const sign = (n: number) => (n >= 0 ? '+' : '') + eur(n)
const stripEmoji = (s: string) =>
  s.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[☀-➿]/gu, '').replace(/\s{2,}/g, ' ').trim()

// ── Types ─────────────────────────────────────────────────────────────────────
interface MouvementTx {
  kind: 'recette' | 'depense'
  categorie: string
  montant: number
  date: string
}
interface MouvementVir {
  kind: 'virement_recu' | 'virement_emis'
  contrepartie: string // nom du compte source/dest
  description: string
  montant: number
  date: string
}
type Mouvement = MouvementTx | MouvementVir

interface CompteEtat {
  id: string
  nom: string
  type: string
  icone: string
  couleur: string
  solde_initial: number
  soldOuverture: number   // solde au 01/01 de l'année
  encaissements: number
  decaissements: number
  virementsReçus: number
  virementsEmis: number
  soldeCloture: number    // = soldOuverture + enc - dec + virIn - virOut
  mouvements: Mouvement[]
}

// ── Hook données ──────────────────────────────────────────────────────────────
function useEtatTresorerie(annee: number) {
  const { currentAssociation } = useAssociation()
  const { comptes } = useComptes()
  const [etats, setEtats] = useState<CompteEtat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentAssociation || comptes.length === 0) { setLoading(false); return }
    setLoading(true)

    ;(async () => {
      const start = `${annee}-01-01`
      const end   = `${annee}-12-31`
      const prevEnd = `${annee - 1}-12-31`

      // Toutes les transactions de l'association avec compte_id
      const { data: allTx } = await supabase
        .from('transactions')
        .select('id, compte_id, type, amount, date, categories(name)')
        .eq('association_id', currentAssociation.id)
        .not('compte_id', 'is', null)
        .order('date', { ascending: true })

      // Tous les virements de l'association
      const { data: allVir } = await supabase
        .from('virements')
        .select('id, compte_source_id, compte_destination_id, montant, date, description')
        .eq('association_id', currentAssociation.id)
        .order('date', { ascending: true })

      const tx  = allTx  || []
      const vir = allVir || []

      const compteNom: Record<string, string> = {}
      comptes.forEach(c => { compteNom[c.id] = c.nom })

      const result: CompteEtat[] = comptes.map(c => {
        // ── Solde avant l'année (= solde d'ouverture au 01/01) ───────────
        const txAvant  = tx.filter(t => t.compte_id === c.id && t.date <= prevEnd)
        const virAvantIn  = vir.filter(v => v.compte_destination_id === c.id && v.date <= prevEnd)
        const virAvantOut = vir.filter(v => v.compte_source_id      === c.id && v.date <= prevEnd)

        const encAvant  = txAvant.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
        const decAvant  = txAvant.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
        const virInAvant  = virAvantIn.reduce((s, v) => s + Number(v.montant), 0)
        const virOutAvant = virAvantOut.reduce((s, v) => s + Number(v.montant), 0)

        const soldOuverture = Number(c.solde_initial) + encAvant - decAvant + virInAvant - virOutAvant

        // ── Mouvements pendant l'année ────────────────────────────────────
        const txAnnee   = tx.filter(t => t.compte_id === c.id && t.date >= start && t.date <= end)
        const virInAnnee  = vir.filter(v => v.compte_destination_id === c.id && v.date >= start && v.date <= end)
        const virOutAnnee = vir.filter(v => v.compte_source_id      === c.id && v.date >= start && v.date <= end)

        const encaissements  = txAnnee.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
        const decaissements  = txAnnee.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
        const virementsReçus = virInAnnee.reduce((s, v) => s + Number(v.montant), 0)
        const virementsEmis  = virOutAnnee.reduce((s, v) => s + Number(v.montant), 0)

        const soldeCloture = soldOuverture + encaissements - decaissements + virementsReçus - virementsEmis

        // ── Détail des mouvements (pour le tableau) ───────────────────────
        const mouvements: Mouvement[] = [
          ...txAnnee.map(t => ({
            kind: t.type === 'income' ? 'recette' : 'depense' as 'recette' | 'depense',
            categorie: (t.categories as any)?.name || 'Sans catégorie',
            montant: Number(t.amount),
            date: t.date,
          })),
          ...virInAnnee.map(v => ({
            kind: 'virement_recu' as const,
            contrepartie: compteNom[v.compte_source_id] || 'Inconnu',
            description: v.description,
            montant: Number(v.montant),
            date: v.date,
          })),
          ...virOutAnnee.map(v => ({
            kind: 'virement_emis' as const,
            contrepartie: compteNom[v.compte_destination_id] || 'Inconnu',
            description: v.description,
            montant: Number(v.montant),
            date: v.date,
          })),
        ].sort((a, b) => a.date.localeCompare(b.date))

        return {
          id: c.id,
          nom: c.nom,
          type: COMPTE_TYPES[c.type]?.label ?? c.type,
          icone: c.icone,
          couleur: c.couleur,
          solde_initial: Number(c.solde_initial),
          soldOuverture,
          encaissements,
          decaissements,
          virementsReçus,
          virementsEmis,
          soldeCloture,
          mouvements,
        }
      })

      setEtats(result)
      setLoading(false)
    })()
  }, [currentAssociation, comptes, annee])

  return { etats, loading }
}

// ── Composant ─────────────────────────────────────────────────────────────────
export function EtatTresoreriePage() {
  const currentYear = new Date().getFullYear()
  const [annee, setAnnee] = useState(currentYear)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const { currentAssociation } = useAssociation()
  const { etats, loading } = useEtatTresorerie(annee)

  const totalOuverture  = etats.reduce((s, e) => s + e.soldOuverture, 0)
  const totalEncaiss    = etats.reduce((s, e) => s + e.encaissements, 0)
  const totalDecaiss    = etats.reduce((s, e) => s + e.decaissements, 0)
  const totalVirIn      = etats.reduce((s, e) => s + e.virementsReçus, 0)
  const totalVirOut     = etats.reduce((s, e) => s + e.virementsEmis, 0)
  const totalCloture    = etats.reduce((s, e) => s + e.soldeCloture, 0)

  // ── Export PDF ────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setGenerating(true)
    try {
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const PW = pdf.internal.pageSize.getWidth()   // 210 mm
      const PH = pdf.internal.pageSize.getHeight()  // 297 mm
      const M  = 14                                  // marge gauche/droite
      let Y    = M

      const assocName = stripEmoji(currentAssociation?.name ?? 'Amicale')
      // ── Colonnes strictes : label | montant ───────────────────────────
      // Colonne montant : 35mm, alignement droite strict
      const AMT_COL_START = PW - M - 36   // début colonne montant
      const AMT_W = 35                     // largeur colonne montant
      const AMT_X = AMT_COL_START          // x position colonne montant
      const LBL_W = AMT_COL_START - M - 1 // largeur colonne label

      // ── En-tête ────────────────────────────────────────────────────────
      pdf.setFillColor(180, 20, 20); pdf.rect(0, 0, PW, 18, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.setTextColor(255, 255, 255)
      pdf.text(`${assocName}  —  ETAT DE LA TRESORERIE`, M, 8)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(255, 200, 200)
      pdf.text(`Exercice ${annee}  —  Du 01/01/${annee} au 31/12/${annee}`, M, 14)
      Y = 24

      // ── Synthèse globale (4 cases) ──────────────────────────────────────
      // Chaque case = texte centré — on s'assure que les montants restent dans la case
      const synthW = (PW - 2 * M - 9) / 4   // 4 cases avec 3mm entre elles
      const synthData = [
        { label: 'Tresorerie ouverture', line1: eur(totalOuverture),    line2: `01/01/${annee}`, color: [99, 102, 241] as [number,number,number] },
        { label: 'Encaissements nets',   line1: eur(totalEncaiss - totalDecaiss), line2: 'Recettes - Depenses', color: (totalEncaiss - totalDecaiss) >= 0 ? [22, 163, 74] as [number,number,number] : [220, 38, 38] as [number,number,number] },
        { label: 'Virements internes',   line1: `+${eur(totalVirIn)}`, line2: `-${eur(totalVirOut)}`, color: [99, 102, 241] as [number,number,number] },
        { label: 'Tresorerie cloture',   line1: eur(totalCloture),      line2: `31/12/${annee}`, color: totalCloture >= 0 ? [22, 163, 74] as [number,number,number] : [220, 38, 38] as [number,number,number] },
      ]
      synthData.forEach((s, i) => {
        const bx = M + i * (synthW + 3)
        pdf.setFillColor(245, 245, 245); pdf.roundedRect(bx, Y, synthW, 20, 2, 2, 'F')
        // label (6 pt gris)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(100, 100, 100)
        pdf.text(s.label, bx + synthW / 2, Y + 5, { align: 'center', maxWidth: synthW - 2 })
        // montant principal (8.5 pt coloré, jamais supérieur à la largeur de la case)
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...s.color)
        pdf.text(s.line1, bx + synthW / 2, Y + 12, { align: 'center', maxWidth: synthW - 2 })
        // sous-titre (6 pt gris clair)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6); pdf.setTextColor(140, 140, 140)
        pdf.text(s.line2, bx + synthW / 2, Y + 17, { align: 'center', maxWidth: synthW - 2 })
      })
      Y += 26

      // ── Un bloc par compte ──────────────────────────────────────────────
      for (const e of etats) {
        if (Y + 40 > PH - 20) { pdf.addPage(); Y = M }

        // Titre compte (fond sombre)
        pdf.setFillColor(50, 50, 50); pdf.roundedRect(M, Y, PW - 2 * M, 9, 1.5, 1.5, 'F')
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(255, 255, 255)
        pdf.text(`${stripEmoji(e.nom)}  —  ${e.type}`, M + 3, Y + 6.5, { maxWidth: PW - 2 * M - 6 })
        Y += 9

        // Solde ouverture
        pdf.setFillColor(235, 235, 235); pdf.rect(M, Y, PW - 2 * M, 8, 'F')
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(0, 0, 0)
        pdf.text(`Solde au 01/01/${annee}`, M, Y + 5.5, { maxWidth: LBL_W })
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(0, 0, 0)
        pdf.text(eur(e.soldOuverture), AMT_X, Y + 5.5, { align: 'right', maxWidth: AMT_W })
        Y += 8

        // ── Lignes de mouvement ────────────────────────────────────────
        const ROW = 7
        const drawSectionHeader = (label: string, montant: number, isCredit: boolean, bgColor: [number,number,number]) => {
          if (Y + ROW > PH - 20) { pdf.addPage(); Y = M }
          pdf.setFillColor(...bgColor); pdf.rect(M, Y, PW - 2 * M, ROW - 1, 'F')
          const tc: [number,number,number] = isCredit ? [22, 163, 74] : [220, 38, 38]
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...tc)
          pdf.text(label, M, Y + 5, { maxWidth: LBL_W })
          pdf.text((isCredit ? '+' : '-') + eur(montant), AMT_X, Y + 5, { align: 'right', maxWidth: AMT_W })
          Y += ROW - 1
        }
        const drawMvtRow = (label: string, montant: number, isCredit: boolean) => {
          if (Y + ROW > PH - 20) { pdf.addPage(); Y = M }
          const isEven = Math.round(Y) % 2 === 0
          if (isEven) { pdf.setFillColor(252, 252, 252); pdf.rect(M, Y, PW - 2 * M, ROW - 1, 'F') }
          const tc: [number,number,number] = isCredit ? [22, 163, 74] : [220, 38, 38]
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(60, 60, 60)
          pdf.text(label, M, Y + 5, { maxWidth: LBL_W })
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(...tc)
          pdf.text((isCredit ? '+' : '-') + eur(montant), AMT_X, Y + 5, { align: 'right', maxWidth: AMT_W })
          pdf.setDrawColor(240, 240, 240); pdf.setLineWidth(0.2)
          pdf.line(M, Y + ROW - 1, PW - M, Y + ROW - 1)
          Y += ROW - 1
        }

        if (e.encaissements > 0 || e.decaissements > 0 || e.virementsReçus > 0 || e.virementsEmis > 0) {
          if (e.encaissements > 0) {
            drawSectionHeader('Encaissements (recettes)', e.encaissements, true, [240, 253, 244])
            ;(e.mouvements.filter(m => m.kind === 'recette') as any[]).forEach(m => drawMvtRow(m.categorie, m.montant, true))
          }
          if (e.virementsReçus > 0) {
            drawSectionHeader('Virements recus', e.virementsReçus, true, [238, 242, 255])
            ;(e.mouvements.filter(m => m.kind === 'virement_recu') as any[]).forEach(m =>
              drawMvtRow(`De : ${stripEmoji(m.contrepartie)} — ${m.description}`, m.montant, true))
          }
          if (e.decaissements > 0) {
            drawSectionHeader('Decaissements (depenses)', e.decaissements, false, [254, 242, 242])
            ;(e.mouvements.filter(m => m.kind === 'depense') as any[]).forEach(m => drawMvtRow(m.categorie, m.montant, false))
          }
          if (e.virementsEmis > 0) {
            drawSectionHeader('Virements emis', e.virementsEmis, false, [238, 242, 255])
            ;(e.mouvements.filter(m => m.kind === 'virement_emis') as any[]).forEach(m =>
              drawMvtRow(`Vers : ${stripEmoji(m.contrepartie)} — ${m.description}`, m.montant, false))
          }
        } else {
          pdf.setFont('helvetica', 'italic'); pdf.setFontSize(8); pdf.setTextColor(160, 160, 160)
          pdf.text('Aucun mouvement sur cet exercice.', M, Y + 5)
          Y += 7
        }

        // Solde clôture
        if (Y + 9 > PH - 20) { pdf.addPage(); Y = M }
        const clotColor: [number,number,number] = e.soldeCloture >= 0 ? [22, 163, 74] : [220, 38, 38]
        pdf.setFillColor(...clotColor); pdf.rect(M, Y, PW - 2 * M, 9, 'F')
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255)
        pdf.text(`Solde au 31/12/${annee}`, M, Y + 6, { maxWidth: LBL_W })
        pdf.text(eur(e.soldeCloture), AMT_X, Y + 6, { align: 'right', maxWidth: AMT_W })
        Y += 13
      }

      // ── Synthèse finale ────────────────────────────────────────────────
      if (Y + 28 > PH - 15) { pdf.addPage(); Y = M }
      pdf.setFillColor(30, 30, 30); pdf.rect(M, Y, PW - 2 * M, 26, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(255, 255, 255)
      pdf.text('SYNTHESE — TRESORERIE GLOBALE', M + 4, Y + 7)

      const synthRows: [string, string, [number,number,number]][] = [
        [`Tresorerie au 01/01/${annee}`, eur(totalOuverture), [180, 220, 255]],
        [`  + Encaissements totaux`,     `+${eur(totalEncaiss)}`, [150, 255, 150]],
        [`  - Decaissements totaux`,     `-${eur(totalDecaiss)}`, [255, 180, 180]],
        [`Tresorerie au 31/12/${annee}`, eur(totalCloture), totalCloture >= 0 ? [150, 255, 150] : [255, 180, 180]],
      ]
      synthRows.forEach(([lbl, val, col], i) => {
        const ry = Y + 13 + i * 4.5
        pdf.setFont('helvetica', i === 3 ? 'bold' : 'normal'); pdf.setFontSize(i === 3 ? 8.5 : 8)
        pdf.setTextColor(...col); pdf.text(lbl, M + 4, ry, { maxWidth: PW - 2 * M - AMT_W - 8 })
        pdf.setFont('helvetica', 'bold'); pdf.text(val, AMT_X, ry, { align: 'right', maxWidth: AMT_W })
      })
      Y += 30

      // ── Pied de page ──────────────────────────────────────────────────
      const totalP = (pdf.internal as any).getNumberOfPages()
      for (let p = 1; p <= totalP; p++) {
        pdf.setPage(p)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(160, 160, 160)
        pdf.text(`${assocName}  —  Etat de tresorerie ${annee}  —  Page ${p}/${totalP}  —  ${new Date().toLocaleDateString('fr-FR')}`, PW / 2, PH - 5, { align: 'center' })
      }

      pdf.save(`etat-tresorerie-${annee}-${assocName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Erreur lors de la génération du PDF')
    }
    setGenerating(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">État de trésorerie</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Mouvements par compte — du 01/01/{annee} au 31/12/{annee}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={annee} onChange={e => setAnnee(Number(e.target.value))}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={generatePDF} disabled={generating || etats.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50">
            <Download className="w-4 h-4" />
            {generating ? 'Génération...' : 'Exporter PDF'}
          </button>
        </div>
      </div>

      {/* ── Synthèse globale ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Trésorerie ouverture', sub: `01/01/${annee}`, val: totalOuverture, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', icon: <Building2 className="w-4 h-4 text-indigo-600" /> },
          { label: 'Encaissements nets', sub: `Recettes - Dépenses`, val: totalEncaiss - totalDecaiss, color: (totalEncaiss - totalDecaiss) >= 0 ? 'text-green-700' : 'text-red-700', bg: (totalEncaiss - totalDecaiss) >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200', icon: <TrendingUp className="w-4 h-4 text-green-600" /> },
          { label: 'Décaissements', sub: `Dépenses totales`, val: totalDecaiss, color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: <TrendingDown className="w-4 h-4 text-red-600" /> },
          { label: 'Trésorerie clôture', sub: `31/12/${annee}`, val: totalCloture, color: totalCloture >= 0 ? 'text-green-700' : 'text-red-700', bg: totalCloture >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200', icon: <Building2 className="w-4 h-4 text-green-600" /> },
        ].map((s, i) => (
          <div key={i} className={cn('rounded-xl border p-4', s.bg)}>
            <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{s.label}</span></div>
            <p className={cn('text-2xl font-bold', s.color)}>{eur(Math.abs(s.val))}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Aucun compte ─────────────────────────────────────────────────── */}
      {etats.length === 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[var(--color-text-muted)]">Aucun compte bancaire créé. Créez vos comptes dans l'onglet "Comptes".</p>
        </div>
      )}

      {/* ── Un bloc par compte ────────────────────────────────────────────── */}
      {etats.map(e => (
        <div key={e.id} className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          {/* Barre colorée */}
          <div className="h-1" style={{ backgroundColor: e.couleur }} />

          {/* En-tête compte */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: e.couleur + '20' }}>
                {e.icone}
              </div>
              <div>
                <h2 className="font-semibold text-[var(--color-text)]">{e.nom}</h2>
                <p className="text-xs text-[var(--color-text-muted)]">{e.type}</p>
              </div>
            </div>
            <button onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
              {expandedId === e.id ? 'Masquer détail' : 'Voir détail'}
            </button>
          </div>

          {/* Tableau des soldes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)]">
            {/* Ouverture */}
            <div className="px-5 py-4 bg-[var(--color-bg-secondary)]">
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Solde au 01/01/{annee}</p>
              <p className={cn('text-xl font-bold', e.soldOuverture >= 0 ? 'text-[var(--color-text)]' : 'text-red-600')}>
                {eur(e.soldOuverture)}
              </p>
            </div>

            {/* Mouvements résumé */}
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Mouvements</p>
              {e.encaissements > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">+ Recettes</span>
                  <span className="font-semibold text-green-700">{eur(e.encaissements)}</span>
                </div>
              )}
              {e.virementsReçus > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-indigo-600">+ Virements reçus</span>
                  <span className="font-semibold text-indigo-600">{eur(e.virementsReçus)}</span>
                </div>
              )}
              {e.decaissements > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-600">- Dépenses</span>
                  <span className="font-semibold text-red-600">{eur(e.decaissements)}</span>
                </div>
              )}
              {e.virementsEmis > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-indigo-600">- Virements émis</span>
                  <span className="font-semibold text-indigo-600">{eur(e.virementsEmis)}</span>
                </div>
              )}
              {e.mouvements.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] italic">Aucun mouvement</p>
              )}
            </div>

            {/* Clôture */}
            <div className="px-5 py-4" style={{ backgroundColor: e.couleur + '10' }}>
              <p className="text-xs text-[var(--color-text-muted)] mb-1">Solde au 31/12/{annee}</p>
              <p className={cn('text-xl font-bold', e.soldeCloture >= 0 ? 'text-[var(--color-text)]' : 'text-red-600')}>
                {eur(e.soldeCloture)}
              </p>
              <p className={cn('text-xs mt-1 font-semibold', (e.soldeCloture - e.soldOuverture) >= 0 ? 'text-green-600' : 'text-red-500')}>
                {sign(e.soldeCloture - e.soldOuverture)} sur l'exercice
              </p>
            </div>
          </div>

          {/* Détail dépliable */}
          {expandedId === e.id && e.mouvements.length > 0 && (
            <div className="border-t border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Date</th>
                    <th className="text-left px-5 py-3">Libellé</th>
                    <th className="text-right px-5 py-3">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {e.mouvements.map((m, i) => {
                    const isCredit = m.kind === 'recette' || m.kind === 'virement_recu'
                    const label = m.kind === 'recette' ? (m as any).categorie
                      : m.kind === 'depense' ? (m as any).categorie
                      : m.kind === 'virement_recu' ? `Virement de ${(m as any).contrepartie} — ${(m as any).description}`
                      : `Virement vers ${(m as any).contrepartie} — ${(m as any).description}`
                    const badge = m.kind === 'virement_recu' || m.kind === 'virement_emis'
                      ? <span className="ml-2 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">Virement</span>
                      : null
                    return (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-secondary)]'}>
                        <td className="px-5 py-2.5 text-[var(--color-text-muted)] whitespace-nowrap">
                          {new Date(m.date + 'T00:00:00').toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-5 py-2.5 text-[var(--color-text)]">
                          {label}{badge}
                        </td>
                        <td className={cn('px-5 py-2.5 text-right font-semibold', isCredit ? 'text-green-700' : 'text-red-600')}>
                          {isCredit ? '+' : '-'}{eur(m.montant)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* ── Récapitulatif global ──────────────────────────────────────────── */}
      {etats.length > 1 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold text-[var(--color-text)]">Récapitulatif global</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">Compte</th>
                <th className="text-right px-5 py-3">Ouverture</th>
                <th className="text-right px-5 py-3 hidden sm:table-cell">+ Encaiss.</th>
                <th className="text-right px-5 py-3 hidden sm:table-cell">- Décaiss.</th>
                <th className="text-right px-5 py-3 hidden lg:table-cell">Virements</th>
                <th className="text-right px-5 py-3">Clôture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {etats.map((e, i) => (
                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[var(--color-bg-secondary)]'}>
                  <td className="px-5 py-3 font-medium text-[var(--color-text)]">
                    <span className="mr-1.5">{e.icone}</span>{e.nom}
                  </td>
                  <td className="px-5 py-3 text-right text-[var(--color-text-muted)]">{eur(e.soldOuverture)}</td>
                  <td className="px-5 py-3 text-right text-green-700 hidden sm:table-cell">{e.encaissements > 0 ? `+${eur(e.encaissements)}` : '—'}</td>
                  <td className="px-5 py-3 text-right text-red-600 hidden sm:table-cell">{e.decaissements > 0 ? `-${eur(e.decaissements)}` : '—'}</td>
                  <td className="px-5 py-3 text-right text-indigo-600 hidden lg:table-cell text-xs">
                    {e.virementsReçus > 0 && <span className="block">+{eur(e.virementsReçus)}</span>}
                    {e.virementsEmis > 0 && <span className="block">-{eur(e.virementsEmis)}</span>}
                    {e.virementsReçus === 0 && e.virementsEmis === 0 && '—'}
                  </td>
                  <td className={cn('px-5 py-3 text-right font-bold', e.soldeCloture >= 0 ? 'text-[var(--color-text)]' : 'text-red-600')}>
                    {eur(e.soldeCloture)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-800 text-white">
                <td className="px-5 py-3 font-bold">TOTAL</td>
                <td className="px-5 py-3 text-right font-bold">{eur(totalOuverture)}</td>
                <td className="px-5 py-3 text-right font-bold hidden sm:table-cell">+{eur(totalEncaiss)}</td>
                <td className="px-5 py-3 text-right font-bold hidden sm:table-cell">-{eur(totalDecaiss)}</td>
                <td className="px-5 py-3 text-right hidden lg:table-cell">—</td>
                <td className={cn('px-5 py-3 text-right font-bold text-lg', totalCloture >= 0 ? 'text-green-300' : 'text-red-300')}>
                  {eur(totalCloture)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
