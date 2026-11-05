import { getCountryByCode, getCountryByName } from '@/config/countries'
import { useSPProfile } from '@/hooks/api'
import { useUserStore } from '@/store/user.store'

/**
 * Currency symbol for an operating country, given its code ('ZW') or name ('Zimbabwe').
 * '' when the country is unknown: never default to another market's currency.
 */
export function currencySymbolFor(country: string | null | undefined): string {
  if (!country) return ''
  return (getCountryByCode(country.trim().toUpperCase()) ?? getCountryByName(country))?.currencySymbol ?? ''
}

/** Currency of the signed-in service provider's country. */
export function useSPCurrency(): string {
  const { data: spProfile } = useSPProfile()
  return currencySymbolFor(spProfile?.country)
}

/** Currency of the signed-in patient's country. */
export function usePatientCurrency(): string {
  const user = useUserStore(s => s.user)
  return currencySymbolFor(user?.countryCode)
}
