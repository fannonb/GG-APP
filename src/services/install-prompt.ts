/**
 * Tracks whether GG'APP can be installed on this device and how.
 *
 * - Chromium browsers (Android Chrome, Edge, Samsung Internet, Brave, desktop
 *   Chrome/Edge) fire `beforeinstallprompt`, which we capture early in
 *   `public/boot.js` and here so our own UI can open the 1-tap system install
 *   dialog immediately.
 * - Apple iOS/iPadOS devices support two paths:
 *   1. Direct Web Clip profile install (`/gg-app.mobileconfig`) in Safari,
 *      which triggers the native iOS profile download dialog on tap.
 *   2. Browser Share → "Add to Home Screen" across Safari, Chrome, Edge and
 *      Firefox on iOS 16.4+ (and `x-safari-https://` breakout from in-app
 *      webviews like WhatsApp or Instagram).
 * - macOS Safari ("Add to Dock") and browsers where `beforeinstallprompt` has
 *   not fired yet fall back to `'macos'` / `'manual'` so the install option
 *   remains discoverable and functional everywhere.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __GG_APP_BOOT__?: {
      mounted?: boolean
      deferredInstallPrompt?: BeforeInstallPromptEvent | null
    }
  }
}

export type InstallMode = 'native' | 'ios' | 'macos' | 'manual' | 'installed' | 'unsupported'
export type IOSBrowser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'webview' | null
export type InstallPlatform = 'ios' | 'android' | 'desktop'

export interface InstallState {
  mode: InstallMode
  /** Phone or tablet, where installing matters most. */
  touchDevice: boolean
  platform: InstallPlatform
  iosBrowser: IOSBrowser
  isIPad: boolean
}

export const IOS_PROFILE_PATH = '/gg-app.mobileconfig'
const LEGACY_DISMISS_KEY = 'gg_install_dismissed_until'

// Clear any legacy 14-day localStorage lock so the install prompt does not
// permanently disappear if the user previously clicked away.
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(LEGACY_DISMISS_KEY)
  } catch {
    // Ignore storage errors
  }
}

let deferred: BeforeInstallPromptEvent | null =
  typeof window !== 'undefined' ? (window.__GG_APP_BOOT__?.deferredInstallPrompt ?? null) : null
let installedNow = false
let dismissedThisPage = false
const listeners = new Set<() => void>()

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.matchMedia?.('(display-mode: minimal-ui)').matches
    || window.matchMedia?.('(display-mode: window-controls-overlay)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function detectIPad() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ reports itself as a Mac, so check for touch as well.
  return /iPad|iPhone|iPod/.test(ua) || detectIPad()
}

function detectIOSBrowser(): IOSBrowser {
  if (!isIOS()) return null
  const ua = navigator.userAgent
  if (/CriOS/i.test(ua)) return 'chrome'
  if (/EdgiOS/i.test(ua)) return 'edge'
  if (/FxiOS/i.test(ua)) return 'firefox'
  // Common in-app browsers (WhatsApp, Instagram, Facebook, LinkedIn, Gmail, X)
  if (/FBAN|FBAV|Instagram|Line|WhatsApp|LinkedInApp|GSA\/|Twitter|MicroMessenger|wv/i.test(ua)) {
    return 'webview'
  }
  if (/Safari/i.test(ua) && !/OPiOS/i.test(ua)) return 'safari'
  return 'webview'
}

function isMacOSSafari() {
  if (typeof navigator === 'undefined' || isIOS()) return false
  const ua = navigator.userAgent
  return /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua)
}

function detectPlatform(): InstallPlatform {
  if (isIOS()) return 'ios'
  if (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)) return 'android'
  return 'desktop'
}

function compute(): InstallState {
  if (typeof window === 'undefined') {
    return {
      mode: 'unsupported',
      touchDevice: false,
      platform: 'desktop',
      iosBrowser: null,
      isIPad: false,
    }
  }
  const touchDevice = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 1
  const platform = detectPlatform()
  const iosBrowser = detectIOSBrowser()
  const isIPad = detectIPad()

  if (installedNow || isStandalone()) {
    return { mode: 'installed', touchDevice, platform, iosBrowser, isIPad }
  }
  if (deferred) {
    return { mode: 'native', touchDevice, platform, iosBrowser, isIPad }
  }
  if (isIOS()) {
    return { mode: 'ios', touchDevice: true, platform: 'ios', iosBrowser, isIPad }
  }
  if (isMacOSSafari()) {
    return { mode: 'macos', touchDevice, platform: 'desktop', iosBrowser: null, isIPad: false }
  }
  return { mode: 'manual', touchDevice, platform, iosBrowser: null, isIPad: false }
}

let snapshot: InstallState = compute()

function emit() {
  snapshot = compute()
  listeners.forEach(listener => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    // Stop the browser's own mini-infobar; we show the prompt where it fits.
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    if (window.__GG_APP_BOOT__) {
      window.__GG_APP_BOOT__.deferredInstallPrompt = deferred
    }
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installedNow = true
    if (window.__GG_APP_BOOT__) {
      window.__GG_APP_BOOT__.deferredInstallPrompt = null
    }
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
  if (!deferred && typeof window !== 'undefined' && window.__GG_APP_BOOT__?.deferredInstallPrompt) {
    deferred = window.__GG_APP_BOOT__.deferredInstallPrompt
  }
  if (!deferred) return false
  const event = deferred
  await event.prompt()
  const { outcome } = await event.userChoice
  // The event can only be used once.
  deferred = null
  if (typeof window !== 'undefined' && window.__GG_APP_BOOT__) {
    window.__GG_APP_BOOT__.deferredInstallPrompt = null
  }
  if (outcome === 'accepted') {
    installedNow = true
  }
  emit()
  return outcome === 'accepted'
}

/**
 * Triggers the native iOS Web Clip configuration profile download in Safari.
 * Because `/gg-app.mobileconfig` is served with `application/x-apple-aspen-config`,
 * iOS Safari keeps the current page open and displays the system "Allow" dialog.
 */
export function triggerIOSProfileInstall() {
  if (typeof window === 'undefined') return
  const link = document.createElement('a')
  link.href = `${IOS_PROFILE_PATH}?t=${Date.now()}`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Builds an `x-safari-https://` deep link so iOS users in third-party or
 * in-app browsers (WhatsApp, Instagram, Chrome) can jump straight into Safari
 * with `?install=1` to auto-trigger the direct installer.
 */
export function getOpenInSafariUrl(): string {
  if (typeof window === 'undefined') return 'https://app.gatewayglobal.africa/?install=1'
  const url = new URL(window.location.href)
  url.searchParams.set('install', '1')
  const scheme = url.protocol === 'https:' ? 'x-safari-https://' : 'x-safari-http://'
  return `${scheme}${url.host}${url.pathname}${url.search}${url.hash}`
}

export function isInstallDismissed() {
  return dismissedThisPage
}

export function dismissInstall() {
  dismissedThisPage = true
  emit()
}
