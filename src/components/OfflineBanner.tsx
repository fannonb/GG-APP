import { C, font } from '@/design-system/tokens'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/**
 * Global strip shown while the device has no connectivity. The app keeps
 * working from cached data, so the message is informational, not blocking.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '7px 16px',
        background: C.navy800,
        color: '#FFFFFF',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.01em',
        fontFamily: font.family,
        boxShadow: '0 4px 14px rgba(9, 28, 68, 0.25)',
      }}
    >
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: C.blue500, flexShrink: 0 }} />
      You&apos;re offline — showing saved data. Changes will sync once you reconnect.
    </div>
  )
}
