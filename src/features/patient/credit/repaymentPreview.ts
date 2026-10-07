/**
 * Placeholder repayment schedule for layout review only. Real schedules come from
 * the finance partner's core banking API once that integration exists.
 */

export type InstallmentStatus = 'paid' | 'due' | 'upcoming'

export interface RepaymentInstallment {
  n: number
  dueDate: Date
  principal: number
  interest: number
  total: number
  status: InstallmentStatus
}

export interface RepaymentPlan {
  installments: RepaymentInstallment[]
  termMonths: number
  monthlyRatePct: number
  paidCount: number
  next: RepaymentInstallment | null
  outstanding: number
  interestTotal: number
}

const TERM_MONTHS = 12
const MONTHLY_RATE = 0.025
const DUE_DAY = 15
const PAID_SO_FAR = 3

export function buildRepaymentPreview(principalUsed: number, today = new Date()): RepaymentPlan | null {
  if (principalUsed <= 0) return null

  const principalPer = Math.round(principalUsed / TERM_MONTHS)
  const interestPer = Math.round(principalUsed * MONTHLY_RATE)
  // Anchor so the first unpaid installment is the next 15th from today.
  const firstUnpaid = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > DUE_DAY ? 1 : 0), DUE_DAY)

  const installments: RepaymentInstallment[] = Array.from({ length: TERM_MONTHS }, (_, i) => {
    const offset = i - PAID_SO_FAR
    const dueDate = new Date(firstUnpaid.getFullYear(), firstUnpaid.getMonth() + offset, DUE_DAY)
    const principal = i === TERM_MONTHS - 1 ? principalUsed - principalPer * (TERM_MONTHS - 1) : principalPer
    const status: InstallmentStatus = i < PAID_SO_FAR ? 'paid' : i === PAID_SO_FAR ? 'due' : 'upcoming'
    return { n: i + 1, dueDate, principal, interest: interestPer, total: principal + interestPer, status }
  })

  const unpaid = installments.filter(inst => inst.status !== 'paid')
  return {
    installments,
    termMonths: TERM_MONTHS,
    monthlyRatePct: MONTHLY_RATE * 100,
    paidCount: PAID_SO_FAR,
    next: unpaid[0] ?? null,
    outstanding: unpaid.reduce((sum, inst) => sum + inst.total, 0),
    interestTotal: installments.reduce((sum, inst) => sum + inst.interest, 0),
  }
}
