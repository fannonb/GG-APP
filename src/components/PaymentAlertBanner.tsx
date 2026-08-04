import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { formatCurrency } from '@/utils/format'

export interface PaymentBannerItem {
  id: string
  headline: string
  detail: string
  amount?: number
  currency?: string
  screen?: string
}

interface PaymentAlertBannerProps {
  audience: 'admin' | 'sp'
  items: PaymentBannerItem[]
  onAction: (items: PaymentBannerItem[]) => void
}

function PaymentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="4.5" width="14" height="9.5" rx="2" stroke="#fff" strokeWidth="1.4" />
      <path d="M2 8h14" stroke="#fff" strokeWidth="1.2" />
      <circle cx="12.5" cy="11" r="1.1" fill="#fff" />
    </svg>
  )
}

function getAudienceCopy(audience: PaymentAlertBannerProps['audience'], count: number, item: PaymentBannerItem) {
  if (audience === 'sp') {
    return {
      title: count > 1 ? `${count} new patient payments` : 'Payment authorized by patient',
      body:
        count > 1
          ? `${item.headline} and ${count - 1} more — review the authorized invoices and payment details.`
          : `${item.headline} — the patient has authorized payment for this invoice.`,
      action: 'View Payment',
    }
  }

  return {
    title: count > 1 ? `${count} new patient payments` : 'New patient payment authorized',
    body:
      count > 1
        ? `${item.headline} and ${count - 1} more were authorized across the platform.`
        : `${item.headline} — a patient-to-provider payment was just authorized.`,
    action: 'View Payments',
  }
}

export function PaymentAlertBanner({ audience, items, onAction }: PaymentAlertBannerProps) {
  if (items.length === 0) return null

  const primary = items[0]
  const copy = getAudienceCopy(audience, items.length, primary)
  const amountLabel =
    primary.amount !== undefined
      ? formatCurrency(primary.amount, primary.currency ?? 'Z$')
      : null

  return (
    <div
      style={{
        padding: '16px 20px',
        background: `linear-gradient(90deg, ${C.blue100}, rgba(232,245,252,0.95))`,
        borderRadius: radius.lg,
        border: `1.5px solid rgba(74,173,223,0.35)`,
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(74,173,223,0.12)',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: C.success,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(34,197,94,0.35)',
        }}
      >
        <PaymentIcon />
      </div>

      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: C.navy800, fontFamily: font.family }}>
          {copy.title}
        </div>
        <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.55, marginTop: '4px', fontFamily: font.family }}>
          {copy.body}
        </div>
        {(primary.detail || amountLabel) && (
          <div style={{ fontSize: '12px', color: C.textSub, marginTop: '6px', fontFamily: font.family }}>
            {[primary.detail, amountLabel].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>

      <GGButton
        variant="success"
        size="sm"
        onClick={() => onAction(items)}
        style={{ flexShrink: 0 }}
      >
        {copy.action}
      </GGButton>
    </div>
  )
}
