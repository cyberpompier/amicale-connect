import { useMemo } from 'react'
import {
  TrendingUp,
  Users,
  MapPin,
  Package,
  Award,
  Euro,
  CalendarDays,
  Trophy,
} from 'lucide-react'
import { useCalendrierCampagnes } from '@/hooks/useCalendrierCampagnes'
import { useCalendrierStats } from '@/hooks/useCalendrierStats'
import { formatCurrency, formatDateShort } from '@/lib/utils'

export function CalendriersStatistiquesPage() {
  const { activeCampagne, campagnes, loading: campLoading } = useCalendrierCampagnes()
  const {
    amicalisteStats,
    secteurStats,
    dailyVentes,
    totalAmount,
    totalCalendriers,
    totalVentes,
    loading,
  } = useCalendrierStats(activeCampagne?.id)

  const averageBasket = useMemo(
    () => (totalVentes > 0 ? totalAmount / totalVentes : 0),
    [totalAmount, totalVentes]
  )

  const maxDailyAmount = useMemo(
    () => Math.max(...dailyVentes.map((d) => d.amount), 0),
    [dailyVentes]
  )

  const progressionGlobale = useMemo(() => {
    if (!activeCampagne || activeCampagne.objective_amount === 0) return 0
    return Math.min(100, (totalAmount / activeCampagne.objective_amount) * 100)
  }, [activeCampagne, totalAmount])

  if (campLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!activeCampagne) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--color-border)] p-12 text-center shadow-sm">
        <TrendingUp className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)]">
          Aucune campagne active. Lancez une tournée pour commencer à suivre vos statistiques.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Statistiques</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {activeCampagne.name} — {campagnes.length} campagne{campagnes.length > 1 ? 's' : ''} au total
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-white border border-green-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Euro className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Total collecté
            </p>
          </div>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalAmount)}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            Obj. {formatCurrency(Number(activeCampagne.objective_amount))}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Calendriers
            </p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{totalCalendriers}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            Obj. {activeCampagne.objective_calendriers}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Ventes
            </p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{totalVentes}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
            Panier moyen {formatCurrency(averageBasket)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
              Progression
            </p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-text)]">{progressionGlobale.toFixed(0)}%</p>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-primary)] to-orange-500 rounded-full"
              style={{ width: `${progressionGlobale}%` }}
            />
          </div>
        </div>
      </div>

      {/* Évolution des ventes */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
        <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-[var(--color-primary)]" />
          Évolution des ventes
        </h2>
        {dailyVentes.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] italic text-center py-6">
            Aucune vente enregistrée.
          </p>
        ) : (
          <div className="flex items-end gap-1 h-48 border-b border-[var(--color-border)] pb-2">
            {dailyVentes.map((d) => {
              const h = maxDailyAmount > 0 ? (d.amount / maxDailyAmount) * 100 : 0
              return (
                <div
                  key={d.date}
                  className="flex-1 min-w-[12px] flex flex-col items-center justify-end h-full group relative"
                >
                  <div
                    className="w-full bg-gradient-to-t from-[var(--color-primary)] to-orange-400 rounded-t-md transition-all hover:opacity-80"
                    style={{ height: `${Math.max(4, h)}%` }}
                  />
                  <div className="absolute bottom-full mb-2 bg-[var(--color-text)] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {formatDateShort(d.date)} — {formatCurrency(d.amount)} ({d.quantity} cal.)
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {dailyVentes.length > 0 && (
          <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] mt-1">
            <span>{formatDateShort(dailyVentes[0].date)}</span>
            <span>{formatDateShort(dailyVentes[dailyVentes.length - 1].date)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classement amicalistes */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
          <div className="p-5 border-b border-[var(--color-border)]">
            <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
              <Award className="w-4 h-4 text-[var(--color-primary)]" />
              Classement amicalistes
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Les meilleurs contributeurs de la campagne
            </p>
          </div>
          {amicalisteStats.length === 0 ? (
            <p className="p-6 text-xs text-[var(--color-text-muted)] italic text-center">
              Aucune vente enregistrée.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] max-h-[500px] overflow-y-auto">
              {amicalisteStats.map((s, idx) => (
                <li key={s.amicaliste_id} className="p-3 flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : idx === 1
                        ? 'bg-gray-200 text-gray-700'
                        : idx === 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-sm font-bold flex-shrink-0">
                    {s.first_name?.[0]}
                    {s.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                      {s.first_name} {s.last_name}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {s.grade ? `${s.grade} • ` : ''}
                      {s.ventes_count} vente{s.ventes_count > 1 ? 's' : ''} • {s.secteurs_count}{' '}
                      secteur{s.secteurs_count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-600">
                      {formatCurrency(s.total_amount)}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {s.total_calendriers} cal.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Classement secteurs */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
          <div className="p-5 border-b border-[var(--color-border)]">
            <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
              Secteurs les plus performants
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Progression par zone géographique
            </p>
          </div>
          {secteurStats.length === 0 ? (
            <p className="p-6 text-xs text-[var(--color-text-muted)] italic text-center">
              Aucune donnée.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] max-h-[500px] overflow-y-auto">
              {secteurStats.map((s) => (
                <li key={s.secteur_id} className="p-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                        {s.secteur_name}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">
                        {s.ventes_count} vente{s.ventes_count > 1 ? 's' : ''} •{' '}
                        {s.total_calendriers} calendriers
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(s.total_amount)}
                      </p>
                      <p className="text-[11px] font-bold text-[var(--color-primary)]">
                        {s.progression_percent.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${s.progression_percent}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Répartition par amicaliste (donut substitute) */}
      {amicalisteStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm p-5">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[var(--color-primary)]" />
            Répartition des contributions
          </h2>
          <div className="flex w-full h-4 rounded-full overflow-hidden">
            {amicalisteStats.slice(0, 10).map((s, idx) => {
              const pct = totalAmount > 0 ? (s.total_amount / totalAmount) * 100 : 0
              const hue = (idx * 35) % 360
              return (
                <div
                  key={s.amicaliste_id}
                  title={`${s.first_name} ${s.last_name} — ${pct.toFixed(1)}%`}
                  style={{ width: `${pct}%`, backgroundColor: `hsl(${hue}, 70%, 55%)` }}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {amicalisteStats.slice(0, 10).map((s, idx) => {
              const pct = totalAmount > 0 ? (s.total_amount / totalAmount) * 100 : 0
              const hue = (idx * 35) % 360
              return (
                <div key={s.amicaliste_id} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: `hsl(${hue}, 70%, 55%)` }}
                  />
                  <span className="text-[var(--color-text)] font-semibold">
                    {s.first_name} {s.last_name[0]}.
                  </span>
                  <span className="text-[var(--color-text-muted)]">{pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
