import { useEffect, useRef, useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { getOpenInSafariUrl, triggerIOSProfileInstall } from '@/services/install-prompt'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'
const MARK_LIGHT = '/gg-mark-light.png'
const WORDMARK_LIGHT = '/gg-wordmark-light.png'

let handledAutoInstallParam = false

const PREVIEW_CARDS = [
  {
    eyebrow: 'Healthcare Credit & Care',
    title: 'Your credit, visits and invoices in one place',
    image: '/screenshots/mobile-dashboard.png',
    gradient: 'linear-gradient(160deg, #0E6BA8 0%, #094173 100%)',
    accent: '#7DD3FC',
  },
  {
    eyebrow: 'Verified Care Providers',
    title: 'Book hospitals, clinics, pharmacies & labs near you',
    image: '/screenshots/mobile-services.png',
    gradient: 'linear-gradient(160deg, #0C5B75 0%, #07384A 100%)',
    accent: '#67E8F9',
  },
] as const

function LightBrandBadge({ size = 44, radiusPx = 12 }: { size?: number; radiusPx?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: radiusPx,
        background: 'radial-gradient(ellipse 95% 100% at 50% 0%, #FFFFFF 0%, #EAF5FD 85%)',
        border: '1px solid #D5E8F7',
        boxShadow: '0 3px 10px rgba(11, 123, 192, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: Math.round(size * 0.14),
        boxSizing: 'border-box',
      }}
    >
      <img
        src={MARK_LIGHT}
        alt=""
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  height: 38,
  padding: '0 16px',
  border: 'none',
  borderRadius: radius.sm,
  background: `linear-gradient(135deg, ${CYAN_MID}, ${CYAN_DEEP})`,
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  fontFamily: font.family,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  textDecoration: 'none',
}

function ShareIcon({ color = CYAN_DEEP }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ verticalAlign: '-3px' }}>
      <path d="M12 3v12M8 7l4-4 4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function AddIcon({ color = CYAN_DEEP }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ verticalAlign: '-3px' }}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke={color} strokeWidth="2" />
      <path d="M12 8v8M8 12h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DownloadAppIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M10 3v9.5m0 0l3.5-3.5M10 12.5L6.5 9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 14.5v1.2A1.3 1.3 0 005.3 17h9.4a1.3 1.3 0 001.3-1.3v-1.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Unified App-Store-style PWA install bottom sheet for both iOS and Android/Desktop
 * on a high-contrast White (`#FFFFFF`) surface.
 *
 * Mirrors Chrome's Richer Install UI (app icon, name, domain, pill Install CTA,
 * description, and horizontal phone-framed screenshot carousel) across every
 * platform. When the user taps "Install":
 * - On Android / Desktop Chromium (`mode === 'native'`), opens the 1-tap OS
 *   install prompt immediately.
 * - On iOS/iPadOS Safari (`mode === 'ios'`), immediately triggers the
 *   `/gg-app.mobileconfig` Web Clip profile download and transitions into the
 *   completion steps (with a toggle for the 2-tap Share → Add to Home Screen flow).
 */
