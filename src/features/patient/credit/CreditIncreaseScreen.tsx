import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGInput, GGSelect } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency } from '@/utils/format'
import { MOCK_USER } from '@/mock/patient.mock'
import { getCountryByCode } from '@/config/countries'
import { ROUTES } from '@/router/routes'
import { getFinancePartnerSummary } from './credit.constants'
import { FinancePartnerLockedCard } from './components/FinancePartnerLockedCard'

const REASON_OPTIONS = [
  { value: 'upcoming-care', label: 'Upcoming medical procedure or treatment' },
  { value: 'family', label: 'Additional cover for a beneficiary' },
  { value: 'higher-costs', label: 'Expected higher healthcare costs this year' },
  { value: 'emergency-buffer', label: 'Emergency buffer for unforeseen care' },
  { value: 'other', label: 'Other (explained below)' },
]

export function CreditIncreaseScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const u = MOCK_USER
  const country = getCountryByCode(u.countryCode)
  const currency = country?.currencySymbol ?? 'Z$'
  const partnerId = u.financePartnerId ?? 'moneymart'
  const partner = getFinancePartnerSummary(partnerId)

  const [form, setForm] = useState({
    increaseAmount: '',
    income: '',
    reason: '',
    notes: '',
    consent: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  const increaseNum = Number(form.increaseAmount)
  const newLimit = u.creditLimit + (Number.isFinite(increaseNum) ? increaseNum : 0)
  const refNum = u.creditAccountRef ?? 'GGA-847291'

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.increaseAmount || isNaN(increaseNum) || increaseNum < 500) {
      e.increaseAmount = `Minimum increase is ${formatCurrency(500, currency)}`
    } else if (increaseNum + u.creditLimit > 50000) {
      e.increaseAmount = 'Requested total limit cannot exceed Z$50,000'
    }
    if (!form.income || isNaN(Number(form.income)) || Number(form.income) <= 0) {
      e.income = 'Enter your current monthly income'
    }
    if (!form.reason) e.reason = 'Please select a reason'
    if (!form.consent) e.consent = 'You must confirm this request'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate(`${ROUTES.CREDIT_STATUS}?type=increase`)
    }, 1600)
  }

  return (
    <AppLayout title="Request Limit Increase" subtitle="Increase your approved healthcare credit" back notifCount={1}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>

        <FinancePartnerLockedCard
          partnerId={partnerId}
          subtitle="Limit increases are reviewed only by the partner who issued your current credit line."
        />

        {/* Current credit summary */}
        <div style={{
          background: '#fff',
          borderRadius: radius.lg,
          border: `1px solid ${C.border}`,
          padding: isMobile ? '20px 18px' : '24px 26px',
          boxShadow: shadow.sm,
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Your Current Credit</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
            gap: '12px',
          }}>
            {[
              { label: 'Approved Limit', value: formatCurrency(u.creditLimit, currency), color: C.navy800 },
              { label: 'Available', value: formatCurrency(u.creditAvailable, currency), color: C.blue500 },
              { label: 'In Use', value: formatCurrency(u.creditLimit - u.creditAvailable, currency), color: C.textSub },
              { label: 'Account Ref', value: refNum, color: C.text, small: true },
            ].map(row => (
              <div key={row.label} style={{ padding: '12px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px' }}>{row.label}</div>
                <div style={{ fontSize: row.small ? '13px' : '18px', fontWeight: 800, color: row.color, letterSpacing: row.small ? '0' : '-0.03em', fontFamily: row.small ? 'monospace' : font.family }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Increase request form */}
        <div style={{
          background: '#fff',
          borderRadius: radius.lg,
          border: `1px solid ${C.border}`,
          padding: isMobile ? '22px 18px' : '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: shadow.sm,
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>Increase Request Details</div>
            <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.55 }}>
              Tell {partner?.name ?? 'your finance partner'} how much additional credit you need. They will reassess based on your current limit and repayment history.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
            <GGInput
              label="Increase Amount"
              placeholder="e.g. 2500"
              type="number"
              value={form.increaseAmount}
              onChange={e => set('increaseAmount', e.target.value)}
              required
              hint={`Minimum ${formatCurrency(500, currency)} above current limit`}
              error={errors.increaseAmount}
            />
            <GGInput
              label="Current Monthly Income"
              placeholder="e.g. 1200"
              type="number"
              value={form.income}
              onChange={e => set('income', e.target.value)}
              required
              hint="Net monthly income for reassessment"
              error={errors.income}
            />
          </div>

          {form.increaseAmount && !errors.increaseAmount && increaseNum >= 500 && (
            <div style={{
              padding: '14px 16px',
              background: C.blue100,
              borderRadius: radius.sm,
              border: '1px solid rgba(56,182,255,0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              <span style={{ fontSize: '12px', color: C.textSub }}>New limit if approved</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: C.navy800, letterSpacing: '-0.03em' }}>
                {formatCurrency(newLimit, currency)}
              </span>
            </div>
          )}

          <div>
            <GGSelect
              label="Reason for Increase"
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              options={REASON_OPTIONS}
              required
              placeholder="Select a reason"
            />
            {errors.reason && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '4px', display: 'block' }}>{errors.reason}</span>}
          </div>

          <GGInput
            label="Additional Notes (optional)"
            placeholder="Briefly describe your upcoming healthcare needs…"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            hint="Helps your finance partner process the request faster"
          />

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: 'pointer',
            padding: '14px 16px',
            background: form.consent ? C.successBg : C.bg,
            borderRadius: radius.sm,
            border: `1.5px solid ${form.consent ? C.success : C.border}`,
            transition: 'all 0.2s',
          }}>
            <input
              type="checkbox"
              checked={form.consent}
              onChange={e => set('consent', e.target.checked)}
              style={{ accentColor: C.success, marginTop: '2px', width: 14, height: 14, flexShrink: 0 }}
            />
            <span style={{ fontSize: '13px', color: C.text, lineHeight: 1.6 }}>
              I confirm this increase request is accurate and authorise {partner?.name ?? 'my finance partner'} to review my account and perform a credit reassessment.
            </span>
          </label>
          {errors.consent && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '-12px', display: 'block' }}>{errors.consent}</span>}

          <div style={{ padding: '12px 16px', background: C.warningBg, borderRadius: radius.sm, border: '1px solid rgba(245,166,35,0.2)', fontSize: '12px', color: '#8A4D00', lineHeight: 1.6 }}>
            <strong>Note:</strong> Approval is not guaranteed. {partner?.name ?? 'Your finance partner'} typically responds within {partner?.processingTime ?? '24–48 hrs'}. Your current limit stays active while the request is reviewed.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <GGButton variant="secondary" size="md" onClick={() => navigate(ROUTES.CREDIT_WALLET)} style={{ flex: 1 }}>
            Cancel
          </GGButton>
          <GGButton variant="primary" size="md" onClick={handleSubmit} disabled={loading} style={{ flex: 2 }}>
            {loading ? 'Submitting Request…' : `Submit to ${partner?.shortName ?? 'Partner'} →`}
          </GGButton>
        </div>
      </div>
    </AppLayout>
  )
}
