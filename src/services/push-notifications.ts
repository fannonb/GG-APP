import { VAPID_PUBLIC_KEY } from '@/api/config'
import { apiClient } from '@/api/client'
import { isMockApi } from '@/api/config'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)))
}

let cachedPublicKey: string | null = null
const DISABLED_KEY = 'gg-push-disabled'
let disabledInMemory = false

function isDisabled(): boolean {
  try { return localStorage.getItem(DISABLED_KEY) === 'true' } catch { return disabledInMemory }
}

function setDisabled(disabled: boolean) {
  disabledInMemory = disabled
  try { localStorage.setItem(DISABLED_KEY, String(disabled)) } catch { /* Storage may be unavailable. */ }
  window.dispatchEvent(new Event('gg:push-changed'))
}

/** The build-time key when set, otherwise the API's (so keys can change without a rebuild). */
async function getVapidPublicKey(): Promise<string> {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY
  if (cachedPublicKey !== null) return cachedPublicKey
  try {
    const { data } = await apiClient.get<{ publicKey: string }>('/notifications/push/public-key')
    cachedPublicKey = data.publicKey || null
  } catch {
    // A temporary failure must not disable push until the next page reload.
    return ''
  }
  return cachedPublicKey ?? ''
}

/** The active service worker, or null within a few seconds if there isn't one. */
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 4000))
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  return isPushSupported() ? Notification.permission : 'unsupported'
}

/** Permission alone does not mean this browser has a live subscription. */
export async function isPushEnabled(): Promise<boolean> {
  if (getPushPermission() !== 'granted' || isDisabled() || isMockApi || import.meta.env.DEV) return false
  const registration = await getRegistration()
  return Boolean(await registration?.pushManager.getSubscription())
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

/**
 * Subscribes this browser and registers it with the API. Safe to call
 * repeatedly: the API upserts the device, so it also re-links a browser that
 * was signed in to another account. Needs notification permission already.
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!isPushSupported() || isMockApi) return null

  // The service worker is intentionally not registered in dev (see pwa.ts).
  if (import.meta.env.DEV) {
    console.info('[push] Skipped in development — no service worker registered')
    return null
  }

  const publicKey = await getVapidPublicKey()
  if (!publicKey) return null

  const registration = await getRegistration()
  if (!registration) return null

  const existing = await registration.pushManager.getSubscription()
  const subscription = existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }))

  try {
    const { data } = await apiClient.post<{ success: boolean }>('/notifications/push/subscribe', subscription.toJSON())
    if (!data.success) throw new Error('Push registration was rejected')
  } catch (error) {
    if (!existing) await subscription.unsubscribe().catch(() => {})
    throw error
  }
  setDisabled(false)
  return subscription
}

/** Re-registers silently after sign-in when the user has already allowed notifications. */
export async function syncPushSubscription(): Promise<void> {
  if (getPushPermission() !== 'granted' || isDisabled()) return
  try {
    await subscribeToPushNotifications()
  } catch {
    // Best-effort; the user can turn notifications on again from settings.
  }
}

/** Removes this browser from the signed-in account. Call before the session ends. */
export async function unsubscribeFromPushNotifications({ disable = true }: { disable?: boolean } = {}): Promise<void> {
  if (disable) setDisabled(true)
  if (!isPushSupported() || import.meta.env.DEV) return

  const registration = await getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  await subscription.unsubscribe()
  window.dispatchEvent(new Event('gg:push-changed'))
  if (!isMockApi) {
    // The browser is already unsubscribed, so even an unreachable API cannot
    // keep alerts arriving. The server removes stale endpoints on 404/410.
    await apiClient.post('/notifications/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {})
  }
}
