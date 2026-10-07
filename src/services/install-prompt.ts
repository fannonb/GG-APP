/**
 * Tracks whether GG'APP can be installed on this device and how.
 *
 * Chromium browsers (Android Chrome, Edge, Samsung Internet, desktop Chrome)
 * fire `beforeinstallprompt`, which we hold on to so our own button can open
 * the system install dialog later. iOS/iPadOS Safari has no such event, so
 * there we can only explain "Share → Add to Home Screen".
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallMode = 'native' | 'ios' | 'installed' | 'unsupported'

export interface InstallState {
  mode: InstallMode
  /** Phone or tablet, where installing matters most. */
  touchDevice: boolean
}

const DISMISS_KEY = 'gg_install_dismissed_until'

let deferred: BeforeInstallPromptEvent | null = null
let installedNow = false
const listeners = new Set<() => void>()
let snapshot: InstallState = compute()

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: minimal-ui)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIOS() {
  const ua = navigator.userAgent
  // iPadOS 13+ reports itself as a Mac, so check for touch as well.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function isIOSSafari() {
  const ua = navigator.userAgent
  // Other iOS browsers (Chrome, Firefox) can't add to the home screen on older iOS; Safari always can.
  return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

function compute(): InstallState {
  if (typeof window === 'undefined') return { mode: 'unsupported', touchDevice: false }
  const touchDevice = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 1
  if (installedNow || isStandalone()) return { mode: 'installed', touchDevice }
  if (deferred) return { mode: 'native', touchDevice }
  if (isIOSSafari()) return { mode: 'ios', touchDevice: true }
  return { mode: 'unsupported', touchDevice }
}

function emit() {
  snapshot = compute()
  listeners.forEach(listener => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    // Stop the browser's own mini-infobar; we show the prompt where it fits.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installedNow = true
    emit()
  })
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', emit)
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getInstallState() {
  return snapshot
}

/** Opens the system install dialog. Resolves true if the person accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  const event = deferred
  await event.prompt()
  const { outcome } = await event.userChoice
  // The event can only be used once.
  deferred = null
  emit()
  return outcome === 'accepted'
}

export function isInstallDismissed() {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    return until > Date.now()
  } catch {
    return false
  }
}

export function dismissInstall(days = 14) {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86_400_000))
  } catch {
    // Storage unavailable; the prompt will simply show again next visit.
  }
  emit()
}
