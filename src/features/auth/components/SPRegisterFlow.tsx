import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGInput, GGButton, GGSelect } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { PasswordStrength } from './PasswordStrength'

const STEPS = ['Practice Details', 'Services & Hours', 'Documents & Payment']
const SERVICE_TYPES = ['Hospital', 'Pharmacy', 'Laboratory', 'Clinic', 'General Practitioner', 'Specialist']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
type Day = typeof DAYS[number]

interface DayHours { open: boolean; from: string; to: string }
interface Form {
  practiceName: string; email: string; emailSecondary: string; phone: string
  password: string; country: string; serviceTypes: string[]; licenseNumber: string
  hours: Record<Day, DayHours>
  paymentMethod: 'mpesa' | 'bank'
  mpesaPaybill: string; bankName: string; bankAccount: string; bankBranch: string
}

const DEFAULT_HOURS: Record<Day, DayHours> = {
  Mon: { open: true,  from: '08:00', to: '17:00' },
  Tue: { open: true,  from: '08:00', to: '17:00' },
  Wed: { open: true,  from: '08:00', to: '17:00' },
  Thu: { open: true,  from: '08:00', to: '17:00' },
  Fri: { open: true,  from: '08:00', to: '17:00' },
  Sat: { open: true,  from: '08:00', to: '13:00' },
  Sun: { open: false, from: '',      to: ''       },
}

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < step ? C.success : i === step ? C.success : C.border, color: '#fff', fontSize: '12px', fontWeight: 700, fontFamily: font.family, transition: 'all 0.3s' }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '10px', fontWeight: i === step ? 700 : 400, color: i === step ? C.success : C.textSub, whiteSpace: 'nowrap', fontFamily: font.family }}>{s}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < step ? C.success : C.border, margin: '-14px 6px 0', transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export function SPRegisterFlow() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Form>({
    practiceName: '', email: '', emailSecondary: '', phone: '', password: '', country: '',
    serviceTypes: [], licenseNumber: '', hours: DEFAULT_HOURS,
    paymentMethod: 'mpesa', mpesaPaybill: '', bankName: '', bankAccount: '', bankBranch: '',
  })

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))
  const toggleService = (s: string) =>
    set('serviceTypes', form.serviceTypes.includes(s) ? form.serviceTypes.filter(x => x !== s) : [...form.serviceTypes, s])
  const toggleDay = (day: Day) =>
    set('hours', { ...form.hours, [day]: { ...form.hours[day], open: !form.hours[day].open } })
  const setHour = (day: Day, field: 'from' | 'to', val: string) =>
    set('hours', { ...form.hours, [day]: { ...form.hours[day], [field]: val } })

  const countryOptions = ['Zimbabwe', 'South Africa', 'Zambia', 'Botswana', 'Kenya', 'Tanzania', 'Uganda'].map(c => ({ value: c, label: c }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <StepDots step={step} />

      {/* Step 1: Practice Details */}
      {step === 0 && (
        <>
          <GGInput label="Practice / Organisation Name" placeholder="City Medical Centre" value={form.practiceName} onChange={e => set('practiceName', e.target.value)} required />
          <GGInput label="Primary Email" type="email" placeholder="admin@practice.com" value={form.email} onChange={e => set('email', e.target.value)} required hint="Main login and notification email" />
          <GGInput label="Secondary Email" type="email" placeholder="billing@practice.com (optional)" value={form.emailSecondary} onChange={e => set('emailSecondary', e.target.value)} />
          <GGInput label="Service Phone Number" type="tel" placeholder="+263 4 123 4567" value={form.phone} onChange={e => set('phone', e.target.value)} required />
          <GGInput label="Password" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => set('password', e.target.value)} required />
          <PasswordStrength password={form.password} />
          <GGSelect label="Country of Operation" value={form.country} onChange={e => set('country', e.target.value)} options={countryOptions} placeholder="Select country" required />
          <GGButton variant="success" size="md" fullWidth onClick={() => setStep(1)}>Continue →</GGButton>
        </>
      )}

      {/* Step 2: Services & Hours */}
      {step === 1 && (
        <>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px', fontFamily: font.family }}>Service Type(s) <span style={{ color: C.error }}>*</span></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SERVICE_TYPES.map(s => {
                const active = form.serviceTypes.includes(s)
                return (
                  <button key={s} onClick={() => toggleService(s)} style={{ padding: '8px 16px', borderRadius: '9999px', border: `1.5px solid ${active ? C.success : C.border}`, background: active ? C.successBg : C.bg, color: active ? '#0D6B47' : C.textSub, fontSize: '13px', fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.14s' }}>
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
          <GGInput label="Medical License Number" placeholder="e.g. MCZ-2019-04821" value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} required hint="Will be verified against the national regulatory body" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px', fontFamily: font.family }}>Opening Times</div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
              {DAYS.map((day, i) => {
                const val = form.hours[day]
                return (
                  <div key={day} style={{ display: 'flex', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? '6px' : '0', padding: '10px 14px', borderBottom: i < DAYS.length - 1 ? `1px solid ${C.border}` : 'none', background: val.open ? '#fff' : C.bg }}>
                    <span style={{ width: isMobile ? '100%' : '52px', fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family, flexShrink: 0 }}>{day}</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', flex: 1 }}>
                      <input type="checkbox" checked={val.open} onChange={() => toggleDay(day)} style={{ accentColor: C.success, width: 14, height: 14 }} />
                      <span style={{ fontSize: '12px', color: val.open ? C.success : C.textSub, fontWeight: 600, fontFamily: font.family }}>{val.open ? 'Open' : 'Closed'}</span>
                    </label>
                    {val.open && (
                      <>
                        <input type="time" value={val.from} onChange={e => setHour(day, 'from', e.target.value)} style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, fontSize: '12px', fontFamily: font.family, background: '#fff', color: C.text, flex: 1, minWidth: 0 }} />
                        <input type="time" value={val.to} onChange={e => setHour(day, 'to', e.target.value)} style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, fontSize: '12px', fontFamily: font.family, background: '#fff', color: C.text, flex: 1, minWidth: 0 }} />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GGButton variant="secondary" size="md" onClick={() => setStep(0)} style={{ flex: 1 }}>← Back</GGButton>
            <GGButton variant="success" size="md" onClick={() => setStep(2)} style={{ flex: 2 }}>Continue →</GGButton>
          </div>
        </>
      )}

      {/* Step 3: Documents & Payment */}
      {step === 2 && (
        <>
          {/* Logo upload */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', fontFamily: font.family }}>Practice Logo</div>
            <div style={{ padding: '20px', border: `2px dashed ${C.border}`, borderRadius: radius.sm, textAlign: 'center', background: C.bg, cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 6px', display: 'block' }}><rect x="3" y="5" width="18" height="14" rx="2" stroke={C.textSub} strokeWidth="1.4"/><circle cx="9" cy="10" r="2" stroke={C.textSub} strokeWidth="1.3"/><path d="M3 16l4-4 4 4 3-3 4 4" stroke={C.textSub} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>Drop logo or <span style={{ color: C.success, fontWeight: 600 }}>click to upload</span></div>
              <div style={{ fontSize: '11px', color: C.textLight, marginTop: '3px', fontFamily: font.family }}>JPEG or PNG · Max 2 MB</div>
            </div>
          </div>

          {/* License docs */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', fontFamily: font.family }}>Medical License Documents <span style={{ color: C.error }}>*</span></div>
            <div style={{ padding: '20px', border: `2px dashed ${C.border}`, borderRadius: radius.sm, textAlign: 'center', background: C.bg, cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 6px', display: 'block' }}><rect x="5" y="2" width="14" height="20" rx="2" stroke={C.textSub} strokeWidth="1.4"/><path d="M8 7h8M8 11h8M8 15h5" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/></svg>
              <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>Drop files or <span style={{ color: C.success, fontWeight: 600 }}>click to upload</span></div>
              <div style={{ fontSize: '11px', color: C.textLight, marginTop: '3px', fontFamily: font.family }}>PDF or image format</div>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px', fontFamily: font.family }}>Payment Method <span style={{ color: C.error }}>*</span></div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {([['mpesa', 'M-Pesa Paybill'], ['bank', 'Bank Account']] as const).map(([val, lbl]) => (
                <button key={val} onClick={() => set('paymentMethod', val)} style={{ flex: 1, padding: '10px', borderRadius: radius.sm, border: `1.5px solid ${form.paymentMethod === val ? C.success : C.border}`, background: form.paymentMethod === val ? C.successBg : C.bg, color: form.paymentMethod === val ? '#0D6B47' : C.textSub, fontSize: '13px', fontWeight: form.paymentMethod === val ? 700 : 500, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.14s' }}>{lbl}</button>
              ))}
            </div>
            {form.paymentMethod === 'mpesa' ? (
              <GGInput label="M-Pesa Paybill Number" placeholder="e.g. 123456" value={form.mpesaPaybill} onChange={e => set('mpesaPaybill', e.target.value)} required />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <GGInput label="Bank Name" placeholder="e.g. Stanbic Bank Zimbabwe" value={form.bankName} onChange={e => set('bankName', e.target.value)} required />
                <GGInput label="Account Number" placeholder="e.g. 9180012345678" value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} required />
                <GGInput label="Branch Code / SWIFT (optional)" placeholder="e.g. SBICZWHX" value={form.bankBranch} onChange={e => set('bankBranch', e.target.value)} />
              </div>
            )}
          </div>

          <div style={{ padding: '12px 14px', background: C.successBg, borderRadius: radius.sm, border: `1px solid rgba(34,201,138,0.2)`, fontSize: '12px', color: '#0D6B47', lineHeight: 1.6, fontFamily: font.family }}>
            By registering, you confirm all submitted information is accurate and that your practice holds a valid medical licence.
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <GGButton variant="secondary" size="md" onClick={() => setStep(1)} style={{ flex: 1 }}>← Back</GGButton>
            <GGButton variant="success" size="md" onClick={() => navigate('/sp/pending')} style={{ flex: 2 }}>Submit Application →</GGButton>
          </div>
        </>
      )}
    </div>
  )
}
