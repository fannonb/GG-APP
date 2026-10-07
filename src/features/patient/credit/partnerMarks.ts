import moneymartLogo from '@/assets/partners/moneymart-finance.svg'
import equityLogo from '@/assets/partners/equity-bank-transparent.png'

/** Logos trimmed/transparent for a white chip; heights balance their visual weight. */
export const PARTNER_MARKS: Record<string, { src: string; height: number }> = {
  moneymart: { src: moneymartLogo, height: 26 },
  equity: { src: equityLogo, height: 34 },
}
