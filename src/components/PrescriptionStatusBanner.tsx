import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import type { PrescriptionBannerItem } from '@/utils/prescription-notifications'

interface PrescriptionStatusBannerProps {
  variant: 'quote' | 'invoice' | 'ready'
  items: PrescriptionBannerItem[]
  onAction: (items: PrescriptionBannerItem[]) => void
  onDismiss: (items: PrescriptionBannerItem[]) => void
}

const VARIANT_COPY = {
  quote: {
    title: (count: number) =>
      count > 1 ? `${count} prescription updates need review` : 'Pharmacy responded to your prescription',
    actionLabel: 'Review →',
    background: `linear-gradient(90deg, ${C.blue100}, rgba(230,245,255,0.6))`,
    border: '1.5px solid rgba(56,182,255,0.35)',
    shadow: '0 2px 12px rgba(56,182,255,0.12)',
    iconBg: C.blue500,
    iconShadow: '0 3px 10px rgba(56,182,255,0.35)',
    titleColor: C.navy800,
    bodyColor: C.textSub,
    buttonVariant: 'primary' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="4" y="2" width="14" height="18" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
        <line x1="11" y1="6" x2="11" y2="13" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="7.5" y1="9.5" x2="14.5" y2="9.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M7.5 16h7" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  invoice: {
    title: (count: number) =>
      count > 1 ? `${count} medication invoices need payment` : 'Medication invoice ready',
    actionLabel: 'Review Invoice →',
    background: 'linear-gradient(90deg, rgba(245,166,35,0.12), rgba(255,248,235,0.95))',
    border: '1.5px solid rgba(245,166,35,0.35)',
    shadow: '0 2px 12px rgba(245,166,35,0.12)',
    iconBg: C.warning,
    iconShadow: '0 3px 10px rgba(245,166,35,0.35)',
    titleColor: '#8A4D00',
    bodyColor: '#8A4D00',
    buttonVariant: 'warning' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="4" y="2" width="14" height="18" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
        <line x1="7" y1="7" x2="15" y2="7" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
        <line x1="7" y1="11" x2="15" y2="11" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
        <line x1="7" y1="15" x2="11" y2="15" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  ready: {
    title: (count: number) => count > 1 ? `${count} orders ready` : 'Your medication is ready',
    actionLabel: 'View Order →',
    background: `linear-gradient(90deg, ${C.blue100}, rgba(230,245,255,0.6))`,
    border: '1.5px solid rgba(56,182,255,0.35)',
    shadow: '0 2px 12px rgba(56,182,255,0.12)',
    iconBg: C.blue500,
    iconShadow: '0 3px 10px rgba(56,182,255,0.35)',
    titleColor: C.navy800,
    bodyColor: C.textSub,
    buttonVariant: 'primary' as const,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="4" y="2" width="14" height="18" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
        <path d="M7.5 11l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
} as const

export function PrescriptionStatusBanner({ variant, items, onAction, onDismiss }: PrescriptionStatusBannerProps) {
  if (items.length === 0) return null

  const copy = VARIANT_COPY[variant]
  const primary = items[0]
  const count = items.length

  return (
    <div
      style={{
        padding: '18px 22px',
        background: copy.background,
        borderRadius: radius.lg,
        border: copy.border,
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: copy.shadow,
        fontFamily: font.family,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: '12px',
          background: copy.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: copy.iconShadow,
        }}
      >
        {copy.icon}
      </div>

      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: copy.titleColor }}>
          {copy.title(count)}
        </div>
        <div style={{ fontSize: '13px', color: copy.bodyColor, lineHeight: 1.55, marginTop: '4px' }}>
          {primary.detail}
          {count > 1 && ` and ${count - 1} more`}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <GGButton
          variant={copy.buttonVariant}
          size="sm"
          onClick={() => onAction(items)}
          style={copy.buttonVariant === 'warning' ? { background: C.warning, color: '#fff', border: 'none' } : undefined}
        >
          {copy.actionLabel}
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
