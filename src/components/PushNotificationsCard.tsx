import { useState } from 'react'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import {
  getPushPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@/services/push-notifications'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * Lets the user turn on push notifications for this browser. Browsers only
 * show the permission prompt after a tap, so this has to be a button.
 */
export function PushNotificationsCard() {
  const [permission, setPermission] = useState(getPushPermission)
  const [enabled, setEnabled] = useState(permission === 'granted')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const turnOn = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await requestNotificationPermission()
      setPermission(result)
      if (result !== 'granted') return
      const subscription = await subscribeToPushNotifications()
      if (!subscription) {
        setError('Notifications aren’t available here yet. Please try again later.')
        return
      }
      setEnabled(true)
    } catch {
      setError('We couldn’t turn on notifications. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const turnOff = async () => {
    setBusy(true)
    setError(null)
    try {
      await unsubscribeFromPushNotifications()
      setEnabled(false)
    } catch {
      setError('We couldn’t turn off notifications. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  let detail: string
  if (permission === 'unsupported') {
    detail = isIos() && !isStandalone()
      ? 'On iPhone and iPad, add GG’APP to your Home Screen first (Share, then Add to Home Screen), then open it from there.'
      : 'This browser doesn’t support notifications.'
  } else if (permission === 'denied') {
    detail = 'Notifications are blocked for GG’APP. Allow them in your browser’s site settings, then come back here.'
  } else if (enabled) {
    detail = 'You’ll get alerts on this device for payments, invoices, appointments and your credit.'
  } else {
    detail = 'Get alerts on this device for payments, invoices, appointments and your credit, even when GG’APP is closed.'
  }

  const canToggle = permission !== 'unsupported' && permission !== 'denied'

  return (
    <GGCard padding="22px">
      <div style={{ fontFamily: font.family, display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
            Notifications on this device {enabled && canToggle ? '· On' : ''}
          </div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>{detail}</div>
          {error && (
            <div role="alert" style={{ fontSize: 13, color: '#B91C1C', marginTop: 6 }}>
              {error}
            </div>
          )}
        </div>
        {canToggle && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void (enabled ? turnOff() : turnOn())}
            style={{
              height: 38,
              padding: '0 16px',
              borderRadius: radius.sm,
              border: enabled ? `1px solid ${C.border}` : 'none',
              background: enabled ? '#fff' : C.navy800,
              color: enabled ? C.text : '#fff',
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: font.family,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {busy ? 'Please wait…' : enabled ? 'Turn off' : 'Turn on notifications'}
          </button>
        )}
      </div>
    </GGCard>
  )
}
