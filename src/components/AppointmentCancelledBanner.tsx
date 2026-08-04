import { GGButton } from '@/design-system'
import { font, radius } from '@/design-system/tokens'
import type { AppointmentConfirmedBannerItem } from '@/utils/credit-notifications'

interface AppointmentCancelledBannerProps {
  items: AppointmentConfirmedBannerItem[]
  onAction: (items: AppointmentConfirmedBannerItem[]) => void
  onDismiss: (items: AppointmentConfirmedBannerItem[]) => void
}

export function AppointmentCancelledBanner({ items, onAction, onDismiss }: AppointmentCancelledBannerProps) {
  if (items.length === 0) return null

  const primary = items[0]
  const count = items.length

  return (
    <div
      style={{
        padding: '18px 22px',
        background: 'linear-gradient(90deg, rgba(239,68,68,0.07), rgba(239,68,68,0.02))',
        borderRadius: radius.lg,
        border: '1.5px solid rgba(239,68,68,0.26)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(239,68,68,0.08)',
        fontFamily: font.family,
      }}
    >
      <div style={{
        width: 46, height: 46, borderRadius: '12px',
        background: '#EF4444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 3px 10px rgba(239,68,68,0.28)',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="3.5" width="18" height="16" rx="2.5" stroke="#fff" strokeWidth="1.5"/>
          <path d="M2 8.5h18M7 2v3M15 2v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M8.5 9l5 5M13.5 9l-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C', marginBottom: '3px', letterSpacing: '-0.01em' }}>
          {count > 1 ? `${count} appointments cancelled` : 'Appointment cancelled by provider'}
        </div>
        <div style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.5 }}>
          {primary.detail}
          {count > 1 && ` and ${count - 1} more`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <GGButton
          variant="primary"
          size="sm"
          onClick={() => onAction(items)}
          style={{ background: '#EF4444', border: 'none', boxShadow: '0 2px 8px rgba(239,68,68,0.28)' }}
        >
          View Appointments →
        </GGButton>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(items)}
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.sm,
            border: '1px solid rgba(239,68,68,0.26)',
            background: '#fff',
            color: '#B91C1C',
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
