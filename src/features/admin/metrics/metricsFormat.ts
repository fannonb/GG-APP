import { C, font } from '@/design-system/tokens'
import { getCountryByCode } from '@/config/countries'
import { formatAmount } from '@/utils/format'
import type { AdminCountryFilter } from '@/features/admin/AdminCountryContext'
import type { MetricsCountry } from '@/types/admin-metrics.types'

export const CYAN_DEEP = '#0B7BC0'
/** Series colours, in order. Cyan first to match the app; then distinct hues. */
export const PALETTE = ['#0B7BC0', '#38B6FF', '#15803D', '#F59E0B', '#7C3AED', '#DC2626', '#94A3B8']
export const STATUS_COLORS = { good: '#15803D', wait: '#F59E0B', bad: '#DC2626', info: '#0B7BC0', muted: '#94A3B8' }

const COUNTRY_NAME: Record<MetricsCountry, string> = { KE: 'Kenya', ZW: 'Zimbabwe', ZM: 'Zambia' }

export const countryName = (code: string | null | undefined) => (code && COUNTRY_NAME[code as MetricsCountry]) || code || '—'

/** Money is always shown in the country's own currency. */
export function money(country: MetricsCountry | string, value: number | null | undefined, compact = false) {
  if (value == null) return '—'
  const symbol = getCountryByCode(country)?.currencySymbol ?? ''
  if (compact && Math.abs(value) >= 10_000) {
    const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    return `${symbol.replace(/\.$/, '').replace(/^Ksh$/i, 'KSh')} ${short}`
  }
  return formatAmount(Math.round(value), symbol)
}

export function prettyCategory(value: string | null | undefined) {
  if (!value) return 'Other'
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ')
}

export const chartAxis = { fontSize: 12, fill: C.textSub, fontFamily: font.family }
export const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(13,30,66,0.12)', fontFamily: font.family, fontSize: 13 },
  labelStyle: { color: C.text, fontWeight: 700, marginBottom: 4 },
}

/** Downloads rows as a CSV the admin can open in Excel or Sheets. */
export function exportCsv(filename: string, rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (v: string | number | null) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}


const COUNTRY_CODES: Record<AdminCountryFilter, MetricsCountry | 'all'> = { all: 'all', Kenya: 'KE', Zimbabwe: 'ZW', Zambia: 'ZM' }

/** The admin top bar stores country names; the metrics API takes codes. */
export const toMetricsCountry = (country: AdminCountryFilter) => COUNTRY_CODES[country]
