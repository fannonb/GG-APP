import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import type { PrescriptionBannerItem } from '@/utils/sp-notifications'

interface PrescriptionDecisionBannerProps {
  variant: 'accepted' | 'declined'
  items: PrescriptionBannerItem[]
  onAction: (items: PrescriptionBannerItem[]) => void
  onDismiss: (items: PrescriptionBannerItem[]) => void
}

const VARIANT_STYLES = {
  accepted: {
    background: 'linear-gradient(90deg, rgba(56,182,255,0.08), rgba(230,245,255,0.6))',
    border: '1.5px solid rgba(56,182,255,0.35)',
    shadow: '0 2px 12px rgba(56,182,255,0.12)',
    iconBg: C.blue500,
    iconShadow: '0 3px 10px rgba(56,182,255,0.35)',
    titleColor: C.navy800,
    bodyColor: C.textSub,
    actionLabel: 'Upload Invoice →',
    title: (count: number) => count > 1 ? `${count} quotes accepted` : 'Quote accepted',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="4" y="2" width="14" height="18" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
        <path d="M7.5 11l2.5 2.5 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  declined: {
    background: 'linear-gradient(90deg, rgba(239,68,68,0.07), rgba(239,68,68,0.02))',
    border: '1.5px solid rgba(239,68,68,0.26)',
    shadow: '0 2px 12px rgba(239,68,68,0.08)',
    iconBg: '#EF4444',
    iconShadow: '0 3px 10px rgba(239,68,68,0.28)',
    titleColor: '#B91C1C',
    bodyColor: '#991B1B',
    actionLabel: 'View Request →',
    title: (count: number) => count > 1 ? `${count} quotes declined` : 'Quote declined',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="4" y="2" width="14" height="18" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
        <path d="M8.5 9l5 5M13.5 9l-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
} as const

export function PrescriptionDecisionBanner({ variant, items, onAction, onDismiss }: PrescriptionDecisionBannerProps) {
  if (items.length === 0) return null

  const style = VARIANT_STYLES[variant]
  const primary = items[0]
  const count = items.length

  return (
    <div
      style={{
        padding: '18px 22px',
        background: style.background,
        borderRadius: radius.lg,
        border: style.border,
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: style.shadow,
        fontFamily: font.family,
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: '12px',
        background: style.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: style.iconShadow,
      }}>
        {style.icon}
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: style.titleColor, marginBottom: '3px', letterSpacing: '-0.01em' }}>
          {style.title(count)}
        </div>
        <div style={{ fontSize: '13px', color: style.bodyColor, lineHeight: 1.5 }}>
          {primary.detail}
          {count > 1 && ` and ${count - 1} more`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <GGButton
          variant="primary"
          size="sm"
          onClick={() => onAction(items)}
          style={{ background: style.iconBg, border: 'none', boxShadow: style.iconShadow }}
        >
          {style.actionLabel}
        </GGButton>
        <button
          type="button"
          onClick={() => onDismiss(items)}
          style={{
            background: 'transparent',
            border: `1px solid ${style.border}`,
            borderRadius: radius.sm,
            color: style.titleColor,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            padding: '6px 12px',
            fontFamily: font.family,
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
