import moneymartFinanceLogo from '@/assets/partners/moneymart-finance.svg'
import equityBankLogo from '@/assets/partners/equity-bank.png'

/** Official finance partner logo assets (bundled via Vite) */
export const PARTNER_LOGOS = {
  moneymart: moneymartFinanceLogo,
  equity: equityBankLogo,
} as const

export type PartnerLogoId = keyof typeof PARTNER_LOGOS
