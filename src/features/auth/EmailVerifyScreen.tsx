import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGInput, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useAuthStore } from '@/store/auth.store'
import { AuthBrandPanel } from './components/AuthBrandPanel'

export function EmailVerifyScreen() {
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const { isMobile } = useResponsive()
  const [code, setCode] = useState('')

  const handleVerify = () => {
    login('patient')
    navigate('/onboarding')
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
          {/* Email icon */}
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
            We've sent a 6-digit verification code to your email address. Enter it below to activate your account.
          </div>

          <div style={{ textAlign: 'left' }}>
            <GGInput
              label="Verification Code"
              placeholder="000000"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <GGButton variant="secondary" size="md" onClick={() => navigate('/register')} style={{ flex: 1 }}>← Back</GGButton>
            <GGButton variant="primary" size="md" onClick={handleVerify} disabled={code.length < 6} style={{ flex: 2 }}>
              Verify & Continue →
            </GGButton>
          </div>

          <div style={{ marginTop: '16px', fontSize: '13px', color: C.textSub }}>
            Didn't receive it?{' '}
            <span style={{ color: C.blue500, fontWeight: 600, cursor: 'pointer' }}>Resend code</span>
          </div>

          {/* OTP hint box */}
          <div style={{ marginTop: '20px', padding: '12px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '12px', color: C.textSub, lineHeight: 1.6 }}>
            For testing: enter any 6-digit code to continue.
          </div>
        </div>
      </div>
    </div>
  )
}
