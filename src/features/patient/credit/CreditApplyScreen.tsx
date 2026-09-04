import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGInput, GGSelect, GGDatePicker } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useUserStore } from '@/store/user.store'
import { getPatientDisplayName } from '@/features/patient/patientAccount'
import { getCountryByCode, OPERATING_COUNTRY_OPTIONS, WORLD_COUNTRIES, getWorldCountryByCode, isOperatingCountryCode, resolveResidenceSelectCode } from '@/config/countries'
import { formatCurrency } from '@/utils/format'
import { FinancePartnerSelector, type FinancePartnerOption } from './components/FinancePartnerSelector'
import { useApplyCreditMutation } from '@/hooks/api'
import { ROUTES } from '@/router/routes'
import type { ApplyCreditBeneficiaryPayload } from '@/types/credit.types'

const FINANCE_PARTNERS: FinancePartnerOption[] = [
  {
    id: 'moneymart',
    name: 'Moneymart Finance',
    tagline: 'Fast, flexible credit solutions built around your healthcare needs.',
    processingTime: '24-48 hrs',
    color: '#2e3191',
    selectedBg: 'rgba(46,49,145,0.04)',
    border: 'rgba(46,49,145,0.18)',
    activeBorder: '#2e3191',
    activeShadow: '0 0 0 3px rgba(46,49,145,0.12)',
  },
  {
    id: 'equity',
    name: 'Equity Bank',
    tagline: "Trusted healthcare financing backed by Africa's leading financial institution.",
    processingTime: '24 hrs',
    color: '#A93226',
    selectedBg: 'rgba(169,50,38,0.04)',
    border: 'rgba(169,50,38,0.18)',
    activeBorder: '#A93226',
    activeShadow: '0 0 0 3px rgba(169,50,38,0.12)',
  },
]

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

