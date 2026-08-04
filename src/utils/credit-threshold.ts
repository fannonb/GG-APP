import { getCountryByCode } from '@/config/countries'

const DEFAULT_LOW_BALANCE_THRESHOLD = 5000

export function getLowCreditThreshold(countryCode: string): number {
  return getCountryByCode(countryCode)?.creditLowBalanceThreshold ?? DEFAULT_LOW_BALANCE_THRESHOLD
}

export function isCreditRunningLow(available: number, countryCode: string): boolean {
  if (available <= 0) return false
  return available <= getLowCreditThreshold(countryCode)
}

export function wouldBeLowAfterPayment(
  available: number,
  paymentAmount: number,
  countryCode: string,
): boolean {
  const remaining = available - paymentAmount
  return remaining > 0 && remaining <= getLowCreditThreshold(countryCode)
}