export function RichInstallSheet({
  onClose,
  initialStep = 'showcase',
  autoTriggeredProfile = false,
}: {
  onClose: () => void
  initialStep?: 'showcase' | 'ios-finish' | 'browser-finish'
  autoTriggeredProfile?: boolean
}) {
  const install = useInstallPrompt()
  const { iosBrowser, isIPad, mode, platform } = install
  const isSafari = iosBrowser === 'safari' || iosBrowser === null
  const isWebView = iosBrowser === 'webview'

  const [view, setView] = useState<'showcase' | 'ios-finish' | 'browser-finish'>(initialStep)
  const [iosMethod, setIosMethod] = useState<'direct' | 'share'>(isSafari ? 'direct' : 'share')
  const [profileTriggered, setProfileTriggered] = useState(autoTriggeredProfile)
  const [copied, setCopied] = useState(false)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const subtitleLabel = 'Get care today. Pay over time.'

  useEffect(() => {
    ref.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handlePrimaryInstallClick = async () => {
    if (mode === 'native') {
      const accepted = await install.install()
      if (accepted) onClose()
      return
    }
    if (mode === 'ios') {
      if (isSafari) {
        triggerIOSProfileInstall()
        setProfileTriggered(true)
      }
      setView('ios-finish')
      return
    }
    const prompted = await install.install()
    if (prompted) {
      onClose()
      return
    }
    setView('browser-finish')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable
    }
  }

  const shareBarAtTop = isIPad || iosBrowser === 'chrome' || iosBrowser === 'edge'

  const stepRow = (n: number, body: React.ReactNode) => (
    <li
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 0',
        borderTop: n > 1 ? `1px solid ${C.border}` : 'none',
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: radius.full,
          background: C.blue100,
          color: CYAN_DEEP,
          fontSize: 13,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: 14.5, color: C.text, lineHeight: 1.5, paddingTop: 2 }}>
        {body}
      </span>
    </li>
  )

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(9, 28, 68, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'ggFadeIn 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes ggFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes ggSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>

      {/* Visual floating pointer toward the browser's Share button when in iOS Share mode */}
      {view === 'ios-finish' && !isWebView && iosMethod === 'share' && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            ...(shareBarAtTop
              ? { top: 'calc(12px + env(safe-area-inset-top))', right: 18 }
              : { bottom: 'calc(12px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)' }),
            zIndex: 2002,
            background: '#091C44',
            color: '#FFFFFF',
            padding: '8px 16px',
            borderRadius: radius.full,
            fontSize: 13,
            fontWeight: 800,
            fontFamily: font.family,
            boxShadow: '0 8px 24px rgba(9,28,68,0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'none',
          }}
        >
          <span>Tap <strong>Share</strong> {shareBarAtTop ? 'above ↗' : 'below ↓'}</span>
        </div>
      )}

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Install GG'APP"
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
        onTouchStart={e => {
          setTouchStartY(e.touches[0]?.clientY ?? null)
        }}
        onTouchMove={e => {
          if (touchStartY === null) return
          const delta = (e.touches[0]?.clientY ?? touchStartY) - touchStartY
          if (delta > 0) setDragOffsetY(delta)
        }}
        onTouchEnd={() => {
          if (dragOffsetY > 90) {
            onClose()
          }
          setTouchStartY(null)
          setDragOffsetY(0)
        }}
        style={{
          width: '100%',
          maxWidth: 500,
          background: '#FFFFFF',
          color: C.text,
          borderRadius: '26px 26px 0 0',
          padding: '10px 0 calc(22px + env(safe-area-inset-bottom))',
          fontFamily: font.family,
          outline: 'none',
          boxShadow: '0 -16px 48px rgba(9, 28, 68, 0.22)',
          borderTop: `1px solid ${C.border}`,
          transform: dragOffsetY > 0 ? `translateY(${dragOffsetY}px)` : undefined,
          transition: touchStartY === null ? 'transform 0.2s ease' : 'none',
          animation: 'ggSlideUp 0.26s cubic-bezier(0.22, 1, 0.36, 1)',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        {/* Top drag handle */}
        <div
          aria-hidden
          onClick={onClose}
          style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 14px', cursor: 'pointer' }}
        >
          <span style={{ width: 42, height: 4, borderRadius: 2, background: '#CBD5E1' }} />
        </div>

        {/* Header Row: Light Brand Logo + Wordmark & Host + Pill Install CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '0 20px' }}>
          <LightBrandBadge size={48} radiusPx={13} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <img
              src={WORDMARK_LIGHT}
              alt="GG'APP"
              style={{
                height: 18,
                width: 'auto',
                display: 'block',
              }}
            />
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitleLabel}
            </div>
          </div>

          {view === 'showcase' && (
            <button
              type="button"
              onClick={() => void handlePrimaryInstallClick()}
              style={{
                height: 40,
                padding: '0 24px',
                borderRadius: radius.full,
                border: 'none',
                background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
                color: '#FFFFFF',
                fontSize: 14.5,
                fontWeight: 800,
                fontFamily: font.family,
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(11, 123, 192, 0.28)',
              }}
            >
              Install
            </button>
          )}

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: radius.full,
              border: `1px solid ${C.border}`,
              background: '#F8FAFC',
              color: C.textSub,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {view === 'showcase' && (
          <>
            {/* Description */}
            <p
              style={{
                margin: '14px 20px 16px',
                fontSize: 14,
                lineHeight: 1.5,
                color: C.textSub,
              }}
            >
              Book verified hospitals, clinics, pharmacies and labs, and pay over time with healthcare credit.
            </p>

            {/* Horizontal Screenshot Showcase Carousel */}
            <div
              className="hide-scrollbar"
              style={{
                display: 'flex',
                gap: 12,
                overflowX: 'auto',
                padding: '0 20px 4px',
                scrollSnapType: 'x mandatory',
              }}
            >
              {PREVIEW_CARDS.map(card => (
                <div
                  key={card.title}
                  style={{
                    flex: '0 0 218px',
                    height: 310,
                    borderRadius: 18,
                    background: card.gradient,
                    padding: '16px 14px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    overflow: 'hidden',
                    scrollSnapAlign: 'start',
                    boxShadow: '0 8px 20px rgba(9, 28, 68, 0.14)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'inline-block',
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        color: card.accent,
                        marginBottom: 6,
                      }}
                    >
                      {card.eyebrow}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#FFFFFF',
                        lineHeight: 1.35,
                      }}
                    >
                      {card.title}
                    </div>
                  </div>

                  {/* Framed Phone Preview */}
                  <div
                    style={{
                      marginTop: 12,
                      background: '#061226',
                      borderRadius: '18px 18px 0 0',
                      padding: '6px 6px 0',
                      boxShadow: '0 -4px 18px rgba(0,0,0,0.28)',
                      height: 205,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 4,
                        borderRadius: 2,
                        background: 'rgba(255,255,255,0.25)',
                        margin: '2px auto 6px',
                      }}
                    />
                    <img
                      src={card.image}
                      alt={card.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'top center',
                        borderRadius: '12px 12px 0 0',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'ios-finish' && (
          <div style={{ padding: '14px 20px 0' }}>
            {isWebView ? (
              <div>
                <div
                  style={{
                    padding: '12px 14px',
                    background: '#F8FAFC',
                    border: `1px solid ${C.border}`,
                    borderRadius: radius.md,
                    fontSize: 13.5,
                    color: C.text,
                    lineHeight: 1.5,
                  }}
                >
                  You&apos;re viewing GG&apos;APP inside an in-app browser. Open it in <strong>Safari</strong> to install the app directly onto your {isIPad ? 'iPad' : 'iPhone'} Home Screen.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  <a
                    href={getOpenInSafariUrl()}
                    style={{
                      ...primaryBtn,
                      width: '100%',
                      height: 46,
                      borderRadius: radius.full,
                      fontSize: 15,
                      fontWeight: 800,
                    }}
                  >
                    Open in Safari to Install
                  </a>
                  <button
                    type="button"
                    onClick={() => void copyLink()}
                    style={{
                      ...primaryBtn,
                      width: '100%',
                      height: 42,
                      borderRadius: radius.full,
                      background: '#F8FAFC',
                      color: C.text,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    {copied ? 'Link copied! Paste in Safari' : 'Copy link'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  role="tablist"
                  aria-label="Installation method"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 4,
                    padding: 4,
                    background: '#F1F5F9',
                    borderRadius: radius.sm,
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={iosMethod === 'direct'}
                    onClick={() => setIosMethod('direct')}
                    style={{
                      height: 34,
                      border: 'none',
                      borderRadius: 6,
                      background: iosMethod === 'direct' ? '#FFFFFF' : 'transparent',
                      color: iosMethod === 'direct' ? C.text : C.textSub,
                      fontSize: 12.5,
                      fontWeight: 800,
                      fontFamily: font.family,
                      cursor: 'pointer',
                      boxShadow: iosMethod === 'direct' ? '0 1px 4px rgba(9,28,68,0.08)' : 'none',
                    }}
                  >
                    Direct App Profile
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={iosMethod === 'share'}
                    onClick={() => setIosMethod('share')}
                    style={{
                      height: 34,
                      border: 'none',
                      borderRadius: 6,
                      background: iosMethod === 'share' ? '#FFFFFF' : 'transparent',
                      color: iosMethod === 'share' ? C.text : C.textSub,
                      fontSize: 12.5,
                      fontWeight: 800,
                      fontFamily: font.family,
                      cursor: 'pointer',
                      boxShadow: iosMethod === 'share' ? '0 1px 4px rgba(9,28,68,0.08)' : 'none',
                    }}
                  >
                    Share Menu (2 Taps)
                  </button>
                </div>

                {iosMethod === 'direct' ? (
                  <div style={{ marginTop: 12 }}>
                    {isSafari ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '10px 12px',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: radius.sm,
                            fontSize: 12.5,
                            color: '#1E3A8A',
                          }}
                        >
                          <span>
                            {profileTriggered
                              ? 'Installer triggered — tap Allow on the iOS prompt.'
                              : 'Download the GG’APP Home Screen installer.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              triggerIOSProfileInstall()
                              setProfileTriggered(true)
                            }}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #93C5FD',
                              borderRadius: 6,
                              padding: '6px 10px',
                              fontSize: 12,
                              fontWeight: 800,
                              color: CYAN_DEEP,
                              cursor: 'pointer',
                              flexShrink: 0,
                              fontFamily: font.family,
                            }}
                          >
                            {profileTriggered ? 'Download again' : 'Download'}
                          </button>
                        </div>
                        <ol style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
                          {stepRow(1, <>Tap <strong>Allow</strong> on the iOS dialog to download the GG&apos;APP icon profile.</>)}
                          {stepRow(2, <>Open <strong>Settings</strong> → tap <strong>Profile Downloaded</strong> at the top → tap <strong>Install</strong>.</>)}
                        </ol>
                      </>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            padding: '12px 14px',
                            background: '#F8FAFC',
                            border: `1px solid ${C.border}`,
                            borderRadius: radius.sm,
                            fontSize: 13.5,
                            color: C.text,
                            lineHeight: 1.5,
                          }}
                        >
                          Direct profile installation runs through Safari. Tap below to launch Safari and start the installer automatically, or use the <strong>Share Menu (2 Taps)</strong> tab right here.
                        </div>
                        <a
                          href={getOpenInSafariUrl()}
                          style={{
                            ...primaryBtn,
                            width: '100%',
                            height: 44,
                            marginTop: 12,
                            borderRadius: radius.full,
                            fontWeight: 800,
                          }}
                        >
                          Open in Safari &amp; Install
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 10 }}>
                    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {stepRow(
                        1,
                        <>
                          Tap <strong>Share</strong> <ShareIcon /> in your browser&apos;s {shareBarAtTop ? 'top-right address bar' : 'bottom toolbar'}
                        </>,
                      )}
                      {stepRow(2, <>Tap <strong>Add to Home Screen</strong> <AddIcon /> then tap <strong>Add</strong></>)}
                    </ol>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.textSub,
                        background: '#F8FAFC',
                        border: `1px solid ${C.border}`,
                        padding: '8px 12px',
                        borderRadius: radius.sm,
                        marginTop: 6,
                      }}
                    >
                      Tip: Adding via the Share menu also enables real-time push notifications on iOS.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {view === 'browser-finish' && (
          <div style={{ padding: '12px 20px 0' }}>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {mode === 'macos' ? (
                <>
                  {stepRow(1, <>Click <strong>Share</strong> <ShareIcon /> (or <strong>File</strong>) in Safari&apos;s top bar</>)}
                  {stepRow(2, <>Select <strong>Add to Dock…</strong> and click <strong>Add</strong></>)}
                </>
              ) : platform === 'android' ? (
                <>
                  {stepRow(1, <>Tap the browser menu <strong>⋮</strong> in the top corner</>)}
                  {stepRow(2, <>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></>)}
                </>
              ) : (
                <>
                  {stepRow(1, <>Click the <strong>Install</strong> icon in your browser&apos;s address bar (or open the <strong>⋮</strong> menu)</>)}
                  {stepRow(2, <>Select <strong>Install GG&apos;APP</strong></>)}
                </>
              )}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

/** Kept as an alias so existing callers (`OnboardingScreen`) work seamlessly. */
export function IOSInstallSheet({
  onClose,
  autoTriggeredProfile = false,
}: {
  onClose: () => void
  autoTriggeredProfile?: boolean
}) {
  return (
    <RichInstallSheet
      onClose={onClose}
      initialStep="ios-finish"
      autoTriggeredProfile={autoTriggeredProfile}
    />
  )
}

export function BrowserInstallSheet({ onClose }: { onClose: () => void }) {
  return <RichInstallSheet onClose={onClose} initialStep="browser-finish" />
}

function consumeAutoInstallParam(): boolean {
  if (handledAutoInstallParam || typeof window === 'undefined') return false
  const url = new URL(window.location.href)
  if (url.searchParams.get('install') !== '1') return false
  handledAutoInstallParam = true
  url.searchParams.delete('install')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  return true
}

/** Runs the right install path for this device; opens the Rich Install Sheet when requested. */
function useInstallAction() {
  const install = useInstallPrompt()
  const [autoRequested] = useState(() => consumeAutoInstallParam())
  const [sheetOpen, setSheetOpen] = useState<boolean>(() => Boolean(autoRequested && install.canInstall))
  const [initialStep, setInitialStep] = useState<'showcase' | 'ios-finish' | 'browser-finish'>(() =>
    autoRequested && install.mode === 'ios' ? 'ios-finish' : 'showcase',
  )
  const [autoTriggeredProfile, setAutoTriggeredProfile] = useState(() =>
    Boolean(autoRequested && install.mode === 'ios' && install.iosBrowser === 'safari'),
  )

  const openShowcase = () => {
    setInitialStep('showcase')
    setAutoTriggeredProfile(false)
    setSheetOpen(true)
  }

  // Trigger external download / prompt side-effect when arriving via `?install=1`
  useEffect(() => {
    if (!autoRequested) return
    if (install.mode === 'ios' && install.iosBrowser === 'safari') {
      triggerIOSProfileInstall()
    } else if (install.mode === 'native') {
      void install.install()
    }
  }, [autoRequested, install])

  const sheet = sheetOpen ? (
    <RichInstallSheet
      initialStep={initialStep}
      autoTriggeredProfile={autoTriggeredProfile}
      onClose={() => setSheetOpen(false)}
    />
  ) : null

  return { ...install, start: openShowcase, sheet }
}

/**
 * Top Smart App Banner (shown at the very top of the viewport until installed
 * or explicitly closed with `×`).
 *
 * Clicking "Install" opens the white Unified App-Store-style Bottom Sheet (or
 * triggers installation), so even if the user previously clicked away from the
 * bottom sheet, the top prompt stays accessible right at the top of the screen.
 */
export function InstallTopBanner() {
  const { shouldNudge, start, dismiss, sheet } = useInstallAction()
  if (!shouldNudge) return sheet

  return (
    <>
      <div
        role="region"
        aria-label="Install GG'APP"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#FFFFFF',
          borderBottom: `1px solid ${C.border}`,
          boxShadow: '0 2px 12px rgba(9, 28, 68, 0.06)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: font.family,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 680,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <button
            type="button"
            aria-label="Dismiss install banner"
            title="Dismiss"
            onClick={() => dismiss()}
            style={{
              width: 28,
              height: 28,
              borderRadius: radius.full,
              border: 'none',
              background: 'transparent',
              color: C.textSub,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <LightBrandBadge size={42} radiusPx={11} />

          <div
            onClick={start}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              lineHeight: 1.4,
              color: C.text,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Get the{' '}
            <img
              src={WORDMARK_LIGHT}
              alt="GG'APP"
              style={{
                height: 12.5,
                width: 'auto',
                display: 'inline-block',
                verticalAlign: '-1.5px',
                margin: '0 2px',
              }}
            />{' '}
            app on your smartphone, tablet or desktop computer
          </div>

          <button
            type="button"
            onClick={start}
            style={{
              height: 38,
              padding: '0 18px',
              borderRadius: 10,
              border: 'none',
              background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
              color: '#FFFFFF',
              fontSize: 13.5,
              fontWeight: 700,
              fontFamily: font.family,
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(11, 123, 192, 0.22)',
            }}
          >
            Install
          </button>
        </div>
      </div>
      {sheet}
    </>
  )
}

/**
 * Kept for backwards compatibility; the install experience is now led by
 * the top banner (`InstallTopBanner`), header pill, and sidebar item.
 */
export function InstallAppPrompt(_props?: { variant?: 'slim' | 'card' }) {
  return null
}

/**
 * Quiet, 1-tap "Install app" pill button for top bars (desktop & mobile).
 * Opens the unified Rich Install Sheet and hides once installed.
 */
export function InstallAppHeaderButton({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const { canInstall, start, sheet } = useInstallAction()
  if (!canInstall) return sheet

  return (
    <>
      <button
        type="button"
        onClick={start}
        title="Install GG'APP on this device"
        aria-label="Install app"
        style={{
          height: compact ? 36 : 38,
          padding: compact ? '0 11px' : '0 14px',
          borderRadius: compact ? '10px' : radius.full,
          background: dark ? 'rgba(56,182,255,0.16)' : '#FFFFFF',
          border: dark ? '1px solid rgba(56,182,255,0.32)' : '1px solid #E2E8F0',
          color: dark ? '#FFFFFF' : C.navy800,
          fontSize: compact ? '12px' : '13px',
          fontWeight: 700,
          fontFamily: font.family,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ color: dark ? C.blue300 : CYAN_DEEP, display: 'flex', alignItems: 'center' }}>
          <DownloadAppIcon size={compact ? 14 : 15} />
        </span>
        <span>Install{compact ? '' : ' app'}</span>
      </button>
      {sheet}
    </>
  )
}

/**
 * Subtle sidebar / mobile-drawer navigation entry so users can always install
 * GG'APP whenever they choose, even after dismissing a banner.
 */
export function InstallAppSidebarItem({ onSelect }: { onSelect?: () => void }) {
  const { canInstall, start, sheet } = useInstallAction()
  if (!canInstall) return sheet

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onSelect?.()
          start()
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          width: '100%',
          padding: '10px 14px',
          borderRadius: '12px',
          border: '1px solid rgba(56,182,255,0.22)',
          background: 'rgba(56,182,255,0.10)',
          color: '#FFFFFF',
          fontSize: '13.5px',
          fontWeight: 700,
          fontFamily: font.family,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
          marginBottom: '4px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(56,182,255,0.20)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(56,182,255,0.10)'
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: C.blue300 }}>
          <DownloadAppIcon size={16} />
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          Install App
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: radius.full,
            background: 'rgba(56,182,255,0.2)',
            color: C.blue300,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Free
        </span>
      </button>
      {sheet}
    </>
  )
}

/** Always-available entry in Settings, including on devices where it's already installed. */
export function InstallAppSetting() {
  const { mode, canInstall, start, sheet } = useInstallAction()
  const hint = mode === 'installed'
    ? 'Installed on this device'
    : 'Add GG’APP to your home screen or desktop for instant access'
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `1px solid ${C.border}`, fontFamily: font.family }}>
        <LightBrandBadge size={36} radiusPx={9} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Install app</div>
          <div style={{ fontSize: 12, color: mode === 'installed' ? '#15803D' : C.textSub, marginTop: 2 }}>{hint}</div>
        </div>
        {canInstall && (
          <button type="button" onClick={start} style={{ ...primaryBtn, height: 32, padding: '0 14px', fontSize: 13 }}>
            <DownloadAppIcon size={14} />
            Install
          </button>
        )}
      </div>
      {sheet}
    </>
  )
}

/** Hero install button used on the public `/download` screen. */
export function InstallAppHeroCTA() {
  const { mode, platform, isIPad, start, sheet } = useInstallAction()
  const isInstalled = mode === 'installed'
  const deviceLabel =
    platform === 'ios'
      ? isIPad
        ? 'iPad'
        : 'iPhone'
      : platform === 'android'
        ? 'Android'
        : 'Desktop'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
      {isInstalled ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 52,
            borderRadius: radius.md,
            background: '#DCFCE7',
            color: '#15803D',
            fontWeight: 700,
            fontSize: 16,
            fontFamily: font.family,
          }}
        >
          Installed on this device
        </div>
      ) : (
        <button
          type="button"
          onClick={start}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            height: 54,
            borderRadius: radius.md,
            border: 'none',
            background: C.blue500,
            color: '#fff',
            fontWeight: 700,
            fontSize: 17,
            fontFamily: font.family,
            cursor: 'pointer',
            transition: 'background 0.16s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#3B9FD4')}
          onMouseLeave={e => (e.currentTarget.style.background = C.blue500)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Install Instant App ({deviceLabel})
        </button>
      )}
      <p style={{ margin: 0, fontSize: 12.5, color: C.textLight }}>
        Installs in seconds · Works on iPhone, iPad, Android &amp; Desktop · No store needed
      </p>
      {sheet}
    </div>
  )
}