export function CreditApplyScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const user = useUserStore(s => s.user)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)
  const [form, setForm] = useState({
    employment: '',
    income: '',
    amount: '',
    consent: false,
    coverageType: 'self' as CoverageType,
    residenceCountryCode: resolveResidenceSelectCode(user),
  })
  const [draftBeneficiaries, setDraftBeneficiaries] = useState<DraftBeneficiary[]>([emptyBeneficiary()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const applyMutation = useApplyCreditMutation()
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(f => ({ ...f, [k]: v }))

  const selectedPartner = FINANCE_PARTNERS.find(p => p.id === selectedPartnerId) ?? null
  const includeBeneficiaries = form.coverageType === 'self_and_beneficiaries'
  const marketCountryCode = isOperatingCountryCode(form.residenceCountryCode)
    ? form.residenceCountryCode
    : user.countryCode
  const currency = getCountryByCode(marketCountryCode)?.currencySymbol ?? ''
  const residenceLabel = getWorldCountryByCode(form.residenceCountryCode)?.name
    ?? getCountryByCode(form.residenceCountryCode)?.name
    ?? form.residenceCountryCode
  const livesAbroad = !isOperatingCountryCode(form.residenceCountryCode)

  const updateBeneficiary = (index: number, key: keyof DraftBeneficiary, value: string) => {
    setDraftBeneficiaries(list =>
      list.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    )
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!selectedPartnerId) e.partner = 'Please select a finance partner'
    if (!form.residenceCountryCode) e.residence = 'Select your country of residence'
    if (!form.employment) e.employment = 'Please select your employment status'
    if (!form.income || isNaN(Number(form.income)) || Number(form.income) <= 0) e.income = 'Enter a valid monthly income'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) < 100) e.amount = `Minimum loan request is ${formatCurrency(100, currency)}`
    if (!form.consent) e.consent = 'You must consent to the credit check and acknowledge the admin fee'

    if (includeBeneficiaries) {
      const validBeneficiaries = draftBeneficiaries.filter(
        b => b.name.trim() && b.relation.trim() && b.dob && b.countryCode,
      )
      if (validBeneficiaries.length === 0) {
        e.beneficiaries = 'Add at least one beneficiary with name, relationship, date of birth, and country'
      } else {
        draftBeneficiaries.forEach((b, index) => {
          const started = b.name.trim() || b.relation.trim() || b.dob || b.nationalId?.trim() || b.countryCode
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
    if (!validate() || !selectedPartnerId) return

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
        financePartnerId: selectedPartnerId,
        employment: form.employment,
        monthlyIncome: Number(form.income),
        requestedAmount: Number(form.amount),
        consent: form.consent,
        residenceCountryCode: form.residenceCountryCode,
        residenceCountryName: getWorldCountryByCode(form.residenceCountryCode)?.name,
        coverageType: form.coverageType,
        beneficiaries,
      })
      navigate(ROUTES.CREDIT_STATUS)
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Unable to submit your application right now.',
      })
    }
  }

  const showNextSteps = form.amount && form.income
    && !isNaN(Number(form.amount)) && !isNaN(Number(form.income))
    && Number(form.income) > 0 && selectedPartner

  return (
    <AppLayout title="Balance Application" back notifCount={1}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>
        <FinancePartnerSelector
          partners={FINANCE_PARTNERS}
          selectedId={selectedPartnerId}
          onSelect={setSelectedPartnerId}
          error={errors.partner}
          stepComplete={!!selectedPartner}
        />

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
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.blue500 }}>Assigned on submission</div>
                </div>
                <div style={{ flex: 2, minWidth: 200, padding: '14px 18px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Applicant</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{getPatientDisplayName(user)}</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>
                    {user.nationalId || 'National ID not set'} · Lives in {residenceLabel}
                    {livesAbroad ? ' (abroad)' : ''}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px' }}>
                  Country of residence <span style={{ color: C.error }}>*</span>
                </div>
                <div style={{ fontSize: '12px', color: C.textSub, marginBottom: '10px', lineHeight: 1.55 }}>
                  Select where you currently live. Beneficiaries must still be listed under Kenya, Zimbabwe, or Zambia.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: isMobile ? '100%' : 360 }}>
                  <select
                    value={form.residenceCountryCode}
                    onChange={e => set('residenceCountryCode', e.target.value)}
                    style={{
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontFamily: font.family,
                      color: C.text,
                      background: '#fff',
                      border: `1.5px solid ${errors.residence ? C.error : C.border}`,
                      borderRadius: radius.sm,
                      outline: 'none',
                      appearance: 'none',
                    }}
                  >
                    {WORLD_COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  {errors.residence && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{errors.residence}</span>}
                </div>
                {livesAbroad && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: C.blue100, borderRadius: radius.sm, border: '1px solid rgba(56,182,255,0.22)', fontSize: '12px', color: '#1A5D8A', lineHeight: 1.55 }}>
                    You are applying as a resident abroad. Your wallet currency stays tied to your registered market ({getCountryByCode(user.countryCode)?.name ?? user.countryCode}).
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '10px' }}>
                  Who should this balance cover? <span style={{ color: C.error }}>*</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    {
                      value: 'self' as CoverageType,
                      label: 'Self only',
                      hint: 'Cover healthcare for yourself. You can enable beneficiaries later in Profile.',
                    },
                    {
                      value: 'self_and_beneficiaries' as CoverageType,
                      label: 'Self + beneficiaries',
                      hint: 'Cover yourself and add family members now. This also activates Beneficiaries in Profile.',
                    },
                  ].map(option => {
                    const selected = form.coverageType === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          set('coverageType', option.value)
                          if (option.value === 'self_and_beneficiaries' && draftBeneficiaries.length === 0) {
                            setDraftBeneficiaries([emptyBeneficiary()])
                          }
                        }}
                        style={{
                          flex: 1,
                          minWidth: isMobile ? '100%' : 220,
                          textAlign: 'left',
                          padding: '14px 16px',
                          borderRadius: radius.sm,
                          border: `2px solid ${selected ? C.blue500 : C.border}`,
                          background: selected ? C.blue100 : C.bg,
                          cursor: 'pointer',
                          fontFamily: font.family,
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 700, color: selected ? C.blue500 : C.text }}>{option.label}</div>
                        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', lineHeight: 1.5 }}>{option.hint}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {includeBeneficiaries && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Add beneficiaries</div>
                    <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>
                      At least one beneficiary is required. Each must be located in Kenya, Zimbabwe, or Zambia.
                    </div>
                  </div>

                  {draftBeneficiaries.map((ben, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        background: '#fff',
                        borderRadius: radius.sm,
                        border: `1px solid ${C.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>Beneficiary {index + 1}</div>
                        {draftBeneficiaries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDraftBeneficiaries(list => list.filter((_, i) => i !== index))}
                            style={{ background: 'none', border: 'none', color: C.error, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: font.family }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                        <GGInput
                          label="Full Name"
                          placeholder="e.g. David Johnson"
                          value={ben.name}
                          onChange={e => updateBeneficiary(index, 'name', e.target.value)}
                          required
                          error={errors[`benName${index}`]}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                            Relationship <span style={{ color: C.error }}>*</span>
                          </label>
                          <select
                            value={ben.relation}
                            onChange={e => updateBeneficiary(index, 'relation', e.target.value)}
                            style={{
                              padding: '10px 14px',
                              fontSize: '14px',
                              fontFamily: font.family,
                              color: ben.relation ? C.text : C.textSub,
                              background: '#fff',
                              border: `1.5px solid ${errors[`benRelation${index}`] ? C.error : C.border}`,
                              borderRadius: radius.sm,
                              outline: 'none',
                              appearance: 'none',
                            }}
                          >
                            <option value="">Select relation</option>
                            {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          {errors[`benRelation${index}`] && (
                            <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{errors[`benRelation${index}`]}</span>
                          )}
                        </div>
                        <GGDatePicker
                          label="Date of Birth"
                          value={ben.dob}
                          onChange={value => updateBeneficiary(index, 'dob', value)}
                          max={new Date().toISOString().slice(0, 10)}
                          required
                          error={errors[`benDob${index}`]}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                            Country of residence <span style={{ color: C.error }}>*</span>
                          </label>
                          <select
                            value={ben.countryCode}
                            onChange={e => updateBeneficiary(index, 'countryCode', e.target.value as DraftBeneficiary['countryCode'])}
                            style={{
                              padding: '10px 14px',
                              fontSize: '14px',
                              fontFamily: font.family,
                              color: C.text,
                              background: '#fff',
                              border: `1.5px solid ${errors[`benCountry${index}`] ? C.error : C.border}`,
                              borderRadius: radius.sm,
                              outline: 'none',
                              appearance: 'none',
                            }}
                          >
                            {OPERATING_COUNTRY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {errors[`benCountry${index}`] && (
                            <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{errors[`benCountry${index}`]}</span>
                          )}
                        </div>
                        <GGInput
                          label="National ID"
                          placeholder="Optional"
                          value={ben.nationalId ?? ''}
                          onChange={e => updateBeneficiary(index, 'nationalId', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}

                  <GGButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setDraftBeneficiaries(list => [...list, emptyBeneficiary()])}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    + Add another beneficiary
                  </GGButton>

                  {errors.beneficiaries && (
                    <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{errors.beneficiaries}</span>
                  )}
                </div>
              )}

              <div>
                <GGSelect label="Employment Status" value={form.employment} onChange={e => set('employment', e.target.value)} options={EMP_OPTIONS} required placeholder="Select employment status" />
                {errors.employment && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '4px', display: 'block' }}>{errors.employment}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <GGInput label="Monthly Income" placeholder="e.g. 1200" type="number" value={form.income} onChange={e => set('income', e.target.value)} required hint={`Net monthly income in ${currency}`} error={errors.income} />
                <GGInput label="Loan Amount Requested" placeholder="e.g. 5000" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} required hint={`Minimum ${formatCurrency(100, currency)}`} error={errors.amount} />
              </div>

              {showNextSteps && (
                <div style={{ padding: '18px 20px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(56,182,255,0.2)` }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: C.navy800, marginBottom: '12px' }}>What Happens Next</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      `Your application is sent to ${selectedPartner!.name} team for review.`,
                      'You will receive a notification when a decision is made.',
                      'Once approved, your wallet balance is loaded and ready to use at verified providers.',
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

              <div style={{ padding: '16px 18px', background: C.bg, borderRadius: radius.sm, border: `1.5px solid ${C.border}` }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: C.navy800, marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                  Platform Admin Fee
                </div>
                <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.65 }}>
                  By submitting this application, you acknowledge that a <strong style={{ color: C.text }}>2.5% platform administration fee</strong> will be deducted from your approved credit amount and remitted to GG&apos;APP. The remaining balance will be loaded to your wallet for use with verified healthcare providers. This fee is included in the total amount you repay to the finance partner.
                </div>
                {form.amount && !isNaN(Number(form.amount)) && Number(form.amount) > 0 && (
                  <div style={{ marginTop: '12px', padding: '10px 12px', background: '#fff', borderRadius: radius.xs, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSub }}>
                      <span>Requested amount</span>
                      <span style={{ fontWeight: 700, color: C.text }}>{formatCurrency(Number(form.amount), currency)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSub }}>
                      <span>Est. admin fee (2.5%)</span>
                      <span style={{ fontWeight: 700, color: C.text }}>{formatCurrency(Number(form.amount) * 0.025, currency)}</span>
                    </div>
                    <div style={{ height: 1, background: C.border, margin: '2px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ fontWeight: 700, color: C.text }}>Est. wallet credit</span>
                      <span style={{ fontWeight: 800, color: C.navy800 }}>{formatCurrency(Number(form.amount) * 0.975, currency)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '14px 16px', background: form.consent ? C.successBg : C.bg, borderRadius: radius.sm, border: `1.5px solid ${form.consent ? C.success : C.border}`, transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)} style={{ accentColor: C.success, marginTop: '2px', width: 14, height: 14, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: C.text, lineHeight: 1.6 }}>
                    I consent to a credit bureau check{selectedPartner ? ` by ${selectedPartner.name}` : ''} and acknowledge the 2.5% GG&apos;APP platform admin fee deducted from my approved credit.
                  </span>
                </label>
                {errors.consent && <span style={{ fontSize: '12px', color: C.error, fontWeight: 500, marginTop: '4px', display: 'block' }}>{errors.consent}</span>}
              </div>

              <div style={{ padding: '12px 16px', background: C.warningBg, borderRadius: radius.sm, border: `1px solid rgba(245,166,35,0.2)`, fontSize: '12px', color: '#8A4D00', lineHeight: 1.6 }}>
                <strong>Note:</strong> For now, GG&apos;APP admin reviews and approves applications. Direct finance partner approval will be enabled once partner APIs are connected.
              </div>
              {errors.submit && (
                <div style={{ fontSize: '12px', color: C.error, fontWeight: 600 }}>{errors.submit}</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <GGButton variant="secondary" size="md" onClick={() => navigate('/app/credit/disclaimer')} style={{ flex: 1 }}>Back</GGButton>
          <GGButton variant="primary" size="md" onClick={handleSubmit} disabled={applyMutation.isPending || !selectedPartner} style={{ flex: 2 }}>
            {applyMutation.isPending ? 'Submitting Application...' : selectedPartner ? `Submit with ${selectedPartner.name} ->` : 'Submit Application'}
          </GGButton>
        </div>
      </div>
    </AppLayout>
  )
}
