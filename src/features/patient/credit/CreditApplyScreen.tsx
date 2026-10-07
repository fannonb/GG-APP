import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGInput, GGSelect, GGDatePicker } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useUserStore } from '@/store/user.store'
import { getPatientDisplayName } from '@/features/patient/patientAccount'
import { getCountryByCode, OPERATING_COUNTRY_OPTIONS, getWorldCountryByCode, isOperatingCountryCode, resolveResidenceSelectCode } from '@/config/countries'
import { formatAmount } from '@/utils/format'
import { useApplyCreditMutation } from '@/hooks/api'
import { ROUTES } from '@/router/routes'
import type { ApplyCreditBeneficiaryPayload } from '@/types/credit.types'
import { getFinancePartnerIdForCountry, getFinancePartnerSummary } from './credit.constants'
import { PARTNER_MARKS } from './partnerMarks'

const CYAN_DEEP = '#0B7BC0'
const CYAN_MID = '#1A9BE6'
const ADMIN_FEE_RATE = 0.025
const MIN_AMOUNT = 100
/** Matches the backend's total credit cap (also enforced on limit increases). */
const MAX_AMOUNT = 50000

const EMP_OPTIONS = [
  { value: 'employed', label: 'Employed (Full-time)' },
  { value: 'self-employed', label: 'Self-Employed / Business Owner' },
  { value: 'part-time', label: 'Employed (Part-time)' },
  { value: 'student', label: 'Student' },
  { value: 'unemployed', label: 'Unemployed' },
]

const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']

type CoverageType = 'self' | 'self_and_beneficiaries'

type DraftBeneficiary = ApplyCreditBeneficiaryPayload

const emptyBeneficiary = (): DraftBeneficiary => ({
  name: '',
  relation: '',
  dob: '',
  countryCode: 'KE',
  nationalId: '',
})

const selectStyle = (hasError: boolean, filled = true): React.CSSProperties => ({
  padding: '10px 14px',
  fontSize: '14px',
  fontFamily: font.family,
  color: filled ? C.text : C.textSub,
  background: '#fff',
  border: `1.5px solid ${hasError ? C.error : C.border}`,
  borderRadius: radius.sm,
  outline: 'none',
  appearance: 'none',
})

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>{title}</div>
        {hint && <div style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </section>
  )
}

function MoneyInput({
  label,
  currency,
  value,
  onChange,
  placeholder,
  hint,
  error,
}: {
  label: string
  currency: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  hint?: string
  error?: string
}) {
  const id = `money-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
        {label} <span style={{ color: C.error }}>*</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${error ? C.error : C.border}`, borderRadius: radius.sm, background: '#fff', overflow: 'hidden' }}>
        <span style={{ padding: '0 12px', fontSize: 14, fontWeight: 700, color: C.textSub, borderRight: `1px solid ${C.border}`, alignSelf: 'stretch', display: 'flex', alignItems: 'center', background: C.bg }}>
          {currency}
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 0, height: 44, padding: '0 12px', border: 'none', outline: 'none', fontSize: 15, fontFamily: font.family, color: C.text, background: 'transparent' }}
        />
      </div>
      {error
        ? <span style={{ fontSize: 12, color: C.error, fontWeight: 500 }}>{error}</span>
        : hint && <span style={{ fontSize: 12, color: C.textSub }}>{hint}</span>}
    </div>
  )
}

