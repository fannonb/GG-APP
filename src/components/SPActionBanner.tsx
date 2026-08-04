import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import type { SPActionBannerItem } from '@/utils/sp-notifications'

interface SPActionBannerProps {
  items: SPActionBannerItem[]
  title: (count: number) => string
  actionLabel: string
  icon: React.ReactNode
  onAction: (items: SPActionBannerItem[]) => void
  onDismiss: (items: SPActionBannerItem[]) => void
}

export function SPActionBanner({ items, title, actionLabel, icon, onAction, onDismiss }: SPActionBannerProps) {
  if (items.length === 0) return null

  const primary = items[0]
  const count = items.length

  return (
    <div
      style={{
        padding: '18px 22px',
        background: `linear-gradient(90deg, ${C.blue100}, rgba(230,245,255,0.6))`,
        borderRadius: radius.lg,
        border: '1.5px solid rgba(56,182,255,0.35)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(56,182,255,0.12)',
        fontFamily: font.family,
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: '12px',
        background: C.blue500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 3px 10px rgba(56,182,255,0.35)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: C.navy800, marginBottom: '3px', letterSpacing: '-0.01em' }}>
          {title(count)}
        </div>
        <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5 }}>
          {primary.detail}
          {count > 1 && ` and ${count - 1} more`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <GGButton variant="primary" size="sm" onClick={() => onAction(items)}>
          {actionLabel}
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
