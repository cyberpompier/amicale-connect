import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import { useEvenements } from '@/hooks/useEvenements'
import { cn } from '@/lib/utils'

export function PlanningPage() {
  const navigate = useNavigate()
  const { evenements, loading } = useEvenements()
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthYear = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getEventsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return evenements.filter((e) => e.date === dateStr)
  }

  const days = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const isToday = (day: number | null) => {
    if (!day) return false
    const today = new Date()
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Planning des événements</h1>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
        {/* Navigation mois */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-primary)]" />
          </button>
          <h2 className="text-lg font-semibold text-[var(--color-text)] capitalize">{monthYear}</h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-primary)]" />
          </button>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 bg-[var(--color-bg-secondary)]">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-xs font-semibold text-[var(--color-text-muted)] uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grille de dates */}
        <div className="p-2 space-y-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIdx) => {
                const events = day ? getEventsForDate(day) : []
                const today = isToday(day)

                return (
                  <div
                    key={dayIdx}
                    className={cn(
                      'min-h-24 p-1.5 border rounded-lg',
                      day
                        ? today
                          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] border-2'
                          : 'bg-white border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer'
                        : 'bg-[var(--color-bg-secondary)] border-transparent'
                    )}
                  >
                    {day && (
                      <>
                        <div
                          className={cn(
                            'text-xs font-semibold mb-1',
                            today
                              ? 'text-[var(--color-primary)]'
                              : 'text-[var(--color-text-muted)]'
                          )}
                        >
                          {day}
                        </div>
                        <div className="space-y-1">
                          {events.map((event) => (
                            <button
                              key={event.id}
                              onClick={() => navigate(`/evenements/${event.id}`)}
                              className="w-full text-left"
                            >
                              <div className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white text-xs px-2 py-1 rounded transition-colors line-clamp-2">
                                {event.titre}
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Légende des événements du mois */}
      {evenements
        .filter((e) => {
          const d = new Date(e.date + 'T00:00:00')
          return d.getMonth() === month && d.getFullYear() === year
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text)]">
              Événements de {monthYear}
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {evenements
              .filter((e) => {
                const d = new Date(e.date + 'T00:00:00')
                return d.getMonth() === month && d.getFullYear() === year
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((event) => {
                const dateObj = new Date(event.date + 'T00:00:00')
                const dayNum = dateObj.getDate()
                const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' })

                return (
                  <button
                    key={event.id}
                    onClick={() => navigate(`/evenements/${event.id}`)}
                    className="w-full px-5 py-4 hover:bg-[var(--color-bg-secondary)] transition-colors text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 h-14 bg-[var(--color-primary)]/10 rounded-lg flex flex-col items-center justify-center border border-[var(--color-primary)]/20">
                        <div className="text-xs text-[var(--color-text-muted)] font-medium uppercase">
                          {dateObj.toLocaleDateString('fr-FR', { month: 'short' })}
                        </div>
                        <div className="text-lg font-bold text-[var(--color-primary)]">{dayNum}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                          {event.titre}
                        </h4>
                        <p className="text-sm text-[var(--color-text-muted)] capitalize mt-0.5">
                          {dayName}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {event.heure && (
                            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                              <Clock className="w-3.5 h-3.5" />
                              {event.heure}
                            </span>
                          )}
                          {event.lieu && (
                            <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                              <MapPin className="w-3.5 h-3.5" />
                              {event.lieu}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
