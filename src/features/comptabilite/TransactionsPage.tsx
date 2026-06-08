import { useState, useMemo, useRef, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useComptes } from '@/hooks/useComptes'
import { useVirements } from '@/hooks/useVirements'
import { useExportComptabilite, EXPORT_COLS_COMPTA, type ExportColCompta, type ExportTypeFilter } from '@/hooks/useExportComptabilite'
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowRight, Download, FileText, FileJson } from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/utils'

export function TransactionsPage() {
  const [selectedCompteId, setSelectedCompteId] = useState<string>('all')

  const { transactions, loading, stats, addTransaction } = useTransactions(
    undefined,
    selectedCompteId === 'all' ? undefined : selectedCompteId
  )
  const { categories } = useCategories()
  const { comptes, compteDefault } = useComptes()
  const { virements, loading: loadingVir } = useVirements()
  const { buildLignes, exportToExcel, exportToPDF } = useExportComptabilite()

  // ── Export state ────────────────────────────────────────────────────────────
  const today = new Date()
  const [showExport, setShowExport] = useState(false)
  const [exportMois, setExportMois] = useState(today.getMonth() + 1)
  const [exportAnnee, setExportAnnee] = useState(today.getFullYear())
  const [exportTypeFilter, setExportTypeFilter] = useState<ExportTypeFilter>('all')
  const [exportCols, setExportCols] = useState<ExportColCompta[]>(['date', 'description', 'type', 'categorie', 'compte', 'montant'])
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const allCols = Object.keys(EXPORT_COLS_COMPTA) as ExportColCompta[]
  const toggleCol = (c: ExportColCompta) =>
    setExportCols(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])

  // Fermer le menu export au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setExporting(true)
    try {
      const lignes = buildLignes(transactions, virements, comptes, {
        mois: exportMois,
        annee: exportAnnee,
        compteId: selectedCompteId !== 'all' ? selectedCompteId : undefined,
        typeFilter: exportTypeFilter,
      })
      const label = compteActif?.nom
      if (format === 'xlsx') {
        exportToExcel(lignes, exportCols, exportMois, exportAnnee, label)
      } else {
        await exportToPDF(lignes, exportCols, exportMois, exportAnnee, label, compteActif?.solde)
      }
      setShowExport(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur export')
    }
    setExporting(false)
  }

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    compte_id: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const categoryOptions = categories.filter((c) => c.type === formData.type)

  // ── Filtrer les virements selon le compte sélectionné ──────────────────────
  const virementsFiltrés = useMemo(() => {
    if (selectedCompteId === 'all') return virements
    return virements.filter(
      v => v.compte_source_id === selectedCompteId || v.compte_destination_id === selectedCompteId
    )
  }, [virements, selectedCompteId])

  // ── Liste unifiée triée par date décroissante ──────────────────────────────
  type RowTx = { kind: 'tx'; data: typeof transactions[0]; key: string; date: string }
  type RowVir = {
    kind: 'vir'
    data: typeof virements[0]
    key: string
    date: string
    sens: 'entrant' | 'sortant' | 'interne'
    montant: number
  }
  type Row = RowTx | RowVir

  const rows = useMemo<Row[]>(() => {
    const txRows: RowTx[] = transactions.map(t => ({
      kind: 'tx', data: t, key: `tx-${t.id}`, date: t.date,
    }))

    const virRows: RowVir[] = virementsFiltrés.map(v => {
      let sens: RowVir['sens'] = 'interne'
      if (selectedCompteId !== 'all') {
        sens = v.compte_destination_id === selectedCompteId ? 'entrant' : 'sortant'
      }
      return { kind: 'vir', data: v, key: `vir-${v.id}`, date: v.date, sens, montant: Number(v.montant) }
    })

    return [...txRows, ...virRows].sort((a, b) => {
      const d = b.date.localeCompare(a.date)
      return d !== 0 ? d : b.key.localeCompare(a.key)
    })
  }, [transactions, virementsFiltrés, selectedCompteId])

  // ── Stats enrichies avec virements (pour un compte spécifique) ─────────────
  const statsEnrichies = useMemo(() => {
    if (selectedCompteId === 'all') return stats
    const virEntrants  = virementsFiltrés.filter(v => v.compte_destination_id === selectedCompteId).reduce((s, v) => s + Number(v.montant), 0)
    const virSortants  = virementsFiltrés.filter(v => v.compte_source_id === selectedCompteId).reduce((s, v) => s + Number(v.montant), 0)
    return {
      totalIncome:  stats.totalIncome  + virEntrants,
      totalExpense: stats.totalExpense + virSortants,
      balance:      stats.balance      + virEntrants - virSortants,
    }
  }, [stats, virementsFiltrés, selectedCompteId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.amount || !formData.description) return
    setSaving(true)
    try {
      await addTransaction({
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        category_id: formData.category_id || null,
        compte_id: formData.compte_id || null,
        notes: formData.notes || null,
      })
      setFormData({
        type: 'expense', amount: '', description: '',
        date: new Date().toISOString().split('T')[0],
        category_id: '', compte_id: selectedCompteId !== 'all' ? selectedCompteId : '', notes: '',
      })
      setShowForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
    setSaving(false)
  }

  const handleOpenForm = () => {
    setFormData(p => ({
      ...p,
      compte_id: selectedCompteId !== 'all' ? selectedCompteId : (compteDefault?.id ?? ''),
    }))
    setShowForm(!showForm)
  }

  const compteActif = comptes.find(c => c.id === selectedCompteId)
  const isLoading = loading || loadingVir

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={`${rows.length} mouvement${rows.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            {/* ── Bouton Export ── */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExport(!showExport)}
                disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-secondary)] text-[var(--color-text)] text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exporter</span>
              </button>

              {showExport && (
                <div className="absolute right-0 mt-1 w-80 bg-white rounded-xl border border-[var(--color-border)] shadow-xl z-20">
                  {/* Mois / Année */}
                  <div className="p-4 border-b border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Période</p>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={exportMois} onChange={e => setExportMois(Number(e.target.value))}
                        className="px-2 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                      <select value={exportAnnee} onChange={e => setExportAnnee(Number(e.target.value))}
                        className="px-2 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
                        {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Type de mouvements */}
                  <div className="p-4 border-b border-[var(--color-border)]">
                    <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Mouvements</p>
                    <select value={exportTypeFilter} onChange={e => setExportTypeFilter(e.target.value as ExportTypeFilter)}
                      className="w-full px-2 py-1.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
                      <option value="all">Tous</option>
                      <option value="income">Recettes uniquement</option>
                      <option value="expense">Dépenses uniquement</option>
                      <option value="virement">Virements uniquement</option>
                    </select>
                  </div>

                  {/* Colonnes */}
                  <div className="p-4 border-b border-[var(--color-border)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Colonnes</p>
                      <div className="flex gap-1">
                        <button onClick={() => setExportCols([...allCols])} className="px-2 py-0.5 text-xs text-[var(--color-primary)] hover:bg-blue-50 rounded">Tout</button>
                        <button onClick={() => setExportCols([])} className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded">Rien</button>
                      </div>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {allCols.map(col => (
                        <label key={col} className="flex items-center gap-2 p-1.5 hover:bg-[var(--color-bg-secondary)] rounded cursor-pointer text-sm">
                          <input type="checkbox" checked={exportCols.includes(col)} onChange={() => toggleCol(col)}
                            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/25" />
                          <span className="text-[var(--color-text-muted)]">{EXPORT_COLS_COMPTA[col]}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Boutons format */}
                  <button onClick={() => handleExport('xlsx')} disabled={exporting || exportCols.length === 0}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50">
                    <FileJson className="w-4 h-4 text-green-600" />
                    <span>Excel (.xlsx)</span>
                    <span className="ml-auto text-xs text-[var(--color-text-muted)]">+ résumé catégories</span>
                  </button>
                  <button onClick={() => handleExport('pdf')} disabled={exporting || exportCols.length === 0}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50 border-t border-[var(--color-border)]">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span>PDF (.pdf)</span>
                    <span className="ml-auto text-xs text-[var(--color-text-muted)]">mise en page A4</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleOpenForm}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle écriture</span>
              <span className="sm:hidden">Ajouter</span>
            </button>
          </div>
        }
      />

      {/* ── Sélecteur de comptes ──────────────────────────────────────────── */}
      {comptes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
          <button
            onClick={() => setSelectedCompteId('all')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border-2 transition-all flex-shrink-0',
              selectedCompteId === 'all'
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-gray-300 hover:text-[var(--color-text)]'
            )}
          >
            <Wallet className="w-3.5 h-3.5" />
            Tous les comptes
          </button>
          {comptes.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCompteId(c.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border-2 transition-all flex-shrink-0',
                selectedCompteId === c.id
                  ? 'text-white border-transparent'
                  : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-gray-300 hover:text-[var(--color-text)]'
              )}
              style={selectedCompteId === c.id ? { backgroundColor: c.couleur, borderColor: c.couleur } : {}}
            >
              <span>{c.icone}</span>
              {c.nom}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-bold',
                selectedCompteId === c.id ? 'bg-white/25 text-white' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
              )}>
                {c.solde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {compteActif && (
          <div className="sm:col-span-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white mb-1"
            style={{ backgroundColor: compteActif.couleur }}>
            <span className="text-lg">{compteActif.icone}</span>
            <span>{compteActif.nom}</span>
            <span className="ml-auto font-bold text-base">
              Solde : {compteActif.solde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Recettes</span>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-green-700">{formatCurrency(statsEnrichies.totalIncome)}</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Dépenses</span>
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-red-700">{formatCurrency(statsEnrichies.totalExpense)}</p>
        </div>

        <div className="bg-white rounded-xl border border-[var(--color-border)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Solde net</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statsEnrichies.balance >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}>
              <Wallet className={`w-4 h-4 ${statsEnrichies.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
            </div>
          </div>
          <p className={`text-xl font-bold ${statsEnrichies.balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            {formatCurrency(statsEnrichies.balance)}
          </p>
        </div>
      </div>

      {/* ── Formulaire ───────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Nouvelle écriture</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <select value={formData.type}
                onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value as 'income' | 'expense', category_id: '' }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]">
                <option value="expense">Dépense</option>
                <option value="income">Recette</option>
              </select>

              <input type="number" step="0.01" min="0" required value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                placeholder="Montant (€)"
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]" />

              <input type="date" required value={formData.date}
                onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]" />

              <select value={formData.category_id}
                onChange={(e) => setFormData((p) => ({ ...p, category_id: e.target.value }))}
                className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]">
                <option value="">— Catégorie —</option>
                {categoryOptions.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>

              {comptes.length > 0 && (
                <select value={formData.compte_id}
                  onChange={(e) => setFormData((p) => ({ ...p, compte_id: e.target.value }))}
                  className="px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]">
                  <option value="">— Compte —</option>
                  {comptes.map((c) => (<option key={c.id} value={c.id}>{c.icone} {c.nom}</option>))}
                </select>
              )}

              <input type="text" required value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className={cn(
                  'px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]',
                  comptes.length > 0 ? '' : 'sm:col-span-2'
                )} />

              <textarea value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes (optionnel)" rows={2}
                className="sm:col-span-2 px-3 py-2.5 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)] resize-none" />
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Ajout...' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tableau unifié transactions + virements ───────────────────────── */}
      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-16 text-center shadow-[var(--shadow-sm)]">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Aucun mouvement</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-5">
            {selectedCompteId !== 'all' && compteActif
              ? `Aucun mouvement sur le compte "${compteActif.nom}".`
              : 'Commencez à enregistrer les recettes et dépenses de votre amicale.'}
          </p>
          <button onClick={handleOpenForm}
            className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            Ajouter la première écriture
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden shadow-[var(--shadow-sm)]">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)] border-b-2 border-[var(--color-border)]">
                <th className="text-left px-8 py-5 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-widest">Date</th>
                <th className="text-left px-8 py-5 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-widest">Description</th>
                <th className="text-left px-8 py-5 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-widest hidden md:table-cell">Catégorie / Compte</th>
                <th className="text-right px-8 py-5 font-bold text-[var(--color-text-muted)] text-xs uppercase tracking-widest">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {rows.map(row => {
                if (row.kind === 'tx') {
                  const t = row.data
                  const compte = comptes.find(c => c.id === t.compte_id)
                  return (
                    <tr key={row.key} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                      <td className="px-8 py-4">
                        <Link to={`/comptabilite/${t.id}`} className="text-sm text-[var(--color-text-muted)] font-semibold hover:text-[var(--color-primary)]">
                          {formatDateShort(t.date)}
                        </Link>
                      </td>
                      <td className="px-8 py-4">
                        <Link to={`/comptabilite/${t.id}`} className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
                          {t.description}
                        </Link>
                      </td>
                      <td className="px-8 py-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          {t.categories?.name && (
                            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-lg ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {t.categories.name}
                            </span>
                          )}
                          {compte && selectedCompteId === 'all' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white"
                              style={{ backgroundColor: compte.couleur }}>
                              {compte.icone} {compte.nom}
                            </span>
                          )}
                          {!t.categories?.name && !compte && <span className="text-[var(--color-text-muted)]">—</span>}
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <Link to={`/comptabilite/${t.id}`} className={`text-lg font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'income' ? '+' : '−'}{formatCurrency(Number(t.amount))}
                        </Link>
                      </td>
                    </tr>
                  )
                }

                // ── Ligne virement ─────────────────────────────────────────
                const v = row.data
                const isEntrant = row.sens === 'entrant'
                const isInterne = row.sens === 'interne'

                return (
                  <tr key={row.key} className="hover:bg-indigo-50/50 transition-colors bg-indigo-50/20">
                    <td className="px-8 py-4">
                      <span className="text-sm text-[var(--color-text-muted)] font-semibold">
                        {formatDateShort(v.date)}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--color-text)]">{v.description}</p>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-0.5">
                            <span style={{ color: v.compte_source?.couleur }}>{v.compte_source?.icone} {v.compte_source?.nom}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span style={{ color: v.compte_destination?.couleur }}>{v.compte_destination?.icone} {v.compte_destination?.nom}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 hidden md:table-cell">
                      <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-700">
                        Virement
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      {isInterne ? (
                        <span className="text-lg font-bold text-indigo-500">
                          {formatCurrency(row.montant)}
                        </span>
                      ) : (
                        <span className={`text-lg font-bold ${isEntrant ? 'text-green-600' : 'text-red-600'}`}>
                          {isEntrant ? '+' : '−'}{formatCurrency(row.montant)}
                        </span>
                      )}
                    </td>
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
