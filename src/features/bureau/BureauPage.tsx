import { useState, useMemo, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useBureauPositions } from '@/hooks/useBureauPositions'
import { useAmicalistes } from '@/hooks/useAmicalistes'
import { useMenuPermissionsContext } from '@/features/auth/MenuPermissionsContext'
import { useAssociation } from '@/features/association/AssociationContext'
import { Plus, Trash2, Users2, Mail, Phone, LayoutGrid, List, Download } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'
import jsPDF from 'jspdf'

// ── Postes prédéfinis ─────────────────────────────────────────────────────────
const BUREAU_POSITIONS = [
  'Président', 'Vice-président', 'Trésorier', 'Trésorier adjoint',
  'Secrétaire', 'Secrétaire adjoint', 'Conseiller', 'Membre du bureau',
]
const POSITION_ORDER = [
  'Président', 'Vice-président', 'Trésorier', 'Trésorier adjoint',
  'Secrétaire', 'Secrétaire adjoint', 'Conseiller', 'Membre du bureau',
]
const posOrder = (p: string) => { const i = POSITION_ORDER.indexOf(p); return i === -1 ? 99 : i }

// ── Durée du mandat ───────────────────────────────────────────────────────────
function mandateDuration(startDate: string): string {
  const start = new Date(startDate)
  const now   = new Date()
  const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  const years  = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0 && months === 0) return 'Ce mois-ci'
  if (years === 0) return `${months} mois`
  if (months === 0) return `${years} an${years > 1 ? 's' : ''}`
  return `${years} an${years > 1 ? 's' : ''} ${months} mois`
}

const stripEmoji = (s: string) =>
  s.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[☀-➿]/gu, '').replace(/\s{2,}/g, ' ').trim()

type Vue = 'cartes' | 'liste'

