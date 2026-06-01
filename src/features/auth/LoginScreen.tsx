import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GGInput, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useAuthStore } from '@/store/auth.store'
import { PORTAL_HOME, ROUTES, LOGO } from '@/router/routes'
import { AuthBrandPanel } from './components/AuthBrandPanel'
import { EntityTabBar } from './components/EntityTabBar'
import type { UserRole } from '@/types/user.types'

type Tab = 'patient' | 'sp'

export function LoginScreen() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const { isMobile } = useResponsive()
  const [tab, setTab] = useState<Tab>('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = () => {
    setLoading(true)
    setTimeout(() => {
      const role: UserRole = tab === 'patient' ? 'patient' : 'sp'
      login(role)
      navigate(role === 'patient' ? PORTAL_HOME.patient : PORTAL_HOME.sp)
    }, 1200)
  }

  const handleGoogleLogin = () => {
    setLoading(true)
    setTimeout(() => { login('patient'); navigate(PORTAL_HOME.patient) }, 900)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? 'auto' : '100vh',
      minHeight: '100vh',
      overflow: isMobile ? 'visible' : 'hidden',
      fontFamily: font.family,
      background: C.bg,
    }}>
      <AuthBrandPanel tab={tab} />

      {/* Mobile brand header */}
      {isMobile && (
        <div style={{
          background: '#091c44',
          padding: '36px 24px 32px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '0 0 28px 28px',
        }}>
          {/* Decorative rings */}
          {[160, 260, 360].map((r, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: r, height: r,
              borderRadius: '50%',
              border: `1px solid rgba(74,173,223,${0.08 - i * 0.02})`,
              top: '50%', right: '-40px',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }} />
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <img src={LOGO} alt="GG'APP" width={80} height={80} style={{ objectFit: 'contain' }} />
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '10px', lineHeight: 1.4, textAlign: 'center' }}>
              {tab === 'patient' ? 'Healthcare Access, Simplified.' : 'Grow Your Practice.'}
            </div>
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
            {(tab === 'patient'
              ? ['Zero Upfront Cost', 'Verified Providers', 'Secure Payments']
              : ['Instant Disbursements', 'Pre-verified Patients', 'Simplified Admin']
            ).map(label => (
              <div key={label} style={{
                padding: '6px 12px',
                borderRadius: '20px',
                background: 'rgba(74,173,223,0.1)',
                border: '1px solid rgba(74,173,223,0.25)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
                whiteSpace: 'nowrap',
              }}>{label}</div>
            ))}
          </div>
        </div>
      )}

      {/* Form panel */}
      <div style={{
        flex: 1,
        overflowY: isMobile ? 'visible' : 'auto',
        background: C.bg,
      }}>
        <div style={{
          minHeight: isMobile ? 'auto' : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '28px 16px 36px' : '36px 40px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: '100%',
            maxWidth: 440,
            height: isMobile ? 'auto' : '570px',
            background: '#ffffff',
            border: `1px solid ${C.border}`,
            borderRadius: radius.lg,
            padding: isMobile ? '28px 20px' : '40px 36px',
            boxShadow: '0 12px 40px rgba(9, 28, 68, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}>
            <EntityTabBar tab={tab} setTab={t => { setTab(t); setEmail(''); setPassword('') }} />

            <div style={{ marginBottom: '24px', marginTop: '4px' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '6px' }}>
                {tab === 'patient' ? 'Welcome back 👋' : 'Provider Portal 🏥'}
              </div>
              <div style={{ fontSize: '14px', color: C.textSub }}>
                {tab === 'patient' ? 'Sign in to your patient account' : 'Sign in to manage your practice'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <GGInput
                label="Email Address"
                placeholder={tab === 'patient' ? 'you@example.com' : 'practice@domain.com'}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, letterSpacing: '-0.01em', fontFamily: font.family }}>
                    Password <span style={{ color: C.error }}>*</span>
                  </label>
                  <span style={{ fontSize: '13px', color: C.blue500, fontWeight: 700, cursor: 'pointer', fontFamily: font.family }} onClick={() => {}}>
                    Forgot password?
                  </span>
                </div>
                <GGInput
                  placeholder="••••••••"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  rightEl={
                    <span onClick={() => setShowPw(s => !s)} style={{ fontSize: '12px', color: C.blue500, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                      {showPw ? 'Hide' : 'Show'}
                    </span>
                  }
                />
              </div>
            </div>

            <GGButton variant="primary" size="md" fullWidth onClick={handleLogin} disabled={loading}>
              {loading ? 'Signing In…' : 'Sign In →'}
            </GGButton>

            {tab === 'patient' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: C.border }} />
                  <span style={{ fontSize: '12px', color: C.textSub, fontWeight: 500 }}>or continue with</span>
                  <div style={{ flex: 1, height: '1px', background: C.border }} />
                </div>
                <button
                  onClick={handleGoogleLogin}
                  style={{ width: '100%', padding: '11px 20px', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: C.text, fontFamily: font.family, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>
              </>
            )}

            {tab === 'sp' && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: C.successBg, borderRadius: radius.sm, border: '1px solid rgba(34,201,138,0.2)', fontSize: '12px', color: '#0D6B47', lineHeight: 1.6 }}>
                Provider accounts require admin verification. Approved providers can log in immediately. New? Register below.
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '13px', color: C.textSub, marginTop: 'auto', borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
              No account?  
              <Link to={`${ROUTES.REGISTER}?tab=${tab}`} style={{ color: C.blue500, fontWeight: 700, textDecoration: 'none' }}>
                Register as {tab === 'patient' ? 'a Patient' : 'a Provider'}
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

