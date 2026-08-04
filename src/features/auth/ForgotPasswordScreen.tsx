import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GGButton, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useForgotPasswordMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { ApiError } from '@/api/types'
import { AuthBrandPanel } from './components/AuthBrandPanel'

type RecoveryRole = 'patient' | 'sp' | 'admin'

function getRecoveryCopy(role: RecoveryRole) {
  switch (role) {
    case 'sp':
      return {
        title: 'Recover Provider Access',
        prompt: "Enter your provider account email and we'll send you a password reset link.",
      }
    case 'admin':
      return {
        title: 'Admin Password Recovery',
        prompt: "Enter your admin email and we'll prepare a password reset link for your account.",
      }
    default:
      return {
        title: 'Forgot Password?',
        prompt: "Enter your registered email address and we'll send you a link to reset your password.",
      }
  }
}

export function ForgotPasswordScreen() {
  const { isMobile } = useResponsive()
  const [searchParams] = useSearchParams()
  const requestedRole = searchParams.get('role')
  const role: RecoveryRole =
    requestedRole === 'sp' || requestedRole === 'admin' ? requestedRole : 'patient'
  const initialEmail = searchParams.get('email') ?? ''
  const [email, setEmail] = useState(initialEmail)
  const [submitted, setSubmitted] = useState(false)
  const mutation = useForgotPasswordMutation()
  const error = mutation.error instanceof ApiError ? mutation.error.message : null
  const loginPath = role === 'admin' ? ROUTES.ADMIN_LOGIN : ROUTES.LOGIN
  const panelTab = role === 'sp' ? 'sp' : 'patient'
  const copy = getRecoveryCopy(role)

  let resetUrl = mutation.data?.resetUrl ?? null

  if (resetUrl) {
    try {
      const nextUrl = new URL(resetUrl)
      nextUrl.searchParams.set('role', role)
      if (email) {
        nextUrl.searchParams.set('email', email)
      }
      resetUrl = nextUrl.toString()
    } catch {
      resetUrl = mutation.data?.resetUrl ?? null
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    mutation.mutate(email, {
      onSuccess: () => setSubmitted(true),
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        minHeight: '100vh',
        fontFamily: font.family,
        background: C.bg,
      }}
    >
      <AuthBrandPanel tab={panelTab} />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '32px 16px' : '40px',
          background: C.bg,
        }}
      >
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: C.blue100,
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {submitted ? (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M8 16l5 5 11-11"
                  stroke={C.blue500}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect
                  x="3"
                  y="7"
                  width="26"
                  height="18"
                  rx="3"
                  stroke={C.blue500}
                  strokeWidth="1.8"
                />
                <path
                  d="M3 10l13 9 13-9"
                  stroke={C.blue500}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="25" cy="25" r="6" fill={C.blue500} />
                <path d="M25 22v3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="25" cy="27.5" r="0.75" fill="#fff" />
              </svg>
            )}
          </div>

          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: C.text,
              letterSpacing: '-0.04em',
              marginBottom: '8px',
            }}
          >
            {submitted ? 'Check Your Email' : copy.title}
          </div>
          <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '28px' }}>
            {submitted
              ? resetUrl
                ? `A password reset link is ready for ${email}. Use the button below to continue the flow in local development.`
                : `We've sent a password reset link to ${email}. Check your inbox and follow the instructions.`
              : copy.prompt}
          </div>

          {!submitted && (
            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <GGInput
                label={role === 'admin' ? 'Admin Email' : 'Email Address'}
                placeholder={role === 'sp' ? 'practice@domain.com' : 'you@example.com'}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />

              {error && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: C.error, fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <div style={{ marginTop: '20px' }}>
                <GGButton
                  variant="primary"
                  size="md"
                  fullWidth
                  type="submit"
                  disabled={!email || mutation.isPending}
                >
                  {mutation.isPending ? 'Sending...' : 'Send Reset Link ->'}
                </GGButton>
              </div>
            </form>
          )}

          {submitted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {resetUrl && (
                <a href={resetUrl} style={{ textDecoration: 'none' }}>
                  <GGButton variant="primary" size="md" fullWidth>
                    Open Reset Page
                  </GGButton>
                </a>
              )}
              <GGButton
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => {
                  setSubmitted(false)
                  mutation.reset()
                }}
              >
                Resend Link
              </GGButton>
            </div>
          )}

          <div style={{ marginTop: '24px', fontSize: '13px', color: C.textSub }}>
            Remember your password?{' '}
            <Link to={loginPath} style={{ color: C.blue500, fontWeight: 700, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>

          {submitted && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                background: C.bg,
                borderRadius: radius.sm,
                border: `1px solid ${C.border}`,
                fontSize: '12px',
                color: C.textSub,
                lineHeight: 1.6,
              }}
            >
              {resetUrl
                ? 'Email delivery is bypassed in local development. The reset link is provided directly so you can complete the flow.'
                : "Didn't receive the email? Check your spam folder or try a different email address."}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
