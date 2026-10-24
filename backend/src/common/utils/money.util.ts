/** ISO currency for each operating country (matches the admin payouts desk). */
export const CURRENCY_BY_COUNTRY: Record<string, string> = { KE: 'KES', ZW: 'ZWG', ZM: 'ZMW' }

/** "KES 1,250.00" style amount for emails and messages. Unknown countries show the amount without a currency. */
export function formatMoney(amount: number, countryCode?: string | null): string {
  const currency = (countryCode && CURRENCY_BY_COUNTRY[countryCode.toUpperCase()]) || ''
  const value = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency ? `${currency} ${value}` : value
}
