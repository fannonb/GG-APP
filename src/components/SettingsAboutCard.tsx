import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, radius } from '@/design-system/tokens'
import { ROUTES } from '@/router/routes'
import { InstallAppSetting } from '@/components/InstallApp'

const SUPPORT_EMAIL = 'support@gatewayglobal.africa'

function Row({ label, hint, onClick, href }: { label: string; hint: string; onClick?: () => void; href?: string }) {
  const content: ReactNode = (
    <>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{label}</div>
        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{hint}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ color: C.textLight, flexShrink: 0 }}>
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  )
  const style: React.CSSProperties = {
    all: 'unset',
    boxSizing: 'border-box',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderTop: `1px solid ${C.border}`,
    cursor: 'pointer',
    fontFamily: font.family,
  }
  return href
    ? <a href={href} style={style}>{content}</a>
    : <button type="button" onClick={onClick} style={style}>{content}</button>
}

/** Help, legal links and sign-out — shared by patient and provider settings. */
export function SettingsAboutCard({ onSignOut, signingOut }: { onSignOut: () => void; signingOut?: boolean }) {
  const navigate = useNavigate()
  return (
    <section
      aria-label="About and support"
      style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: '18px 22px 8px', fontFamily: font.family }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 6 }}>About & support</div>
      <InstallAppSetting />
      <Row label="Help & support" hint={SUPPORT_EMAIL} href={`mailto:${SUPPORT_EMAIL}`} />
      <Row label="Terms & conditions" hint="How GG'APP works and your obligations" onClick={() => navigate(ROUTES.TERMS)} />
      <Row label="Privacy policy" hint="What we collect and how we protect it" onClick={() => navigate(ROUTES.PRIVACY_POLICY)} />
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 0' }}>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          style={{ background: 'none', border: 'none', padding: 0, color: '#B91C1C', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </section>
  )
}
