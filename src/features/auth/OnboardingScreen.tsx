import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGInput, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { LOGO, ROUTES } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'

interface Step {
  id: string
  title: string
  subtitle: string
  body: string | null
  cta: string | null
  dark: boolean
  bg: string
  features?: { icon: string; title: string; desc: string }[]
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: "Welcome to GG'APP",
    subtitle: 'Healthcare Access, Simplified.',
    body: 'Access quality healthcare today and pay later through our approved credit facility. No upfront cost — ever.',
    cta: 'Get Started →',
    bg: `linear-gradient(160deg, ${C.navy900} 0%, ${C.navy800} 60%, ${C.navy700} 100%)`,
    dark: true,
  },
  {
    id: 'features',
    title: 'Everything You Need',
    subtitle: 'One platform for your complete healthcare journey.',
    body: null,
    cta: 'Continue →',
    bg: '#fff',
    dark: false,
    features: [
      { icon: '🏥', title: 'Verified Providers', desc: 'Browse hospitals, clinics, pharmacies, labs and specialists — all KYC-verified.' },
      { icon: '💳', title: 'Healthcare Credit', desc: 'Apply for a credit facility and get care today. Repay in monthly instalments.' },
      { icon: '👨‍👩‍👧', title: 'Beneficiaries', desc: 'Cover your family too — add dependants and pay for their care from your account.' },
      { icon: '🔒', title: 'Triple PIN Confirmation', desc: 'Every payment needs your PIN entered 3 times — your money stays safe from unauthorised charges.' },
    ],
  },
  {
    id: 'kyc',
    title: 'Verify Your Identity',
    subtitle: 'Required to activate your account and credit facility.',
    body: 'Your information is encrypted and used only for verification. We never share your data.',
    cta: null,
    bg: '#fff',
    dark: false,
  },
  {
    id: 'done',
    title: "You're All Set!",
    subtitle: 'Your account is active and ready to use.',
    body: "Start exploring verified healthcare providers near you, or complete your credit application to unlock the full GG'APP experience.",
    cta: 'Go to Dashboard →',
    bg: 'linear-gradient(160deg, #0D4A2B 0%, #0A6B3F 100%)',
    dark: true,
  },
]

export function OnboardingScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [step, setStep] = useState(0)
  const [kycForm, setKycForm] = useState({ nationalId: '' })

  const sd = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) { navigate(ROUTES.DASHBOARD); return }
    setStep(s => s + 1)
  }

  const tc = (opacity: string) => `rgba(255,255,255,${opacity})`

  return (
    <div style={{ minHeight: '100vh', background: sd.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', transition: 'background 0.4s ease', fontFamily: font.family }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '36px' }}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            onClick={() => i < step && setStep(i)}
            style={{
              width: i === step ? 24 : 8, height: 8,
              borderRadius: '4px',
              background: i === step
                ? (sd.dark ? '#fff' : C.blue500)
                : (sd.dark ? tc('0.25') : C.border),
              transition: 'all 0.3s',
              cursor: i < step ? 'pointer' : 'default',
            }}
          />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Logo on welcome screen */}
        {sd.id === 'welcome' && (
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ width: 90, height: 90, borderRadius: radius.xl, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <img src={LOGO} alt="GG'APP" width={70} height={70} style={{ borderRadius: '10px', objectFit: 'contain' }} />
            </div>
          </div>
        )}

        {/* Heading */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 800, color: sd.dark ? '#fff' : C.text, letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: '10px' }}>
            {sd.title}
          </div>
          <div style={{ fontSize: '15px', color: sd.dark ? tc('0.5') : C.textSub, lineHeight: 1.6, marginBottom: sd.body ? '8px' : 0 }}>
            {sd.subtitle}
          </div>
          {sd.body && (
            <div style={{ fontSize: '13px', color: sd.dark ? tc('0.4') : C.textSub, lineHeight: 1.7 }}>
              {sd.body}
            </div>
          )}
        </div>

        {/* Features grid */}
        {sd.id === 'features' && sd.features && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            {sd.features.map(f => (
              <div key={f.title} style={{ padding: '16px', background: C.bg, borderRadius: radius.lg, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{f.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '4px', fontFamily: font.family }}>{f.title}</div>
                <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.6, fontFamily: font.family }}>{f.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* KYC step */}
        {sd.id === 'kyc' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <GGInput label="National ID Number" placeholder="ZW-XXXXXXXX-X" value={kycForm.nationalId} onChange={e => setKycForm({ nationalId: e.target.value })} required hint="Kept strictly confidential and encrypted." />
            <div style={{ padding: '16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', fontFamily: font.family }}>Upload ID Document</div>
              <div style={{ padding: '16px', border: `2px dashed ${C.border}`, borderRadius: radius.sm, textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>Click to upload · JPEG, PNG, PDF</div>
              </div>
            </div>
            <GGButton variant="primary" size="md" fullWidth onClick={handleNext}>Submit & Continue →</GGButton>
            <button onClick={handleNext} style={{ background: 'none', border: 'none', fontSize: '13px', color: C.textSub, cursor: 'pointer', fontFamily: font.family }}>Skip for now</button>
          </div>
        )}

        {/* CTA button for simple steps */}
        {sd.cta && sd.id !== 'kyc' && (
          <GGButton
            variant={sd.id === 'done' ? 'success' : 'primary'}
            size="lg"
            fullWidth
            onClick={handleNext}
            style={sd.dark ? { background: sd.id === 'done' ? C.success : C.blue500 } : {}}
          >
            {sd.cta}
          </GGButton>
        )}

        {/* Skip for non-last steps with no CTA */}
        {!sd.cta && sd.id !== 'kyc' && (
          <GGButton variant="primary" size="md" fullWidth onClick={handleNext}>Continue →</GGButton>
        )}
      </div>
    </div>
  )
}
