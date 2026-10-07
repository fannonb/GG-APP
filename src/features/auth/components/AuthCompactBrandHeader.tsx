import { Link, useNavigate } from 'react-router-dom'
import { C, font } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'

type Tab = 'patient' | 'sp'

const MARK_LIGHT = '/gg-mark-light.png'
const WORDMARK_LIGHT = '/gg-wordmark-light.png'
const CYAN_DEEP = '#0B7BC0'

const TAGLINE: Record<Tab, string> = {
  patient: 'Get care today. Pay over time.',
  sp: 'Treat patients. Get paid on approval.',
}

/**
 * Mobile/tablet auth header on a light background.
 * `hero` (sign in) shows the mark and tagline; `bar` (sign up) is a slim row
 * so the form starts near the top of small phones.
 */
export function AuthCompactBrandHeader({ tab, variant = 'hero' }: { tab: Tab; variant?: 'hero' | 'bar' }) {
  const { isTablet } = useResponsive()
  const navigate = useNavigate()

  if (variant === 'bar') {
    return (
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: `calc(10px + env(safe-area-inset-top)) 12px 10px`,
          background: '#fff',
          borderBottom: `1px solid ${C.border}`,
          fontFamily: font.family,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(ROUTES.LOGIN))}
          style={{ width: 40, height: 40, borderRadius: 999, border: 'none', background: 'transparent', color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <img src={WORDMARK_LIGHT} alt="GG'APP" style={{ height: 18, width: 'auto', display: 'block' }} />
        <Link to={`${ROUTES.LOGIN}?tab=${tab}`} style={{ marginLeft: 'auto', padding: '8px 10px', fontSize: 14, fontWeight: 700, color: CYAN_DEEP, textDecoration: 'none' }}>
          Sign in
        </Link>
      </header>
    )
  }

  return (
    <header
      style={{
        background: 'radial-gradient(ellipse 90% 100% at 50% 0%, #FFFFFF 0%, #EAF5FD 75%)',
        padding: isTablet ? 'calc(40px + env(safe-area-inset-top)) 32px 28px' : 'calc(32px + env(safe-area-inset-top)) 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: font.family,
      }}
    >
      <img src={MARK_LIGHT} alt="" aria-hidden style={{ width: isTablet ? 76 : 64, height: 'auto', display: 'block' }} />
      <img src={WORDMARK_LIGHT} alt="GG'APP" style={{ height: isTablet ? 22 : 19, width: 'auto', display: 'block', marginTop: 14 }} />
      <div style={{ marginTop: 8, fontSize: isTablet ? 15 : 14, color: C.textSub, textAlign: 'center' }}>{TAGLINE[tab]}</div>
    </header>
  )
}
