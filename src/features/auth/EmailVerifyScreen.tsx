import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { GGInput, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { isMockApi } from '@/api/config'
import { ApiError } from '@/api/types'
import { authService } from '@/api/services/auth.service'
import { useVerifyEmailMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { AuthBrandPanel } from './components/AuthBrandPanel'

/** Set by registration only outside production, where the API returns the token. */
const VERIFY_TOKEN_STORAGE_KEY = 'gg_verify_token'

function Icon({ tone }: { tone: 'info' | 'success' | 'error' }) {
  const bg = tone === 'success' ? 'rgba(16,185,129,0.12)' : tone === 'error' ? 'rgba(229,71,77,0.10)' : C.blue100
  const fg = tone === 'success' ? '#059669' : tone === 'error' ? C.error : C.blue500
  return (
    <div style={{ width: 72, height: 72, borderRadius: '50%', background: bg, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {tone === 'success' ? (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
          <path d="M8 16.5l5.5 5.5L24 11" stroke={fg} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
          <rect x="3" y="7" width="26" height="18" rx="3" stroke={fg} strokeWidth="1.8" />
          <path d="M3 10l13 9 13-9" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </div>
  )
}

/**
 * Two ways in:
 * - from the link in the verification email (/verify?token=…): verifies straight away;
 * - right after registering: "check your inbox", with a way to resend the email.
 */
export function EmailVerifyScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { isMobile } = useResponsive()
  const verifyMutation = useVerifyEmailMutation()

  const linkToken = searchParams.get('token')
  const devToken = typeof window === 'undefined' ? null : window.sessionStorage.getItem(VERIFY_TOKEN_STORAGE_KEY)
  const registeredEmail = (location.state as { email?: string } | null)?.email ?? ''

  const [email, setEmail] = useState(registeredEmail)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const startedRef = useRef(false)

  const verify = (token: string) => {
    verifyMutation.mutate(token, {
      onSuccess: () => window.sessionStorage.removeItem(VERIFY_TOKEN_STORAGE_KEY),
    })
  }

  // Opening the email link verifies immediately; the ref stops a second call in StrictMode.
  useEffect(() => {
    if (linkToken && !startedRef.current) {
      startedRef.current = true
      if (isMockApi) return
      verify(linkToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken])

  const resend = async () => {
    const address = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setResendState('error')
      return
    }
    setResendState('sending')
    try {
      await authService.resendVerification(address)
      setResendState('sent')
    } catch {
      setResendState('error')
    }
  }

  const verified = verifyMutation.isSuccess || (isMockApi && !!linkToken)
  const failed = verifyMutation.isError
  const verifying = verifyMutation.isPending || (!!linkToken && !verified && !failed && !isMockApi)
  const errorMessage =
    verifyMutation.error instanceof ApiError
      ? verifyMutation.error.message
      : 'We couldn’t verify your email. Please try again.'

  let tone: 'info' | 'success' | 'error' = 'info'
  let title = 'Check your email'
  let body: string
  if (verified) {
    tone = 'success'
    title = 'Email verified'
    body = 'Your email address is confirmed. You can now sign in to GG’APP.'
  } else if (verifying) {
    title = 'Verifying your email…'
    body = 'This only takes a moment.'
  } else if (failed) {
    tone = 'error'
    title = 'This link didn’t work'
    body = /invalid or expired/i.test(errorMessage)
      ? 'This verification link has expired or has already been used. Links are valid for 24 hours. Send yourself a new one below.'
      : errorMessage
  } else {
    body = registeredEmail
      ? `We sent a verification link to ${registeredEmail}. Open it to activate your account, then sign in.`
      : 'We sent you a verification link. Open it to activate your account, then sign in.'
  }

  const showResend = !verified && !verifying
  const linkStyle = { color: C.blue500, fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: font.family, fontSize: 13 }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font.family }}>
      <AuthBrandPanel tab="patient" />

      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '24px 20px' : '40px',
        background: '#fff',
      }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }} aria-live="polite">
          <Icon tone={tone} />

          <div style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {title}
          </div>
          <div style={{ fontSize: 14.5, color: C.textSub, lineHeight: 1.6, marginBottom: 24, overflowWrap: 'anywhere' }}>
            {body}
          </div>

          {verified && (
            <GGButton variant="primary" size="md" fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
              Sign in
            </GGButton>
          )}

          {/* Local development only: the API returned the token at registration. */}
          {!linkToken && !verified && !failed && devToken && !isMockApi && (
            <div style={{ marginBottom: 20 }}>
              <GGButton variant="primary" size="md" fullWidth onClick={() => verify(devToken)} disabled={verifyMutation.isPending}>
                {verifyMutation.isPending ? 'Verifying…' : 'Verify now (development)'}
              </GGButton>
            </div>
          )}

          {showResend && (
            <div style={{ textAlign: 'left', padding: '16px 18px', background: C.bg, borderRadius: radius.md, border: `1px solid ${C.border}` }}>
              {resendState === 'sent' ? (
                <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.6 }}>
                  If that account still needs verifying, a new link is on its way. Check your inbox and spam folder.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>
                    {failed ? 'Get a new verification link' : 'Didn’t get the email?'}
                  </div>
                  <GGInput
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); if (resendState === 'error') setResendState('idle') }}
                  />
                  {resendState === 'error' && (
                    <div style={{ fontSize: 13, color: C.error, marginTop: 6 }}>
                      Enter a valid email address and try again.
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    <GGButton variant="secondary" size="md" fullWidth onClick={() => void resend()} disabled={resendState === 'sending'}>
                      {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
                    </GGButton>
                  </div>
                </>
              )}
            </div>
          )}

          {!verified && (
            <div style={{ marginTop: 18, fontSize: 13, color: C.textSub }}>
              Already verified?{' '}
              <button type="button" style={linkStyle} onClick={() => navigate(ROUTES.LOGIN)}>Sign in</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
