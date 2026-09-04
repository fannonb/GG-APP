import { formatTime12h } from '@/utils/format'

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

type HoursDay = { open: boolean; from: string; to: string }

function nextOpenLabel(
  hours: Record<string, HoursDay> | undefined,
  fromDayIndex: number,
): string | null {
  if (!hours) return null
  for (let offset = 1; offset <= 7; offset++) {
    const key = DAY_KEYS[(fromDayIndex + offset) % 7]
    const day = hours[key]
    if (day?.open && day.from) {
      const when = offset === 1 ? 'tomorrow' : key
      return `Opens ${when} ${formatTime12h(day.from)}`
    }
  }
  return null
}

/** Short browse label: “Open until 6:00 PM”, “Closed today”, or “Open 24 hours”. */
export function getProviderHoursSummary(provider: {
  status?: 'open' | 'closed'
  hours?: string
  openingHours?: Record<string, HoursDay>
}): string {
  const hoursStr = provider.hours?.trim()
  if (hoursStr?.toLowerCase() === '24/7') return 'Open 24 hours'

  const todayIndex = new Date().getDay()
  const today = provider.openingHours?.[DAY_KEYS[todayIndex]]

  if (today) {
    const allDay = today.from === '00:00' && (today.to === '23:59' || today.to === '00:00')
    if (provider.status === 'open' && today.open && allDay) return 'Open 24 hours'
    if (provider.status === 'open' && today.open && today.to) {
      return `Open until ${formatTime12h(today.to)}`
    }
    if (today.open && today.from) return `Opens ${formatTime12h(today.from)}`
    return nextOpenLabel(provider.openingHours, todayIndex) ?? 'Closed today'
  }

  if (provider.status === 'open') {
    return hoursStr && hoursStr !== '—' ? hoursStr : 'Open now'
  }
  return hoursStr && hoursStr !== '—' ? hoursStr : 'Closed'
}
