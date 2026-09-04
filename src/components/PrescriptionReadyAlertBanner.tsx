import { useState } from 'react'
import { GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import type { PrescriptionReadyForPickupBannerItem } from '@/utils/sp-notifications'

interface PrescriptionReadyAlertBannerProps {
  items: PrescriptionReadyForPickupBannerItem[]
  onMarkReady: (item: PrescriptionReadyForPickupBannerItem) => Promise<void> | void
  onView: (item: PrescriptionReadyForPickupBannerItem) => void
  onDismiss: (items: PrescriptionReadyForPickupBannerItem[]) => void
}

export function PrescriptionReadyAlertBanner({
  items,
  onMarkReady,
  onView,
  onDismiss,
}: PrescriptionReadyAlertBannerProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  if (items.length === 0) return null

  const primary = items[0]
  const count = items.length
  const isDelivery = primary.fulfillmentMode === 'delivery'
  const actionTitle = isDelivery ? 'Mark Ready for Delivery' : 'Mark Ready for Pickup'

  const title =
    count > 1
      ? `${count} Prescriptions Paid · Ready for Hand-off`
      : isDelivery
        ? 'Prescription Paid · Ready for Delivery'
        : 'Prescription Paid · Ready for Pickup'

  const handleMark = async (item: PrescriptionReadyForPickupBannerItem) => {
    try {
      setLoadingId(item.id)
      await onMarkReady(item)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div
      style={{
        padding: '18px 22px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(56, 182, 255, 0.12) 100%)',
        borderRadius: radius.lg,
        border: '1.5px solid rgba(16, 185, 129, 0.35)',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.12)',
        fontFamily: font.family,
        position: 'relative',
      }}
    >
      {/* Package / Pickup Icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 3px 12px rgba(16, 185, 129, 0.35)',
        }}
      >
        {isDelivery ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        )}
      </div>

      {/* Copy */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: C.navy800,
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#047857',
              background: '#D1FAE5',
              padding: '2px 8px',
              borderRadius: radius.full,
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            Payment Received
          </span>
        </div>

        <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5 }}>
          {primary.detail}
          {count > 1 && ` (+${count - 1} other paid prescription${count > 2 ? 's' : ''})`}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <GGButton
          variant="primary"
          size="sm"
          loading={loadingId === primary.id}
          onClick={() => void handleMark(primary)}
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
            fontWeight: 700,
          }}
        >
          {actionTitle}
        </GGButton>

        <GGButton
          variant="secondary"
          size="sm"
          onClick={() => onView(primary)}
        >
          View Order →
        </GGButton>

        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(items)}
          style={{
            background: 'transparent',
            border: `1px solid ${C.border}`,
            borderRadius: radius.sm,
            color: C.textSub,
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            padding: '6px 12px',
            fontFamily: font.family,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = C.text
            e.currentTarget.style.borderColor = C.textSub
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = C.textSub
            e.currentTarget.style.borderColor = C.border
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
