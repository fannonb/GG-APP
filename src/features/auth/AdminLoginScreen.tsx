import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { GGInput } from '@/design-system'
import { font, radius } from '@/design-system/tokens'
import { ROUTES, LOGO } from '@/router/routes'
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema'
import { useLoginMutation } from '@/hooks/api'
import { ApiError } from '@/api/types'
import { ADMIN_PORTAL_TOKEN } from '@/api/config'

const ACCENT = '#F5A623'
const DARK = '#0A1628'

export function AdminLoginScreen() {
  const [showPw, setShowPw] = useState(false)
  const loginMutation = useLoginMutation()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const loading = loginMutation.isPending
  const formError =
    loginMutation.error instanceof ApiError ? loginMutation.error.message : null

  const onSubmit = handleSubmit(values => {
    loginMutation.mutate({ ...values, role: 'admin', portalToken: ADMIN_PORTAL_TOKEN })
  })

  const emailField = register('email')
  const passwordField = register('password')
  const emailValue = watch('email') ?? ''

  return (
    <div style={{
      minHeight: '100vh',
      background: DARK,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: font.family,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background rings */}
      {[300, 500, 700].map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: r, height: r,
          borderRadius: '50%',
          border: `1px solid rgba(245,166,35,${0.06 - i * 0.015})`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#ffffff',
        borderRadius: radius.xl,
        padding: '40px 36px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        position: 'relative',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <img src={LOGO} alt="GG'APP" width={72} height={72} style={{ objectFit: 'contain', borderRadius: '16px', marginBottom: '16px' }} />
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 14px', borderRadius: radius.full,
            background: '#FFF8E6', border: `1px solid ${ACCENT}33`,
            fontSize: '11px', fontWeight: 700, color: ACCENT,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            marginBottom: '12px',
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L7.5 4.5H11L8.25 6.75L9.25 10.5L6 8.25L2.75 10.5L3.75 6.75L1 4.5H4.5L6 1Z" fill={ACCENT}/>
            </svg>
            Admin Console
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: DARK, letterSpacing: '-0.03em', marginBottom: '6px' }}>
            Admin Sign In
          </div>
          <div style={{ fontSize: '13px', color: '#5E6E8C', textAlign: 'center', lineHeight: 1.5 }}>
            Restricted access — authorised personnel only
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            <GGInput
              label="Admin Email"
              placeholder="admin@ggapp.health"
              type="email"
              name={emailField.name}
              onChange={emailField.onChange}
              onBlur={emailField.onBlur}
              inputRef={emailField.ref}
              error={errors.email?.message}
              required
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: DARK, letterSpacing: '-0.01em', fontFamily: font.family }}>
                  Password <span style={{ color: '#E5474D' }}>*</span>
                </label>
                <Link
                  to={`${ROUTES.FORGOT_PASSWORD}?role=admin&email=${encodeURIComponent(emailValue)}`}
                  style={{ fontSize: '13px', color: ACCENT, fontWeight: 700, textDecoration: 'none', fontFamily: font.family }}
                >
                  Forgot password?
                </Link>
              </div>
              <GGInput
                placeholder="••••••••"
                type={showPw ? 'text' : 'password'}
                name={passwordField.name}
                onChange={passwordField.onChange}
                onBlur={passwordField.onBlur}
                inputRef={passwordField.ref}
                error={errors.password?.message}
                required
                rightEl={
                  <span onClick={() => setShowPw(s => !s)} style={{ fontSize: '12px', color: ACCENT, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                    {showPw ? 'Hide' : 'Show'}
                  </span>
                }
              />
            </div>
          </div>

          {formError && (
            <div style={{ marginBottom: '14px', padding: '10px 14px', background: 'rgba(229,71,77,0.08)', borderRadius: radius.sm, fontSize: '13px', color: '#C0292E', fontWeight: 500 }}>
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px 20px',
              background: loading ? '#C8861A' : ACCENT,
              border: 'none',
              borderRadius: radius.sm,
              fontSize: '14px',
              fontWeight: 700,
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: font.family,
              letterSpacing: '-0.01em',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Signing In…' : 'Sign In to Admin Portal →'}
          </button>
        </form>

        {/* Footer */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #EAE6E5', textAlign: 'center' }}>
          <Link to={ROUTES.LOGIN} style={{ fontSize: '13px', color: '#5E6E8C', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back to main login
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '24px', fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
        GG'APP Admin Console · Unauthorised access is prohibited
      </div>
    </div>
  )
}
