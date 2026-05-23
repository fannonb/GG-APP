import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font } from '@/design-system/tokens'
import { ROUTES, LOGO } from '@/router/routes'

export function SplashScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 2800)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#091c44',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '32px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative rings */}
      {[280, 480, 680].map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: r, height: r,
          borderRadius: '50%',
          border: `1px solid rgba(74,173,223,${0.07 - i * 0.02})`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Logo */}
      <img
        src={LOGO}
        alt="GG'APP"
        width={160}
        height={160}
        style={{ objectFit: 'contain', animation: 'fadeIn 0.7s ease', position: 'relative' }}
      />

      {/* Brand name */}
      <div style={{ textAlign: 'center', animation: 'fadeIn 0.8s ease 0.3s both', position: 'relative' }}>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: font.family }}>
          Gateway Global Healthcare
        </div>
      </div>

      {/* Loading dots */}
      <div style={{ display: 'flex', gap: '8px', animation: 'fadeIn 0.6s ease 1s both', position: 'relative' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: C.blue500,
            animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8) } 50% { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  )
}
