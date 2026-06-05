export interface CalendarEvent {
  titre: string
  date: string
  heure?: string | null
  lieu?: string | null
  description?: string | null
}

export function generateICalendar(event: CalendarEvent): string {
  const now = new Date().toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z'

  const startDate = event.date.replace(/-/g, '')
  const startTime = event.heure ? event.heure.replace(/:/g, '') + '00' : '090000'
  const dtstart = `${startDate}T${startTime}`

  const endDate = event.date.replace(/-/g, '')
  const endTime = event.heure ? addHours(event.heure, 2).replace(/:/g, '') + '00' : '170000'
  const dtend = `${endDate}T${endTime}`

  const description = (event.description && event.description.trim()) ? event.description.replace(/\n/g, '\\n') : event.titre

  const uid = `${event.titre.toLowerCase().replace(/\s+/g, '-')}-${event.date}@amicaleconnect`

  const locationLine = event.lieu && event.lieu.trim() ? `LOCATION:${event.lieu}` : ''

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Amicale Connect//Amicale Connect//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${event.titre}
X-WR-TIMEZONE:Europe/Paris
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${event.titre}
DESCRIPTION:${description}
${locationLine}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`
}

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number)
  const newHours = (h + hours) % 24
  return `${String(newHours).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function downloadICalendar(event: CalendarEvent): void {
  const ics = generateICalendar(event)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.href = url
  link.download = `${event.titre.toLowerCase().replace(/\s+/g, '-')}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
