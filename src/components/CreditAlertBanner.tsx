import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import type { CreditBannerItem } from '@/utils/credit-notifications'

interface CreditAlertBannerProps {
  items: CreditBannerItem[]
  onAction: (items: CreditBannerItem[]) => void
}

function CreditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="4" width="14" height="10" rx="1.8" stroke="#fff" strokeWidth="1.4" />
      <path d="M2 7h14" stroke="#fff" strokeWidth="1.1" />
      <path d="M5 10.5h5" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function CreditAlertBanner({ items, onAction }: CreditAlertBannerProps) {
  if (items.length === 0) return null

  const primary = items[0]
  const title = items.length > 1
    ? `${items.length} credit applications awaiting review`
    : 'New credit application awaiting review'
  const body = items.length > 1
    ? `${primary.headline} and ${items.length - 1} more patient credit requests need your decision.`
    : `${primary.detail || primary.headline}`

  return (
    <div
      style={{
        padding: '16px 20px',
        background: `linear-gradient(90deg, rgba(124,58,237,0.1), rgba(124,58,237,0.04))`,
        borderRadius: radius.lg,
        border: '1.5px solid rgba(124,58,237,0.28)',
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(124,58,237,0.1)',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: '#7C3AED',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
        }}
      >
        <CreditIcon />
      </div>

      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: C.navy800, fontFamily: font.family }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.55, marginTop: '4px', fontFamily: font.family }}>
          {body}
        </div>
      </div>

      <GGButton
        variant="primary"
        size="sm"
        onClick={() => onAction(items)}
        style={{ flexShrink: 0, background: '#7C3AED' }}
      >
        Review Applications
      </GGButton>
    </div>
  )
}
