import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGInput, GGSelect, GGCard } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { formatCurrency } from '@/utils/format'
import { getCountryByCode } from '@/config/countries'
import { ROUTES } from '@/router/routes'
import { getFinancePartnerSummary } from './credit.constants'
import { FinancePartnerLockedCard } from './components/FinancePartnerLockedCard'
import { useUserStore } from '@/store/user.store'
import { useCreditStatus, useIncreaseCreditMutation } from '@/hooks/api'

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
  const u = useUserStore(s => s.user)
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
  const increaseMutation = useIncreaseCreditMutation()
  const { data: creditStatusData } = useCreditStatus()
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  const increaseNum = Number(form.increaseAmount)
  const newLimit = u.creditLimit + (Number.isFinite(increaseNum) ? increaseNum : 0)
  const refNum = u.creditAccountRef ?? 'GGA-847291'
  const pendingReview = u.creditStatus === 'pending'
  const pendingIncrease = pendingReview && creditStatusData?.application?.type === 'increase'
  const showNextSteps = form.increaseAmount && form.income && form.reason && !errors.increaseAmount
    && !isNaN(increaseNum) && increaseNum >= 500 && !isNaN(Number(form.income)) && Number(form.income) > 0

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.increaseAmount || isNaN(increaseNum) || increaseNum < 500) {
      e.increaseAmount = `Minimum increase is ${formatCurrency(500, currency)}`
    } else if (increaseNum + u.creditLimit > 50000) {
      e.increaseAmount = `Requested total limit cannot exceed ${formatCurrency(50000, currency)}`
    }
    if (!form.income || isNaN(Number(form.income)) || Number(form.income) <= 0) {
      e.income = 'Enter your current monthly income'
    }
    if (!form.reason) e.reason = 'Please select a reason'
    if (!form.consent) e.consent = 'You must confirm this request and acknowledge the admin fee'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      await increaseMutation.mutateAsync({
        increaseAmount: increaseNum,
        monthlyIncome: Number(form.income),
        reason: form.reason,
        notes: form.notes.trim() || undefined,
        consent: form.consent,
      })
      navigate(`${ROUTES.CREDIT_STATUS}?type=increase`)
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Unable to submit your increase request right now.',
      })
    }
  }

  return (
    <AppLayout title="Request Limit Increase" subtitle="Increase your approved healthcare credit" back notifCount={1}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>

        <FinancePartnerLockedCard
          partnerId={partnerId}
          subtitle="Limit increases follow the same review process as your original application — your finance partner reassesses and approves the request."
        />

        {pendingReview && (
          <GGCard padding="22px" style={{ background: C.blue100, border: '1.5px solid rgba(56,182,255,0.28)' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.navy800, marginBottom: '6px' }}>
              {pendingIncrease ? 'Increase request under review' : 'Credit request under review'}
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.55, marginBottom: '14px' }}>
              You already have a pending request with the {partner?.name ?? 'finance partner'} team. You can submit a new increase once a decision is made.
            </div>
            <GGButton
              variant="primary"
              size="sm"
              onClick={() => navigate(`${ROUTES.CREDIT_STATUS}${pendingIncrease ? '?type=increase' : ''}`)}
            >
              View Status
            </GGButton>
          </GGCard>
        )}

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
          opacity: pendingReview ? 0.5 : 1,
          pointerEvents: pendingReview ? 'none' : 'auto',
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

          <div style={{ padding: '16px 18px', background: C.bg, borderRadius: radius.sm, border: `1.5px solid ${C.border}` }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: C.navy800, marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Platform Admin Fee
            </div>
            <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.65 }}>
              By submitting this increase request, you acknowledge that a <strong style={{ color: C.text }}>2.5% platform administration fee</strong> will be deducted from any newly approved increase amount and remitted to GG&apos;APP. The remaining balance will be added to your wallet for use with verified healthcare providers. This fee is included in the total amount you repay to the finance partner.
            </div>
            {form.increaseAmount && !isNaN(increaseNum) && increaseNum > 0 && (
              <div style={{ marginTop: '12px', padding: '10px 12px', background: '#fff', borderRadius: radius.xs, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSub }}>
                  <span>Increase amount</span>
                  <span style={{ fontWeight: 700, color: C.text }}>{formatCurrency(increaseNum, currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSub }}>
                  <span>Est. admin fee (2.5%)</span>
                  <span style={{ fontWeight: 700, color: C.text }}>{formatCurrency(increaseNum * 0.025, currency)}</span>
                </div>
                <div style={{ height: 1, background: C.border, margin: '2px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 700, color: C.text }}>Est. added to wallet</span>
                  <span style={{ fontWeight: 800, color: C.navy800 }}>{formatCurrency(increaseNum * 0.975, currency)}</span>
                </div>
              </div>
            )}
          </div>

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
              I confirm this increase request is accurate, authorise {partner?.name ?? 'my finance partner'} to review my account, and acknowledge the 2.5% GG&apos;APP platform admin fee on any newly approved increase.
            </span>
          </label>
          {errors.consent && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '-12px', display: 'block' }}>{errors.consent}</span>}

          {showNextSteps && (
            <div style={{ padding: '18px 20px', background: C.blue100, borderRadius: radius.sm, border: '1px solid rgba(56,182,255,0.2)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.navy800, marginBottom: '12px' }}>What Happens Next</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  `Your increase request is sent to the ${partner?.name ?? 'finance partner'} team for review.`,
                  'You will receive a notification when a decision is made.',
                  'Once approved, your limit and available balance are updated and ready to use at verified providers.',
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

          <div style={{ padding: '12px 16px', background: C.warningBg, borderRadius: radius.sm, border: '1px solid rgba(245,166,35,0.2)', fontSize: '12px', color: '#8A4D00', lineHeight: 1.6 }}>
            <strong>Note:</strong> For now, GG&apos;APP admin reviews and approves increase requests. Direct finance partner approval will be enabled once partner APIs are connected. Your current limit stays active while the request is reviewed.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <GGButton variant="secondary" size="md" onClick={() => navigate(ROUTES.CREDIT_WALLET)} style={{ flex: 1 }}>
            Cancel
          </GGButton>
          <GGButton variant="primary" size="md" onClick={handleSubmit} disabled={increaseMutation.isPending || pendingReview} style={{ flex: 2 }}>
            {increaseMutation.isPending ? 'Submitting Request…' : `Submit to ${partner?.shortName ?? 'Partner'} →`}
          </GGButton>
          {errors.submit && (
            <div style={{ fontSize: '12px', color: C.error, fontWeight: 600 }}>{errors.submit}</div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
