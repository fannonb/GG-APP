import { useNavigate } from 'react-router-dom'
import { GGBadge, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { formatCurrency, formatDate } from '@/utils/format'
import { ROUTES, route } from '@/router/routes'
import type { Transaction } from '@/types/user.types'

interface DashboardRecentActivityProps {
  transactions: Transaction[]
  currency: string
  style?: React.CSSProperties
}

function statusMeta(status: Transaction['status']) {
  if (status === 'failed') return { label: 'Failed', badge: 'error' as const, iconBg: C.errorBg, icon: C.error }
  if (status === 'pending') return { label: 'Pending', badge: 'pending' as const, iconBg: C.bg, icon: C.textSub }
  return { label: 'Paid', badge: 'primary' as const, iconBg: C.blue100, icon: C.blue500 }
}

function PaymentIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="3.5" width="12" height="9" rx="1.8" stroke={color} strokeWidth="1.4" />
      <path d="M2 6.5h12" stroke={color} strokeWidth="1.4" />
      <path d="M5 10h3" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function DashboardRecentActivity({ transactions, currency, style }: DashboardRecentActivityProps) {
  const navigate = useNavigate()
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3)

  return (
    <GGCard padding="20px 22px" style={{ height: '100%', display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', fontFamily: font.family }}>
            Recent transactions
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, fontFamily: font.family }}>
            Last payments from your healthcare credit
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.TRANSACTIONS)}
          style={{ all: 'unset', fontSize: 13, color: C.blue500, fontWeight: 700, cursor: 'pointer', fontFamily: font.family, flexShrink: 0, marginTop: 2 }}
        >
          View all →
        </button>
      </div>

      {recent.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 12px', textAlign: 'center' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: C.blue100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
              color: C.blue500,
            }}
          >
            <PaymentIcon color={C.blue500} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: font.family }}>
            No transactions yet
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, fontFamily: font.family, maxWidth: '240px', lineHeight: 1.4 }}>
            Payments made with your healthcare credit will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {recent.map(tx => {
          const meta = statusMeta(tx.status)
          return (
            <button
              key={tx.id}
              type="button"
              onClick={() => navigate(tx.invoiceId ? route.patientInvoice(tx.invoiceId) : ROUTES.TRANSACTIONS)}
              style={{
                all: 'unset',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 10px',
                margin: '0 -10px',
                borderRadius: radius.sm,
                cursor: 'pointer',
                width: 'calc(100% + 20px)',
                boxSizing: 'border-box',
                fontFamily: font.family,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.bg }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: meta.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <PaymentIcon color={meta.icon} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                  {tx.service}
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {tx.provider} · {formatDate(tx.date, { month: 'short', day: 'numeric' })}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: tx.status === 'failed' ? C.error : C.navy800, letterSpacing: '-0.02em' }}>
                  {formatCurrency(tx.amount, currency)}
                </div>
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'flex-end' }}>
                  <GGBadge type={meta.badge}>{meta.label}</GGBadge>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )}
    </GGCard>
  )
}
