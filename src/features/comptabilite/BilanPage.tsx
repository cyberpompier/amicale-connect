import { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { formatCurrency } from '@/lib/utils'
import { PieChart, BarChart3 } from 'lucide-react'

export function BilanPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const startDate = `${selectedYear}-01-01`
  const endDate = `${selectedYear}-12-31`
  const { transactions, loading, stats } = useTransactions({ from: startDate, to: endDate })

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Stats par catégorie
  const incomeByCategory = transactions
    .filter((t) => t.type === 'income')
    .reduce(
      (acc, t) => {
        const catName = t.categories?.name || 'Sans catégorie'
        acc[catName] = (acc[catName] || 0) + Number(t.amount)
        return acc
      },
      {} as Record<string, number>
    )

  const expenseByCategory = transactions
    .filter((t) => t.type === 'expense')
    .reduce(
      (acc, t) => {
        const catName = t.categories?.name || 'Sans catégorie'
        acc[catName] = (acc[catName] || 0) + Number(t.amount)
        return acc
      },
      {} as Record<string, number>
    )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Bilan {selectedYear}</h1>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-5">
          <p className="text-xs text-green-600 font-medium mb-1">Recettes totales</p>
          <p className="text-3xl font-bold text-green-700">{formatCurrency(stats.totalIncome)}</p>
          <p className="text-xs text-green-600 mt-2">{transactions.filter((t) => t.type === 'income').length} écritures</p>
        </div>

        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <p className="text-xs text-red-600 font-medium mb-1">Dépenses totales</p>
          <p className="text-3xl font-bold text-red-700">{formatCurrency(stats.totalExpense)}</p>
          <p className="text-xs text-red-600 mt-2">{transactions.filter((t) => t.type === 'expense').length} écritures</p>
        </div>

        <div className={`${stats.balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'} rounded-xl border p-5`}>
          <p className={`text-xs font-medium mb-1 ${stats.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Solde net</p>
          <p className={`text-3xl font-bold ${stats.balance >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            {formatCurrency(stats.balance)}
          </p>
          <p className={`text-xs mt-2 ${stats.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
            {((stats.balance / stats.totalIncome) * 100).toFixed(1)}% du total recettes
          </p>
        </div>
      </div>

      {/* Détails par catégorie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recettes par catégorie */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold text-green-600">Recettes par catégorie</h2>
          </div>
          {Object.keys(incomeByCategory).length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm">Aucune recette.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(incomeByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text)]">{cat}</span>
                    <span className="text-sm font-medium text-green-700">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Dépenses par catégorie */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-600">Dépenses par catégorie</h2>
          </div>
          {Object.keys(expenseByCategory).length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm">Aucune dépense.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(expenseByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => {
                  const pct = ((amount / stats.totalExpense) * 100).toFixed(1)
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text)]">{cat}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-red-700">{formatCurrency(amount)}</span>
                        <span className="text-xs text-[var(--color-text-muted)] ml-2">({pct}%)</span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
