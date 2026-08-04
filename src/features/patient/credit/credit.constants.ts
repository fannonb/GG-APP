/** Shared copy and metadata for the patient credit / wallet journey */

export const CREDIT_JOURNEY_STEPS = [
  {
    step: 1,
    title: 'Review & Accept',
    desc: 'Read the disclosure and confirm you understand the terms.',
    path: '/app/credit/disclaimer',
  },
  {
    step: 2,
    title: 'Submit Application',
    desc: 'Choose a finance partner and send your request to GG\'APP for review.',
    path: '/app/credit/apply',
  },
  {
    step: 3,
    title: 'Use Your Balance',
    desc: 'Once approved, your wallet balance is ready to use at verified providers.',
    path: '/app/credit',
  },
] as const

export const CREDIT_BENEFITS = [
  {
    icon: 'instant' as const,
    title: 'Instant funding',
    desc: 'Approved balance loaded directly to your GG\'APP wallet.',
  },
  {
    icon: 'providers' as const,
    title: 'Verified providers only',
    desc: 'Use your balance exclusively at GG\'APP-approved healthcare providers.',
  },
  {
    icon: 'zero' as const,
    title: 'Zero upfront cost',
    desc: 'Pay nothing at the point of care — settle with your finance partner later.',
  },
  {
    icon: 'secure' as const,
    title: 'Secure & regulated',
    desc: 'Credit is issued by licensed finance partners, not GG\'APP directly.',
  },
] as const

export const FINANCE_PARTNER_SUMMARIES = [
  {
    id: 'moneymart',
    name: 'Moneymart Finance',
    shortName: 'Moneymart',
    tagline: 'Fast, flexible credit built around your healthcare needs.',
    processingTime: '24–48 hrs',
    accent: '#2e3191',
    accentBg: 'rgba(46,49,145,0.08)',
    accentBorder: 'rgba(46,49,145,0.2)',
  },
  {
    id: 'equity',
    name: 'Equity Bank',
    shortName: 'Equity',
    tagline: 'Trusted healthcare financing from a leading African institution.',
    processingTime: '24 hrs',
    accent: '#A93226',
    accentBg: 'rgba(169,50,38,0.08)',
    accentBorder: 'rgba(169,50,38,0.2)',
  },
] as const

export type FinancePartnerId = (typeof FINANCE_PARTNER_SUMMARIES)[number]['id']

export function getFinancePartnerSummary(id: string) {
  return FINANCE_PARTNER_SUMMARIES.find(p => p.id === id)
}
