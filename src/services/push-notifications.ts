import { VAPID_PUBLIC_KEY } from '@/api/config'
import { apiClient } from '@/api/client'
import { isMockApi } from '@/api/config'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)))
}

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }

  // The service worker is intentionally not registered in dev (see pwa.ts),
  // so `navigator.serviceWorker.ready` would never resolve there.
  if (import.meta.env.DEV) {
    console.info('[push] Skipped in development — no service worker registered')
    return null
  }

  if (!VAPID_PUBLIC_KEY) {
    if (import.meta.env.DEV) {
      console.info('[push] VITE_VAPID_PUBLIC_KEY not set — skipping subscription')
    }
    return null
  }

  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  })

  if (!isMockApi) {
    await apiClient.post('/notifications/push/subscribe', subscription.toJSON())
  }

  return subscription
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) return

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  if (!isMockApi) {
    await apiClient.post('/notifications/push/unsubscribe', {
      endpoint: subscription.endpoint,
    })
  }

  await subscription.unsubscribe()
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}