export function BureauPage() {
  const { positions, loading, addPosition, endMandate, deletePosition } = useBureauPositions()
  const { amicalistes } = useAmicalistes()
  const { userRole } = useMenuPermissionsContext()
  const { currentAssociation } = useAssociation()
  const canManage = userRole === 'owner' || userRole === 'admin'

  const [vue, setVue] = useState<Vue>('cartes')
  const [showForm, setShowForm] = useState(false)
  const [customPosition, setCustomPosition] = useState(false)
  const [formData, setFormData] = useState({
    position: BUREAU_POSITIONS[0],
    positionCustom: '',
    amicaliste_id: '',
    start_date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)

  const sorted = useMemo(
    () => [...positions].sort((a, b) => posOrder(a.position) - posOrder(b.position)),
    [positions]
  )
  const president      = sorted.find(p => p.position === 'Président')
  const otherPositions = sorted.filter(p => p.position !== 'Président')

  const getMember = (id: string) => amicalistes.find(a => a.id === id)
  const getName   = (id: string) => { const m = getMember(id); return m ? `${m.first_name} ${m.last_name}` : '—' }

  // ── Formulaire ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const pos = customPosition ? formData.positionCustom.trim() : formData.position
    if (!pos || !formData.amicaliste_id) return
    setSaving(true)
    try {
      await addPosition({ position: pos, amicaliste_id: formData.amicaliste_id, start_date: formData.start_date, end_date: null })
      setFormData({ position: BUREAU_POSITIONS[0], positionCustom: '', amicaliste_id: '', start_date: new Date().toISOString().split('T')[0] })
      setCustomPosition(false)
      setShowForm(false)
    } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
    setSaving(false)
  }

  const handleEndMandate = async (id: string) => {
    if (!window.confirm('Terminer ce mandat ?')) return
    try { await endMandate(id) } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }
  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce poste ?')) return
    try { await deletePosition(id) } catch (err) { alert(err instanceof Error ? err.message : 'Erreur') }
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setGenerating(true)
    try {
      // ── Paysage A4 : 297 × 210 mm → contenu 267 mm ──────────────────────
      const pdf  = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' })
      const PW   = pdf.internal.pageSize.getWidth()   // 297
      const PH   = pdf.internal.pageSize.getHeight()  // 210
      const M    = 15
      const assocName = stripEmoji(currentAssociation?.name ?? 'Amicale')
      const annee = new Date().getFullYear()

      // En-tête
      pdf.setFillColor(180, 20, 20); pdf.rect(0, 0, PW, 20, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(255, 255, 255)
      pdf.text(assocName, M, 9)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(255, 200, 200)
      pdf.text(`COMPOSITION DU BUREAU  —  ${annee}`, M, 16)
      let Y = 28

      // Résumé
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(40, 40, 40)
      pdf.text(`${positions.length} poste${positions.length > 1 ? 's' : ''} actif${positions.length > 1 ? 's' : ''}`, M, Y)
      Y += 9

      // ── Colonnes avec espace confortable ──────────────────────────────
      // Contenu: M=15 → PW-M=282, total=267mm
      // POSTE 50 | TITULAIRE 65 | DEPUIS 32 | DURÉE 32 | CONTACT (reste=88mm)
      const COL = {
        pos:     M,           // 15
        name:    M + 52,      // 67
        since:   M + 120,     // 135
        dur:     M + 155,     // 170
        contact: M + 188,     // 203 → reste = 282-203 = 79mm pour le contact
      }
      const CONTACT_W = PW - M - COL.contact   // ~79mm
      const ROW_H = 14

      pdf.setFillColor(50, 50, 50); pdf.rect(M, Y, PW - 2 * M, 8, 'F')
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255)
      pdf.text('POSTE',     COL.pos,     Y + 5.5)
      pdf.text('TITULAIRE', COL.name,    Y + 5.5)
      pdf.text('DEPUIS',    COL.since,   Y + 5.5)
      pdf.text('DURÉE',     COL.dur,     Y + 5.5)
      pdf.text('CONTACT',   COL.contact, Y + 5.5)
      Y += 8

      sorted.forEach((pos, idx) => {
        if (Y + ROW_H > PH - 18) { pdf.addPage(); Y = M }
        const member = getMember(pos.amicaliste_id)
        if (idx % 2 === 0) { pdf.setFillColor(248, 248, 248); pdf.rect(M, Y, PW - 2 * M, ROW_H, 'F') }

        // Poste
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(180, 20, 20)
        pdf.text(stripEmoji(pos.position), COL.pos, Y + 9, { maxWidth: 50 })

        // Titulaire
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(20, 20, 20)
        pdf.text(getName(pos.amicaliste_id), COL.name, Y + 9, { maxWidth: 52 })

        // Depuis
        pdf.setFontSize(8); pdf.setTextColor(100, 100, 100)
        pdf.text(formatDateShort(pos.start_date), COL.since, Y + 9)

        // Durée
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(60, 60, 60)
        pdf.text(mandateDuration(pos.start_date), COL.dur, Y + 9, { maxWidth: 32 })

        // Contact : email ligne 1, téléphone ligne 2
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(80, 80, 80)
        if (member?.email) pdf.text(member.email, COL.contact, Y + 6,  { maxWidth: CONTACT_W })
        if (member?.phone) pdf.text(member.phone, COL.contact, Y + 11, { maxWidth: CONTACT_W })

        pdf.setDrawColor(230, 230, 230); pdf.setLineWidth(0.2)
        pdf.line(M, Y + ROW_H, PW - M, Y + ROW_H)
        Y += ROW_H
      })

      const totalP = (pdf.internal as any).getNumberOfPages()
      for (let p = 1; p <= totalP; p++) {
        pdf.setPage(p)
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(160, 160, 160)
        pdf.text(`${assocName}  —  Bureau ${annee}  —  Généré le ${new Date().toLocaleDateString('fr-FR')}  —  Page ${p}/${totalP}`,
          PW / 2, PH - 5, { align: 'center' })
      }

      pdf.save(`bureau-${annee}-${assocName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    } catch (err) { console.error(err); alert('Erreur lors de la génération du PDF') }
    setGenerating(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Composition du bureau"
        subtitle={`${positions.length} poste${positions.length !== 1 ? 's' : ''} actif${positions.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            {positions.length > 0 && (
              <>
                {/* Toggle vue cartes / liste */}
                <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
                  <button onClick={() => setVue('cartes')} title="Vue cartes"
                    className={cn('px-3 py-2 transition-colors', vue === 'cartes' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]')}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setVue('liste')} title="Vue liste"
                    className={cn('px-3 py-2 transition-colors border-l border-[var(--color-border)]', vue === 'liste' ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]')}>
                    <List className="w-4 h-4" />
                  </button>
                </div>
                {/* Export PDF */}
                <button onClick={generatePDF} disabled={generating}
                  className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{generating ? 'Export...' : 'PDF'}</span>
                </button>
              </>
            )}
            {canManage && (
              <button onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Ajouter un poste</span>
                <span className="sm:hidden">Ajouter</span>
              </button>
            )}
          </div>
        }
      />

      {/* ── Formulaire ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 mb-5 shadow-[var(--shadow-sm)]">
          <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Nouveau poste</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
              {/* Poste */}
              <div>
                {!customPosition ? (
                  <select value={formData.position}
                    onChange={e => setFormData(p => ({ ...p, position: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]">
                    {BUREAU_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                ) : (
                  <input type="text" required value={formData.positionCustom}
                    onChange={e => setFormData(p => ({ ...p, positionCustom: e.target.value }))}
                    placeholder="Intitulé du poste…"
                    className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]" />
                )}
                <button type="button" onClick={() => setCustomPosition(p => !p)}
                  className="mt-1 text-xs text-[var(--color-primary)] hover:underline">
                  {customPosition ? '← Choisir dans la liste' : '+ Poste personnalisé'}
                </button>
              </div>
              {/* Membre */}
              <select required value={formData.amicaliste_id}
                onChange={e => setFormData(p => ({ ...p, amicaliste_id: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]">
                <option value="">— Sélectionner un membre —</option>
                {amicalistes.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
              </select>
              {/* Date */}
              <input type="date" required value={formData.start_date}
                onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]" />
              {/* Boutons */}
              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-[var(--color-border)] text-sm rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">✕</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Vide ───────────────────────────────────────────────────────────── */}
      {positions.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users2 className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun poste défini</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">Commencez par définir la composition de votre bureau.</p>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            Ajouter le premier poste
          </button>
        </div>

      ) : vue === 'cartes' ? (
        // ─── VUE CARTES ──────────────────────────────────────────────────────
        <div className="space-y-6">
          {/* Président */}
          {president && (() => {
            const member = getMember(president.amicaliste_id)
            return (
              <div className="flex justify-center">
                <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] rounded-2xl p-6 text-white text-center max-w-sm w-full shadow-lg">
                  <div className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-3">Président</div>
                  {member?.avatar_url ? (
                    <img src={member.avatar_url} alt={getName(president.amicaliste_id)}
                      className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-white/50" />
                  ) : (
                    <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-white/20 flex items-center justify-center border-2 border-white/30">
                      <span className="text-xl font-bold">{member?.first_name?.[0]}{member?.last_name?.[0]}</span>
                    </div>
                  )}
                  <Link to={`/membres/${president.amicaliste_id}`} className="text-lg font-bold hover:underline underline-offset-2">
                    {getName(president.amicaliste_id)}
                  </Link>
                  <div className="text-sm font-semibold opacity-90 mt-1">{mandateDuration(president.start_date)}</div>
                  <div className="text-xs opacity-60 mt-0.5">Depuis le {formatDateShort(president.start_date)}</div>

                  {(member?.email || member?.phone) && (
                    <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
                      {member?.email && (
                        <a href={`mailto:${member.email}`} className="flex items-center justify-center gap-1.5 text-xs opacity-80 hover:opacity-100 transition-opacity">
                          <Mail className="w-3 h-3" />{member.email}
                        </a>
                      )}
                      {member?.phone && (
                        <a href={`tel:${member.phone}`} className="flex items-center justify-center gap-1.5 text-xs opacity-80 hover:opacity-100 transition-opacity">
                          <Phone className="w-3 h-3" />{member.phone}
                        </a>
                      )}
                    </div>
                  )}

                  {canManage && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-white/20">
                      <button onClick={() => handleEndMandate(president.id)}
                        className="px-3 py-1 text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-lg transition-colors">Terminer</button>
                      <button onClick={() => handleDelete(president.id)} className="p-1.5 text-white/60 hover:text-red-300 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Autres postes */}
          {otherPositions.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-4 px-1">
                Direction & Conseil
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherPositions.map(pos => {
                  const member = getMember(pos.amicaliste_id)
                  return (
                    <div key={pos.id} className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-3">
                        {member?.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[var(--color-primary)]">{member?.first_name?.[0]}{member?.last_name?.[0]}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wide truncate">{pos.position}</div>
                          <Link to={`/membres/${pos.amicaliste_id}`}
                            className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors block truncate">
                            {getName(pos.amicaliste_id)}
                          </Link>
                          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{mandateDuration(pos.start_date)}</div>
                        </div>
                      </div>

                      {(member?.email || member?.phone) && (
                        <div className="space-y-1 pb-3 border-b border-[var(--color-border)] mb-3">
                          {member?.email && (
                            <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors truncate">
                              <Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{member.email}</span>
                            </a>
                          )}
                          {member?.phone && (
                            <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                              <Phone className="w-3 h-3 flex-shrink-0" />{member.phone}
                            </a>
                          )}
                        </div>
                      )}

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEndMandate(pos.id)}
                            className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors flex-1">
                            Terminer
                          </button>
                          <button onClick={() => handleDelete(pos.id)}
                            className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      ) : (
        // ─── VUE LISTE ───────────────────────────────────────────────────────
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-sm)]">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)] border-b-2 border-[var(--color-border)]">
                <th className="text-left px-5 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Poste</th>
                <th className="text-left px-5 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Titulaire</th>
                <th className="text-left px-5 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest hidden md:table-cell">Contact</th>
                <th className="text-left px-5 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest hidden lg:table-cell">Depuis</th>
                <th className="text-left px-5 py-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Durée</th>
                {canManage && <th className="px-5 py-4" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {sorted.map(pos => {
                const member = getMember(pos.amicaliste_id)
                const isPresident = pos.position === 'Président'
                return (
                  <tr key={pos.id} className={cn('hover:bg-[var(--color-bg-secondary)] transition-colors', isPresident && 'bg-red-50/40')}>
                    <td className="px-5 py-4">
                      <span className={cn('text-sm font-bold', isPresident ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]')}>
                        {pos.position}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        {member?.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-[var(--color-primary)]">{member?.first_name?.[0]}{member?.last_name?.[0]}</span>
                          </div>
                        )}
                        <Link to={`/membres/${pos.amicaliste_id}`}
                          className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
                          {getName(pos.amicaliste_id)}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {member?.email && (
                          <a href={`mailto:${member.email}`} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                            <Mail className="w-3 h-3" />{member.email}
                          </a>
                        )}
                        {member?.phone && (
                          <a href={`tel:${member.phone}`} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                            <Phone className="w-3 h-3" />{member.phone}
                          </a>
                        )}
                        {!member?.email && !member?.phone && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <span className="text-sm text-[var(--color-text-muted)]">{formatDateShort(pos.start_date)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                        {mandateDuration(pos.start_date)}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => handleEndMandate(pos.id)}
                            className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors">
                            Terminer
                          </button>
                          <button onClick={() => handleDelete(pos.id)}
                            className="p-1.5 text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
