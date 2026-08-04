import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GGButton, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { ApiError } from '@/api/types'
import { isMockApi } from '@/api/config'
import { useResetPasswordMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { AuthBrandPanel } from './components/AuthBrandPanel'

export function ResetPasswordScreen() {
  const { isMobile } = useResponsive()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const role =
    searchParams.get('role') === 'admin'
      ? 'admin'
      : searchParams.get('role') === 'sp'
        ? 'sp'
        : 'patient'
  const loginPath = role === 'admin' ? ROUTES.ADMIN_LOGIN : ROUTES.LOGIN
  const panelTab = role === 'sp' ? 'sp' : 'patient'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const mutation = useResetPasswordMutation()
  const apiError = mutation.error instanceof ApiError ? mutation.error.message : null

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setValidationError(null)

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setValidationError('Passwords do not match.')
      return
    }
    if (!token && !isMockApi) {
      setValidationError('Invalid or missing reset token. Please request a new link.')
      return
    }

    mutation.mutate(
      { token: token || 'mock-token', password },
      {
        onSuccess: () => setSuccess(true),
      },
    )
  }

  if (!token && !isMockApi) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', fontFamily: font.family, background: C.bg }}>
        <AuthBrandPanel tab={panelTab} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#FEF2F2', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke={C.error} strokeWidth="1.8" />
                <path d="M16 10v7" stroke={C.error} strokeWidth="2" strokeLinecap="round" />
                <circle cx="16" cy="21" r="1" fill={C.error} />
              </svg>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '8px' }}>
              Invalid Reset Link
            </div>
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '24px' }}>
              This password reset link is invalid or has expired. Please request a new one.
            </div>
            <Link to={`${ROUTES.FORGOT_PASSWORD}?role=${role}`} style={{ textDecoration: 'none' }}>
              <GGButton variant="primary" size="md" fullWidth>
                Request New Link
              </GGButton>
            </Link>
          </div>
        </div>
      </div>
    )
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
              background: success ? C.successBg : C.blue100,
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {success ? (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M8 16l5 5 11-11" stroke="#22C98A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="9" y="13" width="14" height="12" rx="2" stroke={C.blue500} strokeWidth="1.8" />
                <path d="M12 13V10a4 4 0 018 0v3" stroke={C.blue500} strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="16" cy="19" r="1.5" fill={C.blue500} />
              </svg>
            )}
          </div>

          <div style={{ fontSize: '24px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '8px' }}>
            {success ? 'Password Reset Complete' : 'Set New Password'}
          </div>
          <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '28px' }}>
            {success
              ? 'Your password has been updated. You can now sign in with your new password.'
              : 'Choose a strong password for your account.'}
          </div>

          {!success && (
            <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <GGInput
                label="New Password"
                placeholder="Enter your new password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                rightEl={
                  <span onClick={() => setShowPw(current => !current)} style={{ fontSize: '12px', color: C.blue500, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                    {showPw ? 'Hide' : 'Show'}
                  </span>
                }
              />
              <GGInput
                label="Confirm Password"
                placeholder="Confirm your new password"
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={event => setConfirm(event.target.value)}
                required
                rightEl={
                  <span onClick={() => setShowConfirm(current => !current)} style={{ fontSize: '12px', color: C.blue500, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                    {showConfirm ? 'Hide' : 'Show'}
                  </span>
                }
              />

              {(validationError || apiError) && (
                <div style={{ fontSize: '13px', color: C.error, fontWeight: 500 }}>
                  {validationError ?? apiError}
                </div>
              )}

              <div style={{ padding: '10px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '12px', color: C.textSub, lineHeight: 1.6 }}>
                Password must be at least 8 characters long.
              </div>

              <GGButton variant="primary" size="md" fullWidth type="submit" disabled={!password || !confirm || mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Reset Password'}
              </GGButton>
            </form>
          )}

          {success && (
            <GGButton variant="primary" size="md" fullWidth onClick={() => navigate(loginPath)}>
              Sign In
            </GGButton>
          )}

          <div style={{ marginTop: '24px', fontSize: '13px', color: C.textSub }}>
            Remember your password?{' '}
            <Link to={loginPath} style={{ color: C.blue500, fontWeight: 700, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
