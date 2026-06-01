import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGInput, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { PasswordStrength } from './PasswordStrength'
import { CountryPhoneInput } from './CountryPhoneInput'
import type { CountryCode } from './CountryPhoneInput'

interface Form {
  firstName: string; lastName: string; email: string
  country: CountryCode | ''; phone: string
  dob: string; nationalId: string; password: string
}

const STEPS = ['Personal Info', 'Identity', 'Security']

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '24px' }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < step ? C.success : i === step ? C.blue500 : C.border, color: '#fff', fontSize: '12px', fontWeight: 700, fontFamily: font.family, transition: 'all 0.3s' }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '10px', fontWeight: i === step ? 700 : 400, color: i === step ? C.blue500 : C.textSub, whiteSpace: 'nowrap', fontFamily: font.family }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < step ? C.success : C.border, margin: '-14px 6px 0', transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export function PatientRegisterFlow() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Form>({
    firstName: '', lastName: '', email: '',
    country: '', phone: '',
    dob: '', nationalId: '', password: '',
  })
  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <StepDots step={step} />

      {step === 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            <GGInput label="First Name" placeholder="Sarah" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
            <GGInput label="Last Name" placeholder="Johnson" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
          </div>
          <GGInput label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
          <CountryPhoneInput
            required
            countryCode={form.country}
            onCountryChange={code => setForm(f => ({ ...f, country: code, phone: '' }))}
            digits={form.phone}
            onDigitsChange={d => set('phone', d)}
          />
          <GGButton variant="primary" size="md" fullWidth onClick={() => setStep(1)}>Continue →</GGButton>
        </>
      )}

      {step === 1 && (
        <>
          <GGInput label="Date of Birth" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} required />
          <GGInput label="National ID Number" placeholder="ZW-XXXXXXXX-X" value={form.nationalId} onChange={e => set('nationalId', e.target.value)} required hint="Used for KYC verification. Kept strictly confidential." />
          <div style={{ display: 'flex', gap: '10px' }}>
            <GGButton variant="secondary" size="md" onClick={() => setStep(0)} style={{ flex: 1 }}>← Back</GGButton>
            <GGButton variant="primary" size="md" onClick={() => setStep(2)} style={{ flex: 2 }}>Continue →</GGButton>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <GGInput label="Password" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => set('password', e.target.value)} required />
          <PasswordStrength password={form.password} />
          <div style={{ padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6, fontFamily: font.family }}>
            By registering, you agree to our <strong>Terms of Service</strong> and <strong>Privacy Policy</strong>.
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GGButton variant="secondary" size="md" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</GGButton>
            <GGButton variant="primary" size="md" onClick={() => navigate('/verify')} style={{ flex: 2 }}>Create Account</GGButton>
          </div>
        </>
      )}
    </div>
  )
}
