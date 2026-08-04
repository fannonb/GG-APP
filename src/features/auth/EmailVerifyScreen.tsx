import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGInput, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { isMockApi } from '@/api/config'
import { ApiError } from '@/api/types'
import { useVerifyEmailMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { AuthBrandPanel } from './components/AuthBrandPanel'

const VERIFY_TOKEN_STORAGE_KEY = 'gg_verify_token'

export function EmailVerifyScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [code, setCode] = useState('')
  const verifyMutation = useVerifyEmailMutation()
  const storedToken =
    typeof window === 'undefined'
      ? null
      : window.sessionStorage.getItem(VERIFY_TOKEN_STORAGE_KEY)

  const submitError =
    verifyMutation.error instanceof ApiError ? verifyMutation.error.message : null

  const handleVerify = () => {
    if (isMockApi) {
      navigate(ROUTES.ONBOARDING)
      return
    }

    if (!storedToken) return

    verifyMutation.mutate(storedToken, {
      onSuccess: () => {
        window.sessionStorage.removeItem(VERIFY_TOKEN_STORAGE_KEY)
        navigate(ROUTES.LOGIN)
      },
    })
  }

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
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.blue100, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="3" y="7" width="26" height="18" rx="3" stroke={C.blue500} strokeWidth="1.8"/>
              <path d="M3 10l13 9 13-9" stroke={C.blue500} strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>

          <div style={{ fontSize: '24px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '8px' }}>
            Check Your Email
          </div>
          <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '28px' }}>
            {isMockApi
              ? "We've sent a 6-digit verification code to your email address. Enter it below to activate your account."
              : storedToken
                ? 'Your local registration token is ready. Verify your account to continue to sign in.'
                : 'No local verification token was found. Please register again so the verification step can complete.'}
          </div>

          {isMockApi && (
            <div style={{ textAlign: 'left' }}>
              <GGInput
                label="Verification Code"
                placeholder="000000"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
          )}

          {submitError && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: C.error, fontWeight: 500, textAlign: 'left' }}>
              {submitError}
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <GGButton variant="secondary" size="md" onClick={() => navigate(ROUTES.REGISTER)} style={{ flex: 1 }}>Back</GGButton>
            <GGButton
              variant="primary"
              size="md"
              onClick={handleVerify}
              disabled={isMockApi ? code.length < 6 : !storedToken || verifyMutation.isPending}
              style={{ flex: 2 }}
            >
              {verifyMutation.isPending ? 'Verifying...' : 'Verify & Continue'}
            </GGButton>
          </div>

          {isMockApi && (
            <div style={{ marginTop: '16px', fontSize: '13px', color: C.textSub }}>
              Didn't receive it?{' '}
              <span style={{ color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>Resend code</span>
            </div>
          )}

          <div style={{ marginTop: '20px', padding: '12px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '12px', color: C.textSub, lineHeight: 1.6 }}>
            {isMockApi
              ? 'For testing: enter any 6-digit code to continue.'
              : storedToken
                ? 'Local development mode captured the backend verification token automatically for this registration.'
                : 'Local development mode needs a captured verification token from the registration response.'}
          </div>
        </div>
      </div>
    </div>
  )
}
