export const LEDGER_PIN_EXPIRY_OPTIONS: Array<{ value: number | undefined; label: string; note?: string }> = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days', note: 'Recommended' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
  { value: undefined, label: 'Never' },
]

const EXPIRY_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** "3 Feb 2027" for a number of days from `now`, or null for undefined (never). */
export function pinExpiryDate(days: number | undefined, now: number): string | null {
  if (days === undefined) return null
  // Calendar-day arithmetic in local time, so DST changes never shift the date.
  const date = new Date(now)
  date.setDate(date.getDate() + days)
  return EXPIRY_DATE_FORMAT.format(date)
}
