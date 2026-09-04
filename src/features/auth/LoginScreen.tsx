import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { consumeGooglePkceVerifier } from '@/lib/google-pkce'
import { AuthBrandPanel } from './components/AuthBrandPanel'
import { AuthCompactBrandHeader } from './components/AuthCompactBrandHeader'
import { EntityTabBar } from './components/EntityTabBar'
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema'
import { useLoginMutation, useGoogleLoginMutation, useGoogleCallbackMutation } from '@/hooks/api'
import { ApiError } from '@/api/types'

type Tab = 'patient' | 'sp'

const FOCUS = C.blue500
const FOCUS_SHADOW = 'rgba(56,182,255,0.14)'

export function LoginScreen() {
  const { isDesktop } = useResponsive()
  const compactBrand = !isDesktop
  const [tab, setTab] = useState<Tab>('patient')
  const [showPw, setShowPw] = useState(false)
  const loginMutation = useLoginMutation()
  const googleMutation = useGoogleLoginMutation()
  const googleCallbackMutation = useGoogleCallbackMutation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [oauthCancelled, setOauthCancelled] = useState(false)
  const handledCallback = useRef(false)

  useEffect(() => {
    if (handledCallback.current) return
    const code = searchParams.get('code')
    const oauthError = searchParams.get('error')
    if (!code && !oauthError) return

    handledCallback.current = true
    setSearchParams({}, { replace: true })
    if (code) {
      googleCallbackMutation.mutate({
        code,
        redirectUri: `${window.location.origin}${ROUTES.LOGIN}`,
        codeVerifier: consumeGooglePkceVerifier(searchParams.get('state')),
      })
    } else if (oauthError) {
      setOauthCancelled(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const loading = loginMutation.isPending || googleMutation.isPending || googleCallbackMutation.isPending
  const formError =
    loginMutation.error instanceof ApiError
      ? loginMutation.error.message
      : googleMutation.error instanceof ApiError
        ? googleMutation.error.message
        : googleCallbackMutation.error instanceof ApiError
          ? googleCallbackMutation.error.message
          : oauthCancelled
            ? 'Google sign-in was cancelled.'
            : null

  const onSubmit = handleSubmit(values => {
    loginMutation.mutate({
      ...values,
      role: tab === 'patient' ? 'patient' : 'sp',
    })
  })

  const handleGoogleLogin = () => {
    googleMutation.mutate()
  }

  const switchTab = (next: Tab) => {
    setTab(next)
    reset({ email: '', password: '' })
    loginMutation.reset()
    googleMutation.reset()
  }

  const emailField = register('email')
  const passwordField = register('password')
  const emailValue = watch('email') ?? ''

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: compactBrand ? 'column' : 'row',
        height: compactBrand ? 'auto' : '100vh',
        minHeight: '100vh',
        overflow: compactBrand ? 'visible' : 'hidden',
        fontFamily: font.family,
        background: C.bg,
      }}
    >
      <AuthBrandPanel tab={tab} />
      {compactBrand && <AuthCompactBrandHeader tab={tab} />}

      <div
        style={{
          flex: 1,
          overflowY: compactBrand ? 'visible' : 'auto',
          background: C.surface,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: compactBrand ? 'auto' : '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: compactBrand ? 'flex-start' : 'center',
            padding: compactBrand ? '12px 12px 16px' : '36px 40px 24px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              padding: compactBrand ? '12px 8px 8px' : '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            <EntityTabBar tab={tab} setTab={switchTab} />

            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: C.text,
                  letterSpacing: '-0.03em',
                  marginBottom: 6,
                }}
              >
                Welcome back
              </div>
              <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.45 }}>
                {tab === 'patient'
                  ? 'Sign in to your patient account.'
                  : 'Sign in to manage your practice.'}
              </div>
            </div>

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                <GGInput
                  label="Email Address"
                  placeholder={tab === 'patient' ? 'you@example.com' : 'practice@domain.com'}
                  type="email"
                  name={emailField.name}
                  onChange={emailField.onChange}
                  onBlur={emailField.onBlur}
                  inputRef={emailField.ref}
                  error={errors.email?.message}
                  required
                  focusColor={FOCUS}
                  focusShadow={FOCUS_SHADOW}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.text,
                        letterSpacing: '-0.01em',
                        fontFamily: font.family,
                      }}
                    >
                      Password <span style={{ color: C.error }}>*</span>
                    </label>
                    <Link
                      to={`${ROUTES.FORGOT_PASSWORD}?role=${tab}&email=${encodeURIComponent(emailValue)}`}
                      style={{
                        fontSize: 13,
                        color: FOCUS,
                        fontWeight: 700,
                        textDecoration: 'none',
                        fontFamily: font.family,
                      }}
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
                    focusColor={FOCUS}
                    focusShadow={FOCUS_SHADOW}
                    rightEl={
                      <span
                        onClick={() => setShowPw(s => !s)}
                        style={{
                          fontSize: 12,
                          color: FOCUS,
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        {showPw ? 'Hide' : 'Show'}
                      </span>
                    }
                  />
                </div>
              </div>

              {formError && (
                <div style={{ marginBottom: 12, fontSize: 13, color: C.error, fontWeight: 500 }}>
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: font.family,
                  fontWeight: 700,
                  borderRadius: radius.sm,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: '-0.01em',
                  fontSize: 14,
                  color: '#fff',
                  background: C.blue500,
                  boxShadow: 'none',
                  transition: 'opacity 0.15s ease',
                }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>

              {tab === 'patient' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>or</span>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '11px 20px',
                      background: '#fff',
                      border: `1.5px solid ${C.border}`,
                      borderRadius: radius.sm,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.text,
                      fontFamily: font.family,
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18">
                      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4" />
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}

              {tab === 'sp' && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 14px',
                    background: C.bg,
                    borderRadius: radius.sm,
                    border: `1px solid ${C.border}`,
                    fontSize: 12,
                    color: C.textSub,
                    lineHeight: 1.55,
                  }}
                >
                  Provider accounts require admin verification. Approved providers can sign in
                  immediately.
                </div>
              )}

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 13,
                  color: C.textSub,
                  marginTop: 20,
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 16,
                }}
              >
                No account?{' '}
                <Link
                  to={`${ROUTES.REGISTER}?tab=${tab}`}
                  style={{ color: FOCUS, fontWeight: 700, textDecoration: 'none' }}
                >
                  {tab === 'patient' ? 'Create a patient account' : 'Register as a provider'}
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px 16px',
            textAlign: 'center',
            fontSize: 11,
            color: C.textSub,
            opacity: 0.7,
          }}
        >
          <Link
            to={ROUTES.ADMIN_LOGIN}
            style={{ color: 'inherit', textDecoration: 'none', fontWeight: 500 }}
          >
            Admin Portal
          </Link>
        </div>
      </div>
    </div>
  )
}
