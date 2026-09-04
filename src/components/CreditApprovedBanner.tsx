import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import type { CreditBannerItem } from '@/utils/credit-notifications'

interface CreditApprovedBannerProps {
  items: CreditBannerItem[]
  approvedAmountLabel?: string
  onAction: (items: CreditBannerItem[]) => void
  onDismiss: (items: CreditBannerItem[]) => void
}

function SuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4.5 9.5l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function CreditApprovedBanner({ items, approvedAmountLabel, onAction, onDismiss }: CreditApprovedBannerProps) {
  if (items.length === 0) return null

  const primary = items[0]
  const isIncrease = /increase/i.test(primary.headline)
  const title = isIncrease ? 'Your limit increase was approved' : 'Your healthcare credit was approved'

  return (
    <div
      style={{
        padding: '18px 22px',
        background: `linear-gradient(90deg, ${C.successBg}, rgba(232,252,245,0.95))`,
        borderRadius: radius.lg,
        border: '1.5px solid rgba(34,201,138,0.35)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(34,201,138,0.12)',
        fontFamily: font.family,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: C.success,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(34,201,138,0.35)',
        }}
      >
        <SuccessIcon />
      </div>

      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: C.navy800 }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.55, marginTop: '4px' }}>
          {primary.detail}
        </div>
        {approvedAmountLabel && (
          <div style={{ fontSize: '12px', fontWeight: 700, color: C.success, marginTop: '8px' }}>
            Approved amount: {approvedAmountLabel}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <GGButton
          variant="success"
          size="sm"
          onClick={() => onAction(items)}
        >
          View credit
        </GGButton>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(items)}
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.sm,
            border: `1px solid ${C.border}`,
            background: '#fff',
            color: C.textSub,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
