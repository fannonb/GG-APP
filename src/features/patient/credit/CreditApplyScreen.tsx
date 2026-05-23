import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGInput, GGSelect } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { MOCK_USER } from '@/mock/patient.mock'

const EMP_OPTIONS = [
  { value: 'employed',     label: 'Employed (Full-time)' },
  { value: 'self-employed', label: 'Self-Employed / Business Owner' },
  { value: 'part-time',    label: 'Employed (Part-time)' },
  { value: 'student',      label: 'Student' },
  { value: 'unemployed',   label: 'Unemployed' },
]

export function CreditApplyScreen() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ employment: '', income: '', amount: '', consent: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.employment) e.employment = 'Please select your employment status'
    if (!form.income || isNaN(Number(form.income)) || Number(form.income) <= 0) e.income = 'Enter a valid monthly income'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) < 100) e.amount = 'Minimum loan request is Z$100'
    if (Number(form.amount) > 10000) e.amount = 'Maximum loan request is Z$10,000'
    if (!form.consent) e.consent = 'You must consent to the credit check'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/app/credit/status') }, 1800)
  }

  const [refNum] = useState(() => 'GGA-' + String(Date.now()).slice(-6))
  const showSteps = form.amount && form.income && !isNaN(Number(form.amount)) && !isNaN(Number(form.income)) && Number(form.income) > 0

  return (
    <AppLayout title="Credit Application" subtitle="Fill in your details to apply" back notifCount={1}>
      <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="36px">
          <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '18px' }}>
            Application Reference: <span style={{ color: C.blue500 }}>{refNum}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '12px 16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '2px', fontWeight: 500 }}>Applicant</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{MOCK_USER.name}</div>
              <div style={{ fontSize: '12px', color: C.textSub }}>{MOCK_USER.nationalId} · {MOCK_USER.country}</div>
            </div>

            <div>
              <GGSelect label="Employment Status" value={form.employment} onChange={e => set('employment', e.target.value)} options={EMP_OPTIONS} required placeholder="Select employment status" />
              {errors.employment && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '4px', display: 'block' }}>{errors.employment}</span>}
            </div>

            <GGInput label="Monthly Income" placeholder="e.g. 1200" type="number" value={form.income} onChange={e => set('income', e.target.value)} required hint="Enter your net monthly income in Z$" error={errors.income} />

            <GGInput label="Loan Amount Requested" placeholder="e.g. 5000" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} required hint="Minimum Z$100 — Maximum Z$10,000" error={errors.amount} />

            {showSteps && (
              <div style={{ padding: '14px 16px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.2)` }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A5D8A', marginBottom: '8px' }}>What Happens Next</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { step: '1', text: 'Your application is forwarded to CapiMed Financial Services for assessment.' },
                    { step: '2', text: "CapiMed will contact you directly with your personalised credit agreement and terms." },
                    { step: '3', text: "Once agreed, your GG'APP credit wallet will be loaded and ready to use at any verified provider." },
                  ].map(it => (
                    <div key={it.step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#1A5D8A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', fontFamily: font.family }}>{it.step}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'rgba(26,93,138,0.75)', lineHeight: 1.6, fontFamily: font.family }}>{it.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '14px 16px', background: form.consent ? C.successBg : C.bg, borderRadius: radius.sm, border: `1.5px solid ${form.consent ? C.success : C.border}`, transition: 'all 0.2s' }}>
                <input type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)} style={{ accentColor: C.success, marginTop: '2px', width: 14, height: 14, flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: C.text, lineHeight: 1.6, fontFamily: font.family }}>
                  I consent to a credit bureau / credit check being performed on my application.
                </span>
              </label>
              {errors.consent && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '4px', display: 'block' }}>{errors.consent}</span>}
            </div>

            <div style={{ padding: '12px 16px', background: C.warningBg, borderRadius: radius.sm, border: `1px solid rgba(245,166,35,0.2)`, fontSize: '12px', color: '#8A4D00', lineHeight: 1.6 }}>
              <strong>Note:</strong> Your application will be forwarded simultaneously to the GG'APP admin team and our credit finance partner for processing.
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
              <GGButton variant="secondary" size="md" onClick={() => navigate('/app/credit/disclaimer')} style={{ flex: 1 }}>← Back</GGButton>
              <GGButton variant="primary" size="md" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
                {loading ? 'Submitting Application…' : 'Submit Application'}
              </GGButton>
            </div>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
