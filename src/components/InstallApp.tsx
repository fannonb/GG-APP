import { useEffect, useRef, useState } from 'react'
import { C, font, radius } from '@/design-system/tokens'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'
const ICON = '/icons/icon-192.png'

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
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ verticalAlign: '-3px' }}>
      <path d="M12 3v12M8 7l4-4 4 4" stroke={CYAN_DEEP} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1" stroke={CYAN_DEEP} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ verticalAlign: '-3px' }}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke={CYAN_DEEP} strokeWidth="2" />
      <path d="M12 8v8M8 12h8" stroke={CYAN_DEEP} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** iPhone and iPad can't be prompted, so this shows the two taps Safari needs. */
export function IOSInstallSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const step = (n: number, body: React.ReactNode) => (
    <li style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderTop: n > 1 ? `1px solid ${C.border}` : 'none' }}>
      <span style={{ width: 26, height: 26, borderRadius: radius.full, background: C.blue100, color: CYAN_DEEP, fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{n}</span>
      <span style={{ fontSize: 15, color: C.text, lineHeight: 1.5, paddingTop: 2 }}>{body}</span>
    </li>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(9,28,68,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Install GG'APP"
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
        style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: `${radius.lg} ${radius.lg} 0 0`, padding: '10px 20px calc(20px + env(safe-area-inset-bottom))', fontFamily: font.family, outline: 'none' }}
      >
        <div aria-hidden style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 14px' }}>
          <span style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={ICON} alt="" width={52} height={52} style={{ borderRadius: 12, flexShrink: 0 }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text }}>Add GG'APP to your Home Screen</h2>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>It opens like an app. No App Store needed.</div>
          </div>
        </div>
        <ol style={{ listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
          {step(1, <>Tap <strong>Share</strong> <ShareIcon /> in Safari’s toolbar</>)}
          {step(2, <>Scroll down and tap <strong>Add to Home Screen</strong> <AddIcon /></>)}
          {step(3, <>Tap <strong>Add</strong>. GG'APP appears with your other apps.</>)}
        </ol>
        <button type="button" onClick={onClose} style={{ ...primaryBtn, width: '100%', height: 46, marginTop: 14 }}>Got it</button>
      </div>
    </div>
  )
}

/** Runs the right install path for this device; returns the sheet when iOS needs it. */
function useInstallAction() {
  const install = useInstallPrompt()
  const [showIOS, setShowIOS] = useState(false)
  const start = () => {
    if (install.mode === 'ios') setShowIOS(true)
    else void install.install()
  }
  const sheet = showIOS ? <IOSInstallSheet onClose={() => setShowIOS(false)} /> : null
  return { ...install, start, sheet }
}

/**
 * Nudge shown on phones and tablets until the app is installed or snoozed.
 * `slim` sits under the sign-in form; `card` sits on a dashboard.
 */
export function InstallAppPrompt({ variant }: { variant: 'slim' | 'card' }) {
  const { shouldNudge, touchDevice, start, dismiss, sheet } = useInstallAction()
  if (!shouldNudge || !touchDevice) return sheet

  const close = (
    <button
      type="button"
      aria-label="Not now"
      onClick={() => dismiss()}
      style={{ width: 32, height: 32, borderRadius: radius.full, border: 'none', background: 'transparent', color: C.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    </button>
  )

  if (variant === 'slim') {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px 10px 12px', background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.md, fontFamily: font.family }}>
          <img src={ICON} alt="" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Get the GG'APP app</div>
            <div style={{ fontSize: 12.5, color: C.textSub }}>Free, no app store needed</div>
          </div>
          <button type="button" onClick={start} style={{ ...primaryBtn, height: 34, padding: '0 14px', fontSize: 13 }}>Install</button>
          {close}
        </div>
        {sheet}
      </>
    )
  }

  return (
    <>
      <section aria-label="Install the app" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16, background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, fontFamily: font.family }}>
        <img src={ICON} alt="" width={52} height={52} style={{ borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Install GG'APP on this device</div>
          <div style={{ fontSize: 13, color: C.textSub, marginTop: 2, lineHeight: 1.45 }}>Opens from your home screen, loads faster and works on a weak connection.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" onClick={start} style={primaryBtn}>Install</button>
            <button type="button" onClick={() => dismiss()} style={{ ...primaryBtn, background: 'transparent', color: C.textSub }}>Not now</button>
          </div>
        </div>
      </section>
      {sheet}
    </>
  )
}

/** Always-available entry in Settings, including on devices where it can't be installed. */
export function InstallAppSetting() {
  const { mode, start, sheet } = useInstallAction()
  const hint = mode === 'installed'
    ? 'Installed on this device'
    : mode === 'unsupported'
      ? 'Open GG’APP in Chrome (Android) or Safari (iPhone, iPad) to install it'
      : 'Add GG’APP to your home screen'
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `1px solid ${C.border}`, fontFamily: font.family }}>
        <img src={ICON} alt="" width={32} height={32} style={{ borderRadius: 8, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Install app</div>
          <div style={{ fontSize: 12, color: mode === 'installed' ? '#15803D' : C.textSub, marginTop: 2 }}>{hint}</div>
        </div>
        {(mode === 'native' || mode === 'ios') && (
          <button type="button" onClick={start} style={{ ...primaryBtn, height: 32, padding: '0 14px', fontSize: 13 }}>Install</button>
        )}
      </div>
      {sheet}
    </>
  )
}
