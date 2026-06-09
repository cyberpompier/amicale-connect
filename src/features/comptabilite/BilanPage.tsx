import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useComptes } from '@/hooks/useComptes'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Wallet, Calendar, BarChart3, Building2, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const MOIS_LONG = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

type Vue = 'mensuelle' | 'trimestrielle'

// ── Helpers ───────────────────────────────────────────────────────────────────
function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return null
  return ((current - prev) / prev) * 100
}

function BadgeDelta({ current, prev, inverse = false }: { current: number; prev: number; inverse?: boolean }) {
  const pct = pctChange(current, prev)
  if (pct === null) return <span className="text-xs text-gray-400">—</span>
  const positive = inverse ? pct < 0 : pct > 0
  const neutral = Math.abs(pct) < 0.5
  if (neutral) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-400">
      <Minus className="w-3 h-3" />0%
    </span>
  )
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', positive ? 'text-green-600' : 'text-red-600')}>
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

// ── Barre de progression catégorie ────────────────────────────────────────────
function CatBar({ name, amount, total, color }: { name: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-[var(--color-text)] truncate max-w-[55%]">{name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[var(--color-text-muted)]">{pct.toFixed(1)}%</span>
          <span className="text-sm font-semibold" style={{ color }}>{formatCurrency(amount)}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export function BilanPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [vue, setVue] = useState<Vue>('mensuelle')
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Données N et N-1
  const { transactions: txN,  loading: lN  } = useTransactions({ from: `${selectedYear}-01-01`,   to: `${selectedYear}-12-31`   })
  const { transactions: txN1, loading: lN1 } = useTransactions({ from: `${selectedYear-1}-01-01`, to: `${selectedYear-1}-12-31` })
  const { comptes } = useComptes()

  const loading = lN || lN1

  // ── Agrégats globaux ──────────────────────────────────────────────────────
  const agg = useMemo(() => {
    const calc = (txs: typeof txN) => {
      const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      return { income, expense, balance: income - expense }
    }
    return { n: calc(txN), n1: calc(txN1) }
  }, [txN, txN1])

  // ── Stats mensuelles ──────────────────────────────────────────────────────
  const monthly = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const tx = txN.filter(t => new Date(t.date + 'T00:00:00').getMonth() + 1 === m)
    const income  = tx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { mois: MOIS[i], moisLong: MOIS_LONG[i], income, expense, solde: income - expense }
  }), [txN])

  // ── Stats trimestrielles ──────────────────────────────────────────────────
  const quarterly = useMemo(() => [
    { label: 'T1', mois: 'Jan–Mar', months: [0,1,2] },
    { label: 'T2', mois: 'Avr–Jun', months: [3,4,5] },
    { label: 'T3', mois: 'Jul–Sep', months: [6,7,8] },
    { label: 'T4', mois: 'Oct–Déc', months: [9,10,11] },
  ].map(q => {
    const income  = q.months.reduce((s, i) => s + monthly[i].income,  0)
    const expense = q.months.reduce((s, i) => s + monthly[i].expense, 0)
    return { ...q, income, expense, solde: income - expense }
  }), [monthly])

  // ── Catégories ────────────────────────────────────────────────────────────
  const catIncome = useMemo(() => {
    const acc: Record<string, number> = {}
    txN.filter(t => t.type === 'income').forEach(t => {
      const c = t.categories?.name || 'Sans catégorie'
      acc[c] = (acc[c] || 0) + Number(t.amount)
    })
    return Object.entries(acc).sort(([,a],[,b]) => b - a)
  }, [txN])

  const catExpense = useMemo(() => {
    const acc: Record<string, number> = {}
    txN.filter(t => t.type === 'expense').forEach(t => {
      const c = t.categories?.name || 'Sans catégorie'
      acc[c] = (acc[c] || 0) + Number(t.amount)
    })
    return Object.entries(acc).sort(([,a],[,b]) => b - a)
  }, [txN])

  // ── Répartition par compte ────────────────────────────────────────────────
  const parCompte = useMemo(() => comptes.map(c => {
    const txC = txN.filter(t => t.compte_id === c.id)
    const income  = txC.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = txC.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { ...c, income, expense, solde: income - expense, nb: txC.length }
  }).filter(c => c.nb > 0), [comptes, txN])

  // ── KPIs enrichis ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const actifs = monthly.filter(m => m.income > 0 || m.expense > 0)
    const moisPlusCharge = [...monthly].sort((a, b) => (b.income + b.expense) - (a.income + a.expense))[0]
    const moyDepMensuelle = actifs.length > 0 ? agg.n.expense / actifs.length : 0
    const txPointees = txN.filter(t => t.pointee)
    const tauxPointage = txN.length > 0 ? (txPointees.length / txN.length) * 100 : 0
    return { moisPlusCharge, moyDepMensuelle, tauxPointage }
  }, [monthly, agg, txN])

  // ── Calcul max pour les barres ────────────────────────────────────────────
  const barData = vue === 'mensuelle' ? monthly : quarterly.map(q => ({ mois: q.label, moisLong: q.mois, income: q.income, expense: q.expense, solde: q.solde }))
  const maxBar = Math.max(...barData.map(d => Math.max(d.income, d.expense)), 1)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Bilan {selectedYear}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Vue d'ensemble financière de l'exercice</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPIs principaux ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Recettes', icon: <TrendingUp className="w-4 h-4 text-green-600" />,
            bg: 'bg-green-50 border-green-200', val: agg.n.income, color: 'text-green-700',
            delta: <BadgeDelta current={agg.n.income} prev={agg.n1.income} />,
            sub: `${txN.filter(t=>t.type==='income').length} écritures`,
          },
          {
            label: 'Dépenses', icon: <TrendingDown className="w-4 h-4 text-red-600" />,
            bg: 'bg-red-50 border-red-200', val: agg.n.expense, color: 'text-red-700',
            delta: <BadgeDelta current={agg.n.expense} prev={agg.n1.expense} inverse />,
            sub: `${txN.filter(t=>t.type==='expense').length} écritures`,
          },
          {
            label: 'Résultat net', icon: <Wallet className="w-4 h-4 text-blue-600" />,
            bg: agg.n.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200',
            val: agg.n.balance, color: agg.n.balance >= 0 ? 'text-blue-700' : 'text-amber-700',
            delta: <BadgeDelta current={agg.n.balance} prev={agg.n1.balance} />,
            sub: agg.n.income > 0 ? `${((agg.n.balance / agg.n.income) * 100).toFixed(1)}% des recettes` : '—',
          },
          {
            label: 'Moy. dép./mois', icon: <BarChart3 className="w-4 h-4 text-purple-600" />,
            bg: 'bg-purple-50 border-purple-200', val: kpis.moyDepMensuelle, color: 'text-purple-700',
            delta: null,
            sub: kpis.moisPlusCharge.income + kpis.moisPlusCharge.expense > 0
              ? `Pic : ${kpis.moisPlusCharge.moisLong}` : 'Aucune activité',
          },
        ].map((k, i) => (
          <div key={i} className={cn('rounded-xl border p-4', k.bg)}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                {k.icon}
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">{k.label}</span>
              </div>
              {k.delta}
            </div>
            <p className={cn('text-2xl font-bold', k.color)}>{formatCurrency(Math.abs(k.val))}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Comparaison N-1 ────────────────────────────────────────────────── */}
      {(agg.n1.income > 0 || agg.n1.expense > 0) && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] px-5 py-3 flex items-center gap-6 flex-wrap shadow-[var(--shadow-sm)]">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">vs {selectedYear-1}</span>
          {[
            { label: 'Recettes',  n: agg.n.income,  n1: agg.n1.income,  color: 'text-green-700' },
            { label: 'Dépenses',  n: agg.n.expense, n1: agg.n1.expense, color: 'text-red-700'   },
            { label: 'Résultat',  n: agg.n.balance, n1: agg.n1.balance, color: 'text-blue-700'  },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">{r.label} :</span>
              <span className={cn('text-sm font-bold', r.color)}>{formatCurrency(r.n)}</span>
              <span className="text-xs text-[var(--color-text-muted)]">vs {formatCurrency(r.n1)}</span>
              <BadgeDelta current={r.n} prev={r.n1} inverse={r.label === 'Dépenses'} />
            </div>
          ))}
        </div>
      )}

      {/* ── Évolution mensuelle / trimestrielle ────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
            <h2 className="text-sm font-bold text-[var(--color-text)]">Évolution {vue}</h2>
          </div>
          <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-xs font-semibold">
            {(['mensuelle', 'trimestrielle'] as Vue[]).map(v => (
              <button key={v} onClick={() => setVue(v)}
                className={cn('px-3 py-1.5 transition-colors capitalize',
                  vue === v ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]')}>
                {v === 'mensuelle' ? 'Mensuel' : 'Trimestriel'}
              </button>
            ))}
          </div>
        </div>

        {/* Légende */}
        <div className="flex items-center gap-4 mb-4 text-xs text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />Recettes</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Dépenses</span>
        </div>

        {/* Graphique à barres */}
        <div className={cn('flex items-end gap-1 h-40', vue === 'mensuelle' ? 'gap-1' : 'gap-4')}>
          {barData.map((d, i) => {
            const hIncome  = maxBar > 0 ? (d.income  / maxBar) * 100 : 0
            const hExpense = maxBar > 0 ? (d.expense / maxBar) * 100 : 0
            const isEmpty  = d.income === 0 && d.expense === 0
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex items-end gap-0.5 h-32">
                  {/* Barre recettes */}
                  <div className="flex-1 flex flex-col justify-end">
                    <div
                      title={`${d.moisLong ?? d.mois} — Recettes : ${formatCurrency(d.income)}`}
                      className={cn('w-full rounded-t transition-all duration-500 cursor-default',
                        isEmpty ? 'bg-gray-100' : 'bg-green-400 group-hover:bg-green-500')}
                      style={{ height: isEmpty ? '4px' : `${Math.max(hIncome, 2)}%` }}
                    />
                  </div>
                  {/* Barre dépenses */}
                  <div className="flex-1 flex flex-col justify-end">
                    <div
                      title={`${d.moisLong ?? d.mois} — Dépenses : ${formatCurrency(d.expense)}`}
                      className={cn('w-full rounded-t transition-all duration-500 cursor-default',
                        isEmpty ? 'bg-gray-100' : 'bg-red-400 group-hover:bg-red-500')}
                      style={{ height: isEmpty ? '4px' : `${Math.max(hExpense, 2)}%` }}
                    />
                  </div>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] font-medium">{d.mois}</span>
                {/* Solde sous le label */}
                {(d.income > 0 || d.expense > 0) && (
                  <span className={cn('text-[9px] font-bold hidden group-hover:block',
                    d.solde >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {d.solde >= 0 ? '+' : ''}{formatCurrency(d.solde)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Catégories ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recettes */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="text-sm font-bold text-[var(--color-text)]">Recettes par catégorie</h2>
            </div>
            <span className="text-xs font-bold text-green-700">{formatCurrency(agg.n.income)}</span>
          </div>
          {catIncome.length === 0
            ? <p className="text-sm text-[var(--color-text-muted)] text-center py-6">Aucune recette</p>
            : <div className="space-y-3">
                {catIncome.map(([cat, amt]) => (
                  <CatBar key={cat} name={cat} amount={amt} total={agg.n.income} color="#16a34a" />
                ))}
              </div>
          }
        </div>

        {/* Dépenses */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="text-sm font-bold text-[var(--color-text)]">Dépenses par catégorie</h2>
            </div>
            <span className="text-xs font-bold text-red-700">{formatCurrency(agg.n.expense)}</span>
          </div>
          {catExpense.length === 0
            ? <p className="text-sm text-[var(--color-text-muted)] text-center py-6">Aucune dépense</p>
            : <div className="space-y-3">
                {catExpense.map(([cat, amt]) => (
                  <CatBar key={cat} name={cat} amount={amt} total={agg.n.expense} color="#dc2626" />
                ))}
              </div>
          }
        </div>
      </div>

      {/* ── Répartition par compte ─────────────────────────────────────────── */}
      {parCompte.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-[var(--color-text-muted)]" />
            <h2 className="text-sm font-bold text-[var(--color-text)]">Répartition par compte</h2>
          </div>
          <div className="space-y-4">
            {parCompte.map(c => {
              const totalMvt = c.income + c.expense
              const pctIncome  = totalMvt > 0 ? (c.income  / totalMvt) * 100 : 0
              const pctExpense = totalMvt > 0 ? (c.expense / totalMvt) * 100 : 0
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                        style={{ backgroundColor: c.couleur + '20' }}>
                        {c.icone}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">{c.nom}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{c.nb} transaction{c.nb > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-bold', c.solde >= 0 ? 'text-green-700' : 'text-red-700')}>
                        {c.solde >= 0 ? '+' : ''}{formatCurrency(c.solde)}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        <span className="text-green-600">+{formatCurrency(c.income)}</span>
                        {' / '}
                        <span className="text-red-600">-{formatCurrency(c.expense)}</span>
                      </p>
                    </div>
                  </div>
                  {/* Barre bicolore recettes/dépenses */}
                  <div className="h-2 rounded-full overflow-hidden flex">
                    <div className="bg-green-400 transition-all duration-500" style={{ width: `${pctIncome}%` }} />
                    <div className="bg-red-400  transition-all duration-500" style={{ width: `${pctExpense}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Pointage global ────────────────────────────────────────────────── */}
      {txN.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--color-text)]">Avancement du pointage</h2>
            <span className="text-xs font-bold text-[var(--color-primary)]">{kpis.tauxPointage.toFixed(1)}% pointé</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: `${kpis.tauxPointage}%` }} />
          </div>
          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>{txN.filter(t => t.pointee).length} écritures pointées</span>
            <span>{txN.filter(t => !t.pointee).length} restantes</span>
          </div>
        </div>
      )}

    </div>
  )
}
