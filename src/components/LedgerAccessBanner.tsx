import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import type { LedgerGrant } from '@/types/ledger.types'
import { describeLedgerAccess } from '@/utils/ledger-access'

interface LedgerAccessBannerProps {
  grants: LedgerGrant[]
  onManage: () => void
  onDismiss: () => void
}

export function LedgerAccessBanner({ grants, onManage, onDismiss }: LedgerAccessBannerProps) {
  if (grants.length === 0) return null

  const { headline, detail } = describeLedgerAccess(grants)

  return (
    <div
      style={{
        padding: '18px 22px',
        background: `linear-gradient(90deg, ${C.blue100}, rgba(230,245,255,0.85))`,
        borderRadius: radius.lg,
        border: '1.5px solid rgba(56,182,255,0.35)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(56,182,255,0.10)',
        fontFamily: font.family,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: C.navy800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="10" width="16" height="10" rx="2" stroke="#fff" strokeWidth="1.8" />
          <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: C.navy800 }}>{headline}</div>
        <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.55, marginTop: '4px' }}>
          {detail}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <GGButton variant="navy" size="sm" onClick={onManage}>
          Manage access
        </GGButton>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
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
