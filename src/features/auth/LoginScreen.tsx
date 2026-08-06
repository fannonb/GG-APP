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

export function LoginScreen() {
  const { isDesktop } = useResponsive()
  const compactBrand = !isDesktop
  const [tab, setTab] = useState<Tab>('patient')
  const [showPw, setShowPw] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const [btnPressed, setBtnPressed] = useState(false)
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

  const focusColor = tab === 'patient' ? C.blue500 : '#10B981'
  const focusShadow = tab === 'patient' ? 'rgba(74,173,223,0.12)' : 'rgba(16,185,129,0.12)'

  return (
    <div style={{
      display: 'flex',
      flexDirection: compactBrand ? 'column' : 'row',
      height: compactBrand ? 'auto' : '100vh',
      minHeight: '100vh',
      overflow: compactBrand ? 'visible' : 'hidden',
      fontFamily: font.family,
      background: C.bg,
    }}>
      <AuthBrandPanel tab={tab} />
      {compactBrand && <AuthCompactBrandHeader tab={tab} />}

      <div style={{
        flex: 1,
        overflowY: compactBrand ? 'visible' : 'auto',
        background: C.surface,
        position: 'relative',
      }}>
        {/* Dynamic decorative backdrop blobs (isolated clipping container) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}>
          <div style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: tab === 'patient'
              ? 'radial-gradient(circle, rgba(56, 182, 255, 0.07) 0%, rgba(56, 182, 255, 0) 70%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.07) 0%, rgba(16, 185, 129, 0) 70%)',
            filter: 'blur(40px)',
            transition: 'background 0.3s ease',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-10%',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: tab === 'patient'
              ? 'radial-gradient(circle, rgba(56, 182, 255, 0.05) 0%, rgba(56, 182, 255, 0) 70%)'
              : 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0) 70%)',
            filter: 'blur(30px)',
            transition: 'background 0.3s ease',
          }} />
        </div>

        <div style={{
          minHeight: compactBrand ? 'auto' : '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: compactBrand ? '16px 12px 24px' : '36px 40px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 440,
            height: compactBrand ? 'auto' : 'auto',
            padding: compactBrand ? '20px 16px' : '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}>
            <EntityTabBar tab={tab} setTab={switchTab} />

            <div style={{ marginBottom: '24px', marginTop: '4px' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '6px' }}>
                {tab === 'patient' ? 'Welcome back 👋' : 'Provider Portal 🏥'}
              </div>
              <div style={{ fontSize: '14px', color: C.textSub }}>
                {tab === 'patient' ? 'Sign in to your patient account' : 'Sign in to manage your practice'}
              </div>
            </div>

            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
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
                  focusColor={focusColor}
                  focusShadow={focusShadow}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, letterSpacing: '-0.01em', fontFamily: font.family }}>
                      Password <span style={{ color: C.error }}>*</span>
                    </label>
                    <Link
                      to={`${ROUTES.FORGOT_PASSWORD}?role=${tab}&email=${encodeURIComponent(emailValue)}`}
                      style={{ fontSize: '13px', color: focusColor, fontWeight: 700, textDecoration: 'none', fontFamily: font.family, transition: 'color 0.2s' }}
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
                    focusColor={focusColor}
                    focusShadow={focusShadow}
                    rightEl={
                      <span onClick={() => setShowPw(s => !s)} style={{ fontSize: '12px', color: focusColor, fontWeight: 600, cursor: 'pointer', userSelect: 'none', transition: 'color 0.2s' }}>
                        {showPw ? 'Hide' : 'Show'}
                      </span>
                    }
                  />
                </div>
              </div>

              {formError && (
                <div style={{ marginBottom: '12px', fontSize: '13px', color: C.error, fontWeight: 500 }}>
                  {formError}
                </div>
              )}

              {/* Custom dynamic sign-in button */}
              <button
                type="submit"
                disabled={loading}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => { setBtnHover(false); setBtnPressed(false) }}
                onMouseDown={() => setBtnPressed(true)}
                onMouseUp={() => setBtnPressed(false)}
                style={{
                  width: '100%',
                  height: '42px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontFamily: font.family,
                  fontWeight: 600,
                  borderRadius: radius.sm,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  letterSpacing: '-0.01em',
                  fontSize: '14px',
                  color: '#fff',
                  background: tab === 'patient'
                    ? btnHover ? 'linear-gradient(135deg, #5EC3FF 0%, #0081cc 100%)' : 'linear-gradient(135deg, #38B6FF 0%, #0091E6 100%)'
                    : btnHover ? 'linear-gradient(135deg, #34d399 0%, #047857 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: tab === 'patient'
                    ? btnHover ? '0 6px 20px rgba(56,182,255,0.4)' : '0 4px 12px rgba(56,182,255,0.25)'
                    : btnHover ? '0 6px 20px rgba(16,185,129,0.4)' : '0 4px 12px rgba(16,185,129,0.25)',
                  transform: btnPressed ? 'scale(0.98)' : btnHover ? 'scale(1.01)' : 'scale(1)',
                  transition: 'all 0.16s ease',
                }}
              >
                {loading ? 'Signing In…' : 'Sign In →'}
              </button>

              {tab === 'patient' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: C.border }} />
                    <span style={{ fontSize: '12px', color: C.textSub, fontWeight: 500 }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: C.border }} />
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{ width: '100%', padding: '11px 20px', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: C.text, fontFamily: font.family, transition: 'background 0.15s', opacity: loading ? 0.7 : 1 }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                    Continue with Google
                  </button>
                </>
              )}

              {tab === 'sp' && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: radius.sm, border: '1px solid rgba(16,185,129,0.2)', fontSize: '12px', color: '#097951', lineHeight: 1.6 }}>
                  Provider accounts require admin verification. Approved providers can log in immediately. New? Register below.
                </div>
              )}

              <div style={{ textAlign: 'center', fontSize: '13px', color: C.textSub, marginTop: 'auto', borderTop: `1px solid ${C.border}`, paddingTop: '16px' }}>
                No account?{' '}
                <Link to={`${ROUTES.REGISTER}?tab=${tab}`} style={{ color: focusColor, fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}>
                  Register as {tab === 'patient' ? 'a Patient' : 'a Provider'}
                </Link>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
