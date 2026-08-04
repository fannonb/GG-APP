import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { ApiError } from '@/api/types'
import { useRegisterSPMutation } from '@/hooks/api/useAuthMutations'
import { useResponsive } from '@/hooks/useResponsive'
import { CountryPhoneInput } from './CountryPhoneInput'
import type { CountryCode } from './CountryPhoneInput'
import { LocationPickerInput } from './LocationPickerInput'
import type { LocationSuggestion } from './LocationPickerInput'
import { PasswordStrength } from './PasswordStrength'

const STEPS = ['Practice Details', 'Services & Hours', 'Documents & Payment']
const SERVICE_TYPES = [
  'Hospital',
  'Pharmacy',
  'Laboratory',
  'Clinic',
  'General Practitioner',
  'Specialist',
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

type Day = (typeof DAYS)[number]

interface DayHours {
  open: boolean
  from: string
  to: string
}

interface FormState {
  practiceName: string
  email: string
  emailSecondary: string
  phone: string
  password: string
  country: CountryCode | ''
  serviceTypes: string[]
  licenseNumber: string
  hours: Record<Day, DayHours>
  paymentMethod: 'mpesa' | 'bank'
  mpesaPaybill: string
  bankName: string
  bankAccount: string
  bankBranch: string
  location: LocationSuggestion | null
}

const DEFAULT_HOURS: Record<Day, DayHours> = {
  Mon: { open: true, from: '08:00', to: '17:00' },
  Tue: { open: true, from: '08:00', to: '17:00' },
  Wed: { open: true, from: '08:00', to: '17:00' },
  Thu: { open: true, from: '08:00', to: '17:00' },
  Fri: { open: true, from: '08:00', to: '17:00' },
  Sat: { open: true, from: '08:00', to: '13:00' },
  Sun: { open: false, from: '', to: '' },
}

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
      {STEPS.map((title, index) => (
        <div
          key={title}
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: index < STEPS.length - 1 ? 1 : 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: index <= step ? '#10B981' : C.border,
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: font.family,
                transition: 'background 0.3s ease',
              }}
            >
              {index + 1}
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: index === step ? 700 : 500,
                color: index === step ? '#10B981' : C.textSub,
                whiteSpace: 'nowrap',
                fontFamily: font.family,
                transition: 'color 0.3s ease',
              }}
            >
              {title}
            </span>
          </div>
          {index < STEPS.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                background: index < step ? '#10B981' : C.border,
                margin: '-14px 8px 0',
                transition: 'background 0.3s ease',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function SPRegisterFlow() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const registerSPMutation = useRegisterSPMutation()
  const [step, setStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    practiceName: '',
    email: '',
    emailSecondary: '',
    phone: '',
    password: '',
    country: '',
    serviceTypes: [],
    licenseNumber: '',
    hours: DEFAULT_HOURS,
    paymentMethod: 'mpesa',
    mpesaPaybill: '',
    bankName: '',
    bankAccount: '',
    bankBranch: '',
    location: null,
  })

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const toggleService = (service: string) => {
    setField(
      'serviceTypes',
      form.serviceTypes.includes(service)
        ? form.serviceTypes.filter(item => item !== service)
        : [...form.serviceTypes, service],
    )
  }

  const toggleDay = (day: Day) => {
    setField('hours', {
      ...form.hours,
      [day]: { ...form.hours[day], open: !form.hours[day].open },
    })
  }

  const setHour = (day: Day, field: 'from' | 'to', value: string) => {
    setField('hours', {
      ...form.hours,
      [day]: { ...form.hours[day], [field]: value },
    })
  }

  const handleSubmit = async () => {
    try {
      setSubmitError(null)

      const result = await registerSPMutation.mutateAsync({
        practiceName: form.practiceName.trim(),
        email: form.email.trim(),
        emailSecondary: form.emailSecondary.trim() || undefined,
        phone: form.phone.trim(),
        password: form.password,
        country: form.location?.country || form.country || 'Zimbabwe',
        serviceTypes: form.serviceTypes,
        licenseNumber: form.licenseNumber.trim(),
        hours: DAYS.map(day => ({
          day,
          status: form.hours[day].open ? 'open' : 'closed',
          from: form.hours[day].from || undefined,
          to: form.hours[day].to || undefined,
        })),
        location: {
          label: form.location?.shortName,
          address: form.location?.address ?? '',
          city: form.location?.city,
          lat: form.location?.lat,
          lng: form.location?.lng,
        },
        payoutMethod: {
          method: form.paymentMethod,
          summary:
            form.paymentMethod === 'mpesa'
              ? `M-Pesa ${form.mpesaPaybill}`.trim()
              : [form.bankName, form.bankAccount].filter(Boolean).join(' '),
          accountNumber:
            form.paymentMethod === 'mpesa' ? form.mpesaPaybill.trim() : form.bankAccount.trim(),
          accountName: form.practiceName.trim(),
          bankName: form.paymentMethod === 'bank' ? form.bankName.trim() : undefined,
          bankBranch: form.paymentMethod === 'bank' ? form.bankBranch.trim() || undefined : undefined,
        },
        documents: [],
      })

      navigate(`/sp/pending?applicationId=${encodeURIComponent(result.applicationId)}`, {
        state: {
          applicationId: result.applicationId,
          status: result.status,
          submittedAt: new Date().toISOString(),
          message: result.message,
        },
      })
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : 'We could not submit your application.',
      )
    }
  }

  const focusColor = '#10B981'
  const focusShadow = 'rgba(16,185,129,0.12)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <StepDots step={step} />

      {submitError && (
        <div
          style={{
            padding: '12px 14px',
            background: '#FFF3F2',
            border: `1px solid ${C.error}33`,
            borderRadius: radius.sm,
            color: C.error,
            fontSize: '12px',
            fontFamily: font.family,
          }}
        >
          {submitError}
        </div>
      )}

      {step === 0 && (
        <>
          <GGInput
            label="Practice / Organisation Name"
            placeholder="City Medical Centre"
            value={form.practiceName}
            onChange={event => setField('practiceName', event.target.value)}
            required
            focusColor={focusColor}
            focusShadow={focusShadow}
          />
          <GGInput
            label="Primary Email"
            type="email"
            placeholder="admin@practice.com"
            value={form.email}
            onChange={event => setField('email', event.target.value)}
            required
            hint="Main login and notification email"
            focusColor={focusColor}
            focusShadow={focusShadow}
          />
          <GGInput
            label="Secondary Email"
            type="email"
            placeholder="billing@practice.com (optional)"
            value={form.emailSecondary}
            onChange={event => setField('emailSecondary', event.target.value)}
            focusColor={focusColor}
            focusShadow={focusShadow}
          />
          <CountryPhoneInput
            required
            countryCode={form.country}
            onCountryChange={code => setForm(current => ({ ...current, country: code as CountryCode, phone: '' }))}
            digits={form.phone}
            onDigitsChange={digits => setField('phone', digits)}
          />
          <LocationPickerInput required value={form.location} onChange={location => setField('location', location)} />
          <GGInput
            label="Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={form.password}
            onChange={event => setField('password', event.target.value)}
            required
            focusColor={focusColor}
            focusShadow={focusShadow}
          />
          <PasswordStrength password={form.password} />
          <GGButton
            variant="success"
            size="md"
            fullWidth
            onClick={() => setStep(1)}
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 4px 14px rgba(16,185,129,0.2)',
              border: 'none',
            }}
          >
            Continue {'->'}
          </GGButton>
        </>
      )}

      {step === 1 && (
        <>
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: C.text,
                marginBottom: '10px',
                fontFamily: font.family,
              }}
            >
              Service Type(s) <span style={{ color: C.error }}>*</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SERVICE_TYPES.map(service => {
                const active = form.serviceTypes.includes(service)
                return (
                  <button
                    key={service}
                    onClick={() => toggleService(service)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '9999px',
                      border: `1.5px solid ${active ? '#10B981' : C.border}`,
                      background: active ? 'rgba(16,185,129,0.08)' : C.bg,
                      color: active ? '#097951' : C.textSub,
                      fontSize: '13px',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: font.family,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {service}
                  </button>
                )
              })}
            </div>
          </div>

          <GGInput
            label="Medical License Number"
            placeholder="e.g. MCZ-2019-04821"
            value={form.licenseNumber}
            onChange={event => setField('licenseNumber', event.target.value)}
            required
            hint="Will be verified against the national regulatory body"
            focusColor={focusColor}
            focusShadow={focusShadow}
          />

          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: C.text,
                marginBottom: '10px',
                fontFamily: font.family,
              }}
            >
              Opening Times
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.sm, overflow: 'hidden' }}>
              {DAYS.map((day, index) => {
                const value = form.hours[day]
                return (
                  <div
                    key={day}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: isMobile ? 'wrap' : 'nowrap',
                      gap: isMobile ? '6px' : '0',
                      padding: '10px 14px',
                      borderBottom: index < DAYS.length - 1 ? `1px solid ${C.border}` : 'none',
                      background: value.open ? '#fff' : C.bg,
                    }}
                  >
                    <span
                      style={{
                        width: isMobile ? '100%' : '52px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: C.text,
                        fontFamily: font.family,
                      }}
                    >
                      {day}
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={value.open}
                        onChange={() => toggleDay(day)}
                        style={{ accentColor: '#10B981', width: 14, height: 14 }}
                      />
                      <span
                        style={{
                          fontSize: '12px',
                          color: value.open ? '#10B981' : C.textSub,
                          fontWeight: 600,
                          fontFamily: font.family,
                        }}
                      >
                        {value.open ? 'Open' : 'Closed'}
                      </span>
                    </label>
                    {value.open && (
                      <>
                        <input
                           type="time"
                           value={value.from}
                           onChange={event => setHour(day, 'from', event.target.value)}
                           style={{
                             padding: '5px 8px',
                             borderRadius: '6px',
                             border: `1px solid ${C.border}`,
                             fontSize: '12px',
                             fontFamily: font.family,
                             background: '#fff',
                             color: C.text,
                             flex: 1,
                           }}
                        />
                        <input
                           type="time"
                           value={value.to}
                           onChange={event => setHour(day, 'to', event.target.value)}
                           style={{
                             padding: '5px 8px',
                             borderRadius: '6px',
                             border: `1px solid ${C.border}`,
                             fontSize: '12px',
                             fontFamily: font.family,
                             background: '#fff',
                             color: C.text,
                             flex: 1,
                           }}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <GGButton variant="secondary" size="md" onClick={() => setStep(0)} style={{ flex: 1 }}>
              Back
            </GGButton>
            <GGButton
              variant="success"
              size="md"
              onClick={() => setStep(2)}
              style={{
                flex: 2,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 4px 14px rgba(16,185,129,0.2)',
                border: 'none',
              }}
            >
              Continue {'->'}
            </GGButton>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: C.text,
                marginBottom: '8px',
                fontFamily: font.family,
              }}
            >
              Practice Logo
            </div>
            <div
              style={{
                padding: '20px',
                border: `2px dashed ${C.border}`,
                borderRadius: radius.sm,
                textAlign: 'center',
                background: C.bg,
                fontSize: '12px',
                color: C.textSub,
                fontFamily: font.family,
              }}
            >
              Metadata-only document handling is enabled in this phase. File upload wiring can now feed this backend payload.
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: C.text,
                marginBottom: '8px',
                fontFamily: font.family,
              }}
            >
              Medical License Documents
            </div>
            <div
              style={{
                padding: '20px',
                border: `2px dashed ${C.border}`,
                borderRadius: radius.sm,
                textAlign: 'center',
                background: C.bg,
                fontSize: '12px',
                color: C.textSub,
                fontFamily: font.family,
              }}
            >
              Registration now reaches the backend even before binary file storage is added.
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: C.text,
                marginBottom: '10px',
                fontFamily: font.family,
              }}
            >
              Payment Method <span style={{ color: C.error }}>*</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {([
                ['mpesa', 'M-Pesa Paybill'],
                ['bank', 'Bank Account'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setField('paymentMethod', value)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: radius.sm,
                    border: `1.5px solid ${form.paymentMethod === value ? '#10B981' : C.border}`,
                    background: form.paymentMethod === value ? 'rgba(16,185,129,0.08)' : C.bg,
                    color: form.paymentMethod === value ? '#097951' : C.textSub,
                    fontSize: '13px',
                    fontWeight: form.paymentMethod === value ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: font.family,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.paymentMethod === 'mpesa' ? (
              <GGInput
                label="M-Pesa Paybill Number"
                placeholder="e.g. 123456"
                value={form.mpesaPaybill}
                onChange={event => setField('mpesaPaybill', event.target.value)}
                required
                focusColor={focusColor}
                focusShadow={focusShadow}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <GGInput
                  label="Bank Name"
                  placeholder="e.g. Stanbic Bank Zimbabwe"
                  value={form.bankName}
                  onChange={event => setField('bankName', event.target.value)}
                  required
                  focusColor={focusColor}
                  focusShadow={focusShadow}
                />
                <GGInput
                  label="Account Number"
                  placeholder="e.g. 9180012345678"
                  value={form.bankAccount}
                  onChange={event => setField('bankAccount', event.target.value)}
                  required
                  focusColor={focusColor}
                  focusShadow={focusShadow}
                />
                <GGInput
                  label="Branch Code / SWIFT (optional)"
                  placeholder="e.g. SBICZWHX"
                  value={form.bankBranch}
                  onChange={event => setField('bankBranch', event.target.value)}
                  focusColor={focusColor}
                  focusShadow={focusShadow}
                />
              </div>
            )}
          </div>

          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(16,185,129,0.08)',
              borderRadius: radius.sm,
              border: '1px solid rgba(16,185,129,0.2)',
              fontSize: '12px',
              color: '#097951',
              lineHeight: 1.6,
              fontFamily: font.family,
            }}
          >
            By registering, you confirm all submitted information is accurate and that your practice
            holds a valid medical licence.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <GGButton variant="secondary" size="md" onClick={() => setStep(1)} style={{ flex: 1 }}>
              Back
            </GGButton>
            <GGButton
              variant="success"
              size="md"
              onClick={() => void handleSubmit()}
              style={{
                flex: 2,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 4px 14px rgba(16,185,129,0.2)',
                border: 'none',
              }}
              disabled={registerSPMutation.isPending}
            >
              {registerSPMutation.isPending ? 'Submitting...' : 'Submit Application ->'}
            </GGButton>
          </div>
        </>
      )}
    </div>
  )
}
