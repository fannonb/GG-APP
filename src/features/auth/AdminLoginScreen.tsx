import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { ROUTES } from '@/router/routes'
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema'
import { useLoginMutation } from '@/hooks/api'
import { ApiError } from '@/api/types'

const LINK_BLUE = '#0B7BC0'

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
  const formError = loginMutation.error instanceof ApiError ? loginMutation.error.message : null

  const onSubmit = handleSubmit(values => {
    loginMutation.mutate({ ...values, role: 'admin' })
  })

  const emailField = register('email')
  const passwordField = register('password')
  const emailValue = watch('email') ?? ''

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', background: '#fff', fontFamily: font.family, boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <img src="/gg-wordmark-light.png" alt="GG'APP" style={{ height: 28, width: 'auto', display: 'block', marginBottom: 32 }} />

        <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: C.navy800 }}>Admin sign in</h1>

        <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GGInput
            label="Email"
            type="email"
            name={emailField.name}
            onChange={emailField.onChange}
            onBlur={emailField.onBlur}
            inputRef={emailField.ref}
            autoComplete="email"
            error={errors.email?.message}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="admin-password" style={{ fontSize: 13, fontWeight: 600, color: C.navy800 }}>Password</label>
              <Link to={`${ROUTES.FORGOT_PASSWORD}?role=admin&email=${encodeURIComponent(emailValue)}`} style={{ fontSize: 13, color: LINK_BLUE, textDecoration: 'none' }}>
                Forgot?
              </Link>
            </div>
            <GGInput
              id="admin-password"
              type={showPw ? 'text' : 'password'}
              name={passwordField.name}
              onChange={passwordField.onChange}
              onBlur={passwordField.onBlur}
              inputRef={passwordField.ref}
              autoComplete="current-password"
              error={errors.password?.message}
              rightEl={
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  aria-label="Show password"
                  aria-pressed={showPw}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: LINK_BLUE, cursor: 'pointer', fontFamily: font.family }}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              }
            />
          </div>

          {formError && <div role="alert" style={{ fontSize: 13, color: '#C0292E' }}>{formError}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ height: 44, marginTop: 4, borderRadius: radius.sm, border: 'none', background: C.navy800, color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: font.family, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Link to={ROUTES.LOGIN} style={{ display: 'inline-block', marginTop: 24, fontSize: 13, color: C.textSub, textDecoration: 'none' }}>
          ← Back to main sign in
        </Link>
      </div>
    </main>
  )
}
