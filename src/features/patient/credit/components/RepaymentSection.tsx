import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { formatAmount } from '@/utils/format'
import type { InstallmentStatus, RepaymentPlan } from '../repaymentPreview'

const CYAN_DEEP = '#0B7BC0'

const STATUS_STYLE: Record<InstallmentStatus, { label: string; fg: string; bg: string }> = {
  paid: { label: 'Paid', fg: '#15803D', bg: 'rgba(34,197,94,0.12)' },
  due: { label: 'Next due', fg: '#B45309', bg: 'rgba(245,166,35,0.14)' },
  upcoming: { label: 'Upcoming', fg: C.textSub, bg: C.bg },
}

function daysUntil(date: Date, today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return Math.round((date.getTime() - start) / 86_400_000)
}

function dueLabel(date: Date) {
  const days = daysUntil(date)
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

const shortDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const longDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function SampleDataTag() {
  return (
    <span
      title="Placeholder numbers for layout review. Real schedules will come from the finance partner."
      style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: radius.full, background: 'rgba(124,58,237,0.10)', color: '#6D28D9', whiteSpace: 'nowrap' }}
    >
      Sample data
    </span>
  )
}

export function RepaymentCard({
  plan,
  currency,
  scheduleOpen,
  onToggleSchedule,
}: {
  plan: RepaymentPlan
  currency: string
  scheduleOpen: boolean
  onToggleSchedule: () => void
}) {
  const { isMobile } = useResponsive()
  const next = plan.next
  const pct = Math.round((plan.paidCount / plan.termMonths) * 100)
  const soon = next ? daysUntil(next.dueDate) <= 7 : false

  return (
    <section
      aria-label="Repayments"
      style={{
        background: '#fff',
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        padding: isMobile ? '18px' : '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        fontFamily: font.family,
        boxSizing: 'border-box',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.blue100, color: CYAN_DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <rect x="3" y="4.5" width="14" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 8.5h14M7 2.75v3M13 2.75v3M7.5 12.5l1.75 1.75L12.75 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>Repayments</div>
        </div>
        <SampleDataTag />
      </div>

      {next ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>Next payment</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {formatAmount(next.total, currency)}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: radius.full, color: soon ? '#B45309' : CYAN_DEEP, background: soon ? 'rgba(245,166,35,0.14)' : C.blue100 }}>
              {dueLabel(next.dueDate)}
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
            {longDate(next.dueDate)} · {formatAmount(next.principal, currency)} + {formatAmount(next.interest, currency)} interest
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 17, fontWeight: 800, color: '#15803D' }}>All repayments made</div>
      )}

      <div>
        <div
          role="progressbar"
          aria-label="Repayments made"
          aria-valuenow={plan.paidCount}
          aria-valuemin={0}
          aria-valuemax={plan.termMonths}
          style={{ height: 8, borderRadius: radius.full, background: C.bg, overflow: 'hidden' }}
        >
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: radius.full, background: 'linear-gradient(90deg, #22C55E 0%, #15803D 100%)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8, fontSize: 13, color: C.textSub, flexWrap: 'wrap' }}>
          <span><strong style={{ color: C.text }}>{plan.paidCount} of {plan.termMonths}</strong> paid</span>
          <span>Still owed <strong style={{ color: C.text }}>{formatAmount(plan.outstanding, currency)}</strong></span>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleSchedule}
        aria-expanded={scheduleOpen}
        style={{
          marginTop: 'auto',
          alignSelf: isMobile ? 'stretch' : 'flex-start',
          height: 38,
          padding: '0 16px',
          borderRadius: radius.sm,
          border: '1px solid rgba(11,123,192,0.35)',
          background: '#fff',
          color: CYAN_DEEP,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: font.family,
          cursor: 'pointer',
        }}
      >
        {scheduleOpen ? 'Hide schedule' : 'View full schedule'}
      </button>
    </section>
  )
}

export function RepaymentSchedule({ plan, currency }: { plan: RepaymentPlan; currency: string }) {
  const { isMobile } = useResponsive()
  const principalTotal = plan.installments.reduce((sum, inst) => sum + inst.principal, 0)

  return (
    <section
      aria-label="Repayment schedule"
      style={{
        background: '#fff',
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        padding: isMobile ? '16px' : '20px 24px',
        fontFamily: font.family,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>Repayment schedule</div>
            <SampleDataTag />
          </div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 3 }}>
            {plan.termMonths} monthly payments · {plan.monthlyRatePct}% interest per month
          </div>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? 16 : 24, fontSize: 12, color: C.textSub }}>
          <div>Borrowed<div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{formatAmount(principalTotal, currency)}</div></div>
          <div>Total interest<div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{formatAmount(plan.interestTotal, currency)}</div></div>
          <div>Total to repay<div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{formatAmount(principalTotal + plan.interestTotal, currency)}</div></div>
        </div>
      </div>

      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '48px 1.2fr 1fr 1fr 1fr 110px', gap: 12, padding: '8px 4px', borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>#</span><span>Due date</span><span style={{ textAlign: 'right' }}>Principal</span><span style={{ textAlign: 'right' }}>Interest</span><span style={{ textAlign: 'right' }}>Total</span><span style={{ textAlign: 'right' }}>Status</span>
        </div>
      )}

      {plan.installments.map(inst => {
        const st = STATUS_STYLE[inst.status]
        const highlight = inst.status === 'due'
        const pill = (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: radius.full, color: st.fg, background: st.bg, whiteSpace: 'nowrap' }}>{st.label}</span>
        )
        const muted = inst.status === 'paid'

        if (isMobile) {
          return (
            <div key={inst.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderBottom: `1px solid ${C.border}`, background: highlight ? 'rgba(245,166,35,0.06)' : 'transparent', borderRadius: highlight ? radius.sm : 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: muted ? C.textSub : C.text }}>{shortDate(inst.dueDate)} · Payment {inst.n}</div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
                  {formatAmount(inst.principal, currency)} + {formatAmount(inst.interest, currency)} interest
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: muted ? C.textSub : C.text, marginBottom: 4 }}>{formatAmount(inst.total, currency)}</div>
                {pill}
              </div>
            </div>
          )
        }

        return (
          <div
            key={inst.n}
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1.2fr 1fr 1fr 1fr 110px',
              gap: 12,
              alignItems: 'center',
              padding: '11px 4px',
              borderBottom: `1px solid ${C.border}`,
              fontSize: 13,
              color: muted ? C.textSub : C.text,
              background: highlight ? 'rgba(245,166,35,0.06)' : 'transparent',
            }}
          >
            <span style={{ fontWeight: 700 }}>{inst.n}</span>
            <span style={{ fontWeight: highlight ? 700 : 500 }}>{longDate(inst.dueDate)}</span>
            <span style={{ textAlign: 'right' }}>{formatAmount(inst.principal, currency)}</span>
            <span style={{ textAlign: 'right' }}>{formatAmount(inst.interest, currency)}</span>
            <span style={{ textAlign: 'right', fontWeight: 700 }}>{formatAmount(inst.total, currency)}</span>
            <span style={{ textAlign: 'right' }}>{pill}</span>
          </div>
        )
      })}

      <div style={{ fontSize: 12, color: C.textLight, marginTop: 12, lineHeight: 1.5 }}>
        Payments are collected by your finance partner. Contact them if you need to change a payment date.
      </div>
    </section>
  )
}
