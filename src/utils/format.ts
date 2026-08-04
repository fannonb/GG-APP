import {
  format as dateFnsFormat,
  formatDistanceToNow,
  parseISO,
  isValid,
} from 'date-fns'
import { COUNTRIES, getCountryByName } from '@/config/countries'

function toDate(date: string | Date): Date {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? d : new Date(date)
}

export function formatCurrency(amount: number, currencySymbol = ''): string {
  return currencySymbol + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = toDate(date)
  if (options) {
    return d.toLocaleDateString('en-US', options)
  }
  return dateFnsFormat(d, 'MMM d, yyyy')
}

export function formatRelativeTime(date: string | Date): string {
  const d = toDate(date)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  return formatDistanceToNow(d, { addSuffix: true })
}

function resolveCountry(address: string): string | undefined {
  const lower = address?.toLowerCase() ?? ''
  return COUNTRIES.find(c => lower.includes(c.name.toLowerCase()))?.name
}

export function formatPhone(
  phone: string,
  country?: string,
  address?: string,
): { display: string; tel: string } {
  const raw = phone?.trim() ?? ''
  if (!raw) return { display: '—', tel: '' }
  if (raw.startsWith('+')) {
    return { display: raw, tel: raw.replace(/[\s\-(). ]/g, '') }
  }
  const resolvedCountry = country ?? (address ? resolveCountry(address) : undefined)
  const cfg = resolvedCountry ? getCountryByName(resolvedCountry) : undefined
  const display = cfg?.dial ? `${cfg.dial} ${raw}` : raw
  return { display, tel: display.replace(/[\s\-(). ]/g, '') }
}

export function formatDateShort(date: string | Date): string {
  return dateFnsFormat(toDate(date), 'MMM yyyy')
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

/** Haversine great-circle distance between two coordinates, in kilometres. */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371
  const dL = (lat2 - lat1) * Math.PI / 180
  const dN = (lng2 - lng1) * Math.PI / 180
  const a  = Math.sin(dL / 2) ** 2 +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dN / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Format a raw kilometre value to a readable distance string. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/** Straight-line distance fallback when driving distance is unavailable. */
export function getCalculatedDistance(
  provider: { lat?: number | null; lng?: number | null; distance?: string },
  position: { lat: number; lng: number } | null
): string {
  if (position && provider.lat != null && provider.lng != null) {
    const km = haversineDistance(position.lat, position.lng, provider.lat, provider.lng)
    return formatDistance(km)
  }
  return provider.distance || 'Nearby'
}