export function CreditApplyScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const user = useUserStore(s => s.user)
  // Residence is managed in Settings; changing it here would silently switch the lender and currency.
  const residenceCountryCode = resolveResidenceSelectCode(user)
  const [form, setForm] = useState({
    employment: '',
    income: '',
    amount: '',
    consent: false,
    coverageType: 'self' as CoverageType,
  })
  const [draftBeneficiaries, setDraftBeneficiaries] = useState<DraftBeneficiary[]>([emptyBeneficiary()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const applyMutation = useApplyCreditMutation()
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  const includeBeneficiaries = form.coverageType === 'self_and_beneficiaries'
  const marketCountryCode = isOperatingCountryCode(residenceCountryCode) ? residenceCountryCode : user.countryCode
  const marketCountry = getCountryByCode(marketCountryCode)
  const currency = marketCountry?.currencySymbol ?? ''
  const currencyLabel = currency.replace(/\.$/, '').replace(/^Ksh$/i, 'KSh')
  // One lender per market, matching the backend: Equity in Kenya, Moneymart in Zimbabwe and Zambia.
  const partnerId = getFinancePartnerIdForCountry(marketCountryCode)
  const partner = getFinancePartnerSummary(partnerId)
  const partnerName = partner?.name ?? 'your finance partner'
  const mark = PARTNER_MARKS[partnerId]
  const residenceLabel = getWorldCountryByCode(residenceCountryCode)?.name
    ?? getCountryByCode(residenceCountryCode)?.name
    ?? residenceCountryCode
  const livesAbroad = !isOperatingCountryCode(residenceCountryCode)
  const maskedId = user.nationalId ? `ID ••••${user.nationalId.slice(-4)}` : 'National ID not set'

  const amount = Number(form.amount)
  const hasAmount = form.amount !== '' && !isNaN(amount) && amount > 0
  const fee = hasAmount ? Math.round(amount * ADMIN_FEE_RATE * 100) / 100 : 0
  const walletAmount = hasAmount ? amount - fee : 0

  const updateBeneficiary = (index: number, key: keyof DraftBeneficiary, value: string) => {
    setDraftBeneficiaries(list => list.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.employment) e.employment = 'Select your employment status'
    if (!form.income || isNaN(Number(form.income)) || Number(form.income) <= 0) e.income = 'Enter your monthly income'
    if (!hasAmount || amount < MIN_AMOUNT) e.amount = `The minimum is ${formatAmount(MIN_AMOUNT, currency)}`
    else if (amount > MAX_AMOUNT) e.amount = `The maximum is ${formatAmount(MAX_AMOUNT, currency)}`
    if (!form.consent) e.consent = 'Please agree to the credit check and platform fee to continue'

    if (includeBeneficiaries) {
      const validBeneficiaries = draftBeneficiaries.filter(b => b.name.trim() && b.relation.trim() && b.dob && b.countryCode)
      if (validBeneficiaries.length === 0) {
        e.beneficiaries = 'Add at least one family member with name, relationship, date of birth and country'
      } else {
        draftBeneficiaries.forEach((b, index) => {
          const started = b.name.trim() || b.relation.trim() || b.dob || b.nationalId?.trim()
          if (!started) return
          if (!b.name.trim()) e[`benName${index}`] = 'Full name is required'
          if (!b.relation.trim()) e[`benRelation${index}`] = 'Relationship is required'
          if (!b.dob) e[`benDob${index}`] = 'Date of birth is required'
          if (!b.countryCode) e[`benCountry${index}`] = 'Country is required'
        })
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const beneficiaries = includeBeneficiaries
      ? draftBeneficiaries
          .filter(b => b.name.trim() && b.relation.trim() && b.dob && b.countryCode)
          .map(b => ({
            name: b.name.trim(),
            relation: b.relation.trim(),
            dob: b.dob,
            countryCode: b.countryCode,
            nationalId: b.nationalId?.trim() || undefined,
          }))
      : undefined

    try {
      await applyMutation.mutateAsync({
        financePartnerId: partnerId,
        employment: form.employment,
        monthlyIncome: Number(form.income),
        requestedAmount: amount,
        consent: form.consent,
        residenceCountryCode,
        residenceCountryName: getWorldCountryByCode(residenceCountryCode)?.name,
        coverageType: form.coverageType,
        beneficiaries,
      })
      navigate(ROUTES.CREDIT_STATUS)
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Unable to submit your application right now.' })
    }
  }

  const summaryRow = (label: string, value: string, strong = false, color?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: strong ? 15 : 13, padding: '6px 0' }}>
      <span style={{ color: strong ? C.text : C.textSub, fontWeight: strong ? 700 : 400 }}>{label}</span>
      <span style={{ color: color ?? C.text, fontWeight: strong ? 800 : 600 }}>{value}</span>
    </div>
  )

  const summary = (
    <aside
      aria-label="Application summary"
      style={{
        background: 'linear-gradient(160deg, #F2FAFF 0%, #E3F4FF 100%)',
        border: '1px solid rgba(56,182,255,0.28)',
        borderRadius: radius.lg,
        padding: '20px 22px',
        fontFamily: font.family,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Your application</div>
      {summaryRow("You're requesting", hasAmount ? formatAmount(amount, currency) : '—')}
      {summaryRow('Platform fee (2.5%)', hasAmount ? `− ${formatAmount(fee, currency)}` : '—')}
      <div style={{ height: 1, background: 'rgba(11,123,192,0.18)', margin: '6px 0' }} />
      {summaryRow('Loaded to your wallet', hasAmount ? formatAmount(walletAmount, currency) : '—', true, CYAN_DEEP)}
      <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.55, marginTop: 10 }}>
        You repay {partnerName} the full {hasAmount ? formatAmount(amount, currency) : 'amount you request'}, plus any interest they charge.
        The fee covers GG&apos;APP&apos;s service.
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(11,123,192,0.18)', fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>What happens next</div>
        Your application is reviewed by the GG&apos;APP team with {partnerName}
        {partner?.processingTime ? `, usually within ${partner.processingTime}` : ''}. We&apos;ll notify you when there&apos;s a decision.
      </div>
    </aside>
  )

  return (
    <AppLayout title="Apply for credit" back notifCount={1}>
      <div style={{ maxWidth: 1040, margin: '0 auto', fontFamily: font.family }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ height: 40, padding: '0 12px', borderRadius: 10, background: '#fff', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center' }}>
            {mark
              ? <img src={mark.src} alt={partnerName} style={{ height: Math.round(mark.height * 0.8), width: 'auto', display: 'block' }} />
              : <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{partnerName}</span>}
          </div>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
            Credit in {marketCountry?.name ?? 'your country'} is provided by <strong style={{ color: C.text }}>{partnerName}</strong>
            {partner?.processingTime ? ` · decision usually within ${partner.processingTime}` : ''}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 340px', gap: 20, alignItems: 'start' }}>
          <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: isMobile ? '18px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>About you</div>
              <div style={{ fontSize: 14, color: C.text, marginTop: 4 }}>
                <strong>{getPatientDisplayName(user)}</strong>
                <span style={{ color: C.textSub }}> · {maskedId} · Lives in {residenceLabel}{livesAbroad ? ' (abroad)' : ''}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textSub }}>
                Wrong details?{' '}
                <button type="button" onClick={() => navigate(ROUTES.PROFILE)} style={{ background: 'none', border: 'none', padding: 0, color: CYAN_DEEP, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: font.family }}>
                  Update them in Settings
                </button>
              </div>
              {livesAbroad && (
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 6, lineHeight: 1.5 }}>
                  Your credit stays in {marketCountry?.name ?? user.countryCode} ({currencyLabel}) while you live abroad.
                </div>
              )}
            </section>

            <Section title="Your income">
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div>
                  <GGSelect label="Employment status" value={form.employment} onChange={e => set('employment', e.target.value)} options={EMP_OPTIONS} required placeholder="Select employment status" />
                  {errors.employment && <span style={{ fontSize: 12, color: C.error, fontWeight: 500, marginTop: 4, display: 'block' }}>{errors.employment}</span>}
                </div>
                <MoneyInput
                  label="Monthly income"
                  currency={currencyLabel}
                  value={form.income}
                  onChange={v => set('income', v)}
                  placeholder="e.g. 40000"
                  hint="After tax"
                  error={errors.income}
                />
              </div>
            </Section>

            <Section title="How much do you need?">
              <div style={{ maxWidth: isMobile ? '100%' : 360 }}>
                <MoneyInput
                  label="Amount"
                  currency={currencyLabel}
                  value={form.amount}
                  onChange={v => set('amount', v)}
                  placeholder="e.g. 5000"
                  hint={`Between ${formatAmount(MIN_AMOUNT, currency)} and ${formatAmount(MAX_AMOUNT, currency)}`}
                  error={errors.amount}
                />
              </div>
              {isMobile && summary}
            </Section>

            <Section title="Who should it cover?">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }} role="radiogroup" aria-label="Who should it cover?">
                {[
                  { value: 'self' as CoverageType, label: 'Just me', hint: 'You can add family later in Settings.' },
                  { value: 'self_and_beneficiaries' as CoverageType, label: 'Me and my family', hint: 'Add family members now. They can use this credit too.' },
                ].map(option => {
                  const selected = form.coverageType === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        set('coverageType', option.value)
                        if (option.value === 'self_and_beneficiaries' && draftBeneficiaries.length === 0) setDraftBeneficiaries([emptyBeneficiary()])
                      }}
                      style={{
                        flex: 1,
                        minWidth: isMobile ? '100%' : 200,
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: radius.sm,
                        border: `1.5px solid ${selected ? CYAN_DEEP : C.border}`,
                        background: selected ? C.blue100 : '#fff',
                        cursor: 'pointer',
                        fontFamily: font.family,
                      }}
                    >
                      <span aria-hidden style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selected ? CYAN_DEEP : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxSizing: 'border-box' }}>
                        {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: CYAN_DEEP }} />}
                      </span>
                      <span>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.text }}>{option.label}</span>
                        <span style={{ display: 'block', fontSize: 12, color: C.textSub, marginTop: 2, lineHeight: 1.5 }}>{option.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {includeBeneficiaries && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 12, color: C.textSub }}>
                    Add at least one family member. Each must live in Kenya, Zimbabwe or Zambia.
                  </div>
                  {draftBeneficiaries.map((ben, index) => (
                    <div key={index} style={{ padding: 16, background: C.bg, borderRadius: radius.sm, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Family member {index + 1}</div>
                        {draftBeneficiaries.length > 1 && (
                          <button type="button" onClick={() => setDraftBeneficiaries(list => list.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: C.error, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}>
                            Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                        <GGInput label="Full name" placeholder="e.g. David Johnson" value={ben.name} onChange={e => updateBeneficiary(index, 'name', e.target.value)} required error={errors[`benName${index}`]} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Relationship <span style={{ color: C.error }}>*</span></label>
                          <select value={ben.relation} onChange={e => updateBeneficiary(index, 'relation', e.target.value)} style={selectStyle(!!errors[`benRelation${index}`], !!ben.relation)}>
                            <option value="">Select relationship</option>
                            {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          {errors[`benRelation${index}`] && <span style={{ fontSize: 12, color: C.error, fontWeight: 500 }}>{errors[`benRelation${index}`]}</span>}
                        </div>
                        <GGDatePicker label="Date of birth" value={ben.dob} onChange={value => updateBeneficiary(index, 'dob', value)} max={new Date().toISOString().slice(0, 10)} required error={errors[`benDob${index}`]} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Country <span style={{ color: C.error }}>*</span></label>
                          <select value={ben.countryCode} onChange={e => updateBeneficiary(index, 'countryCode', e.target.value as DraftBeneficiary['countryCode'])} style={selectStyle(!!errors[`benCountry${index}`])}>
                            {OPERATING_COUNTRY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                          {errors[`benCountry${index}`] && <span style={{ fontSize: 12, color: C.error, fontWeight: 500 }}>{errors[`benCountry${index}`]}</span>}
                        </div>
                        <GGInput label="National ID" placeholder="Optional" value={ben.nationalId ?? ''} onChange={e => updateBeneficiary(index, 'nationalId', e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <GGButton variant="secondary" size="sm" onClick={() => setDraftBeneficiaries(list => [...list, emptyBeneficiary()])} style={{ alignSelf: 'flex-start' }}>
                    + Add another family member
                  </GGButton>
                  {errors.beneficiaries && <span style={{ fontSize: 12, color: C.error, fontWeight: 500 }}>{errors.beneficiaries}</span>}
                </div>
              )}
            </Section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={e => set('consent', e.target.checked)}
                  style={{ accentColor: CYAN_DEEP, marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                  I agree to a credit check by {partnerName} and to the 2.5% GG&apos;APP platform fee taken from my approved credit.
                </span>
              </label>
              {errors.consent && <span style={{ fontSize: 12, color: C.error, fontWeight: 500 }}>{errors.consent}</span>}
              {errors.submit && (
                <div role="alert" style={{ padding: '10px 12px', borderRadius: radius.sm, background: 'rgba(239,68,68,0.10)', color: '#B91C1C', fontSize: 13 }}>
                  {errors.submit}
                </div>
              )}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={applyMutation.isPending}
                style={{
                  height: 48,
                  borderRadius: radius.sm,
                  border: 'none',
                  background: `linear-gradient(135deg, ${CYAN_MID} 0%, ${CYAN_DEEP} 100%)`,
                  boxShadow: '0 6px 16px rgba(11,123,192,0.28)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: font.family,
                  cursor: applyMutation.isPending ? 'default' : 'pointer',
                  opacity: applyMutation.isPending ? 0.7 : 1,
                }}
              >
                {applyMutation.isPending ? 'Submitting…' : 'Submit application'}
              </button>
            </section>
          </div>

          {!isMobile && <div style={{ position: 'sticky', top: 20 }}>{summary}</div>}
        </div>
      </div>
    </AppLayout>
  )
}
