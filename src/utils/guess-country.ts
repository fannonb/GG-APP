import type { CountryCode } from '@/config/countries'

const TIMEZONE_COUNTRY: Record<string, CountryCode> = {
  'Africa/Nairobi': 'KE',
  'Africa/Harare': 'ZW',
  'Africa/Lusaka': 'ZM',
}

const SUPPORTED: CountryCode[] = ['KE', 'ZW', 'ZM']

/**
 * Best guess at the person's market from the device, used only to pre-select
 * the country on sign-up (they can still change it). Time zone first, since many
 * phones in the region run an en-US locale; then the locale's region.
 */
export function guessCountry(): CountryCode | '' {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (zone && TIMEZONE_COUNTRY[zone]) return TIMEZONE_COUNTRY[zone]
  } catch {
    // Intl unavailable; fall through to the locale.
  }
  for (const locale of navigator.languages ?? [navigator.language]) {
    const region = locale.split('-')[1]?.toUpperCase() as CountryCode | undefined
    if (region && SUPPORTED.includes(region)) return region
  }
  return ''
}
