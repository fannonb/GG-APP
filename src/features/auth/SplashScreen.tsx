import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { C, font } from '@/design-system/tokens'
import { ROUTES, PORTAL_HOME } from '@/router/routes'
import { useAuthStore } from '@/store/auth.store'
import { getInstallState } from '@/services/install-prompt'

/** Long enough for the mark to land, short enough not to feel like a wait. */
const SPLASH_MS = 1200
const SEEN_KEY = 'gg_seen_splash'

const MARK_LIGHT = '/gg-mark-light.png'
const WORDMARK_LIGHT = '/gg-wordmark-light.png'

function seenBefore() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function SplashScreen() {
  const navigate = useNavigate()
  const { loggedIn, userRole } = useAuthStore()
  // Returning visitors and the installed app (which already shows the phone's
  // own launch screen) go straight in; only a first visit sees the intro.
  const [skip] = useState(() => (loggedIn && !!userRole) || seenBefore() || getInstallState().mode === 'installed')
  const target = loggedIn && userRole ? PORTAL_HOME[userRole] : ROUTES.LOGIN

  useEffect(() => {
    if (skip) return
    const t = setTimeout(() => {
      // Mark it seen only once it has actually played, so a remount mid-way still shows it.
      try { localStorage.setItem(SEEN_KEY, '1') } catch { /* private mode */ }
      navigate(target, { replace: true })
    }, SPLASH_MS)
    return () => clearTimeout(t)
  }, [skip, navigate, target])

  if (skip) return <Navigate to={target} replace />

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'radial-gradient(ellipse 80% 55% at 50% 42%, #FFFFFF 0%, #EAF5FD 70%, #DDEFFB 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        fontFamily: font.family,
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <img src={MARK_LIGHT} alt="" aria-hidden className="gg-splash-mark" style={{ width: 112, height: 'auto', display: 'block' }} />
      <img src={WORDMARK_LIGHT} alt="GG'APP" className="gg-splash-fade" style={{ height: 24, width: 'auto', marginTop: 24, display: 'block', animationDelay: '0.15s' }} />
      <div className="gg-splash-fade" style={{ marginTop: 12, fontSize: 15, color: C.textSub, animationDelay: '0.25s' }}>
        Get care today. Pay over time.
      </div>

      <div style={{ position: 'absolute', bottom: 'max(24px, env(safe-area-inset-bottom))', fontSize: 12, color: C.textLight }}>
        A Gateway Global product
      </div>

      <style>{`
        .gg-splash-mark { animation: ggMarkIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both }
        .gg-splash-fade { animation: ggFadeUp 0.45s ease both }
        @keyframes ggMarkIn { from { opacity: 0; transform: scale(0.92) } to { opacity: 1; transform: none } }
        @keyframes ggFadeUp { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .gg-splash-mark, .gg-splash-fade { animation: none } }
      `}</style>
    </div>
  )
}
