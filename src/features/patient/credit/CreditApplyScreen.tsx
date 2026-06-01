import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGInput, GGSelect } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { MOCK_USER } from '@/mock/patient.mock'
import { FinancePartnerSelector, type FinancePartnerOption } from './components/FinancePartnerSelector'

const FINANCE_PARTNERS: FinancePartnerOption[] = [
  {
    id: 'moneymart',
    name: 'Moneymart Finance',
    tagline: 'Fast, flexible credit solutions built around your healthcare needs.',
    processingTime: '24–48 hrs',
    color: '#2e3191',
    selectedBg: 'rgba(46,49,145,0.04)',
    border: 'rgba(46,49,145,0.18)',
    activeBorder: '#2e3191',
    activeShadow: '0 0 0 3px rgba(46,49,145,0.12)',
  },
  {
    id: 'equity',
    name: 'Equity Bank',
    tagline: 'Trusted healthcare financing backed by Africa\'s leading financial institution.',
    processingTime: '24 hrs',
    color: '#A93226',
    selectedBg: 'rgba(169,50,38,0.04)',
    border: 'rgba(169,50,38,0.18)',
    activeBorder: '#A93226',
    activeShadow: '0 0 0 3px rgba(169,50,38,0.12)',
  },
]
const EMP_OPTIONS = [
  { value: 'employed',      label: 'Employed (Full-time)' },
  { value: 'self-employed', label: 'Self-Employed / Business Owner' },
  { value: 'part-time',     label: 'Employed (Part-time)' },
  { value: 'student',       label: 'Student' },
  { value: 'unemployed',    label: 'Unemployed' },
]

// ─── Component ────────────────────────────────────────────────────────────────
export function CreditApplyScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [form, setForm] = useState({ employment: '', income: '', amount: '', consent: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))
  const [refNum] = useState(() => 'GGA-' + String(Date.now()).slice(-6))

  const selectedPartner = FINANCE_PARTNERS.find(p => p.id === selectedPartnerId) ?? null

  const validate = () => {
    const e: Record<string, string> = {}
    if (!selectedPartnerId) e.partner = 'Please select a finance partner'
    if (!form.employment) e.employment = 'Please select your employment status'
    if (!form.income || isNaN(Number(form.income)) || Number(form.income) <= 0) e.income = 'Enter a valid monthly income'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) < 100) e.amount = 'Minimum loan request is Z$100'
    if (!form.consent) e.consent = 'You must consent to the credit check'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/app/credit/status') }, 1800)
  }

  const showNextSteps = form.amount && form.income
    && !isNaN(Number(form.amount)) && !isNaN(Number(form.income))
    && Number(form.income) > 0 && selectedPartner

  return (
    <AppLayout title="Balance Application" subtitle="Apply for your healthcare balance" back notifCount={1}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>

        {/* ── Step 1: Choose Finance Partner ────────────────────────────── */}
        <FinancePartnerSelector
          partners={FINANCE_PARTNERS}
          selectedId={selectedPartnerId}
          onSelect={setSelectedPartnerId}
          error={errors.partner}
          stepComplete={!!selectedPartner}
        />

        {/* ── Step 2: Application Form ───────────────────────────────────── */}
        <div style={{ borderTop: `2px dashed ${C.border}`, paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: selectedPartner ? C.blue500 : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff' }}>2</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: selectedPartner ? C.text : C.textLight, letterSpacing: '-0.02em', transition: 'color 0.2s' }}>
                Your Application Details
              </div>
              {!selectedPartner
                ? <div style={{ fontSize: '12px', color: C.textLight, marginTop: '1px' }}>Select a finance partner above to continue</div>
                : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', color: C.textSub }}>Applying with</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: selectedPartner.color }}>{selectedPartner.name}</span>
                  </div>
                )}
            </div>
          </div>

          <div style={{ opacity: selectedPartner ? 1 : 0.4, pointerEvents: selectedPartner ? 'auto' : 'none', transition: 'opacity 0.25s ease' }}>
            <div style={{ background: '#fff', borderRadius: radius.lg, border: `1px solid ${C.border}`, padding: isMobile ? '22px 18px' : '32px', display: 'flex', flexDirection: 'column', gap: '22px', boxShadow: shadow.sm }}>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160, padding: '14px 18px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Application Ref</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.blue500 }}>{refNum}</div>
                </div>
                <div style={{ flex: 2, minWidth: 200, padding: '14px 18px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Applicant</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{MOCK_USER.name}</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{MOCK_USER.nationalId} · {MOCK_USER.country}</div>
                </div>
              </div>

              <div>
                <GGSelect label="Employment Status" value={form.employment} onChange={e => set('employment', e.target.value)} options={EMP_OPTIONS} required placeholder="Select employment status" />
                {errors.employment && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '4px', display: 'block' }}>{errors.employment}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <GGInput label="Monthly Income" placeholder="e.g. 1200" type="number" value={form.income} onChange={e => set('income', e.target.value)} required hint="Net monthly income in Z$" error={errors.income} />
                <GGInput label="Loan Amount Requested" placeholder="e.g. 5000" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} required hint="Minimum Z$100" error={errors.amount} />
              </div>

              {showNextSteps && (
                <div style={{ padding: '18px 20px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(56,182,255,0.2)` }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: C.navy800, marginBottom: '12px' }}>What Happens Next</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      `Your application is forwarded to ${selectedPartner!.name} for credit assessment.`,
                      `${selectedPartner!.name} will contact you with your personalised agreement and terms.`,
                      `Once agreed, your GG'APP balance will be loaded and ready to use at any verified provider.`,
                    ].map((text, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.navy800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff' }}>{idx + 1}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6 }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '14px 16px', background: form.consent ? C.successBg : C.bg, borderRadius: radius.sm, border: `1.5px solid ${form.consent ? C.success : C.border}`, transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)} style={{ accentColor: C.success, marginTop: '2px', width: 14, height: 14, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: C.text, lineHeight: 1.6 }}>
                    I consent to a credit bureau check being performed on my application{selectedPartner ? ` by ${selectedPartner.name}` : ''}.
                  </span>
                </label>
                {errors.consent && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '4px', display: 'block' }}>{errors.consent}</span>}
              </div>

              <div style={{ padding: '12px 16px', background: C.warningBg, borderRadius: radius.sm, border: `1px solid rgba(245,166,35,0.2)`, fontSize: '12px', color: '#8A4D00', lineHeight: 1.6 }}>
                <strong>Note:</strong> Your application will be forwarded simultaneously to the GG'APP admin team and your chosen finance partner for processing.
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <GGButton variant="secondary" size="md" onClick={() => navigate('/app/credit/disclaimer')} style={{ flex: 1 }}>← Back</GGButton>
          <GGButton variant="primary" size="md" onClick={handleSubmit} disabled={loading || !selectedPartner} style={{ flex: 2 }}>
            {loading ? 'Submitting Application…' : selectedPartner ? `Submit with ${selectedPartner.name} →` : 'Submit Application'}
          </GGButton>
        </div>

      </div>
    </AppLayout>
  )
}
