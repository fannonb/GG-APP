export interface CountryConfig {
  code: 'KE' | 'ZW' | 'ZM'
  name: string
  dial: string
  currencyCode: string
  currencySymbol: string
  currencyName: string
  phonePlaceholder: string
}

export type CountryCode = CountryConfig['code']

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'KE',
    name: 'Kenya',
    dial: '+254',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    currencyName: 'Kenyan Shilling',
    phonePlaceholder: '7XX XXX XXX',
  },
  {
    code: 'ZW',
    name: 'Zimbabwe',
    dial: '+263',
    currencyCode: 'ZWG',
    currencySymbol: 'Z$',
    currencyName: 'Zimbabwe Gold',
    phonePlaceholder: '7X XXX XXXX',
  },
  {
    code: 'ZM',
    name: 'Zambia',
    dial: '+260',
    currencyCode: 'ZMW',
    currencySymbol: 'K',
    currencyName: 'Zambian Kwacha',
    phonePlaceholder: '9X XXX XXXX',
  },
]

export function getCountryByCode(code: string): CountryConfig | undefined {
  return COUNTRIES.find(c => c.code === code)
}

export function getCountryByName(name: string): CountryConfig | undefined {
  return COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase())
}

export function flagUrl(code: string, size: 20 | 40 = 40): string {
  return `https://flagcdn.com/w${size}/${code.toLowerCase()}.png`
}
