import { useEffect, useRef, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { GGInput, GGButton, GGDatePicker } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { PasswordStrength } from './PasswordStrength'
import { CountryPhoneInput } from './CountryPhoneInput'
import type { CountryCode } from './CountryPhoneInput'
import {
  patientRegisterSchema,
  patientRegisterGoogleSchema,
  type PatientRegisterFormValues,
} from '@/schemas/auth.schema'
import {
  useRegisterPatientMutation,
  useGoogleLoginMutation,
  useGoogleCallbackMutation,
} from '@/hooks/api'
import { useAuthStore } from '@/store/auth.store'
import { PORTAL_HOME, ROUTES } from '@/router/routes'
import { ApiError } from '@/api/types'
import { consumeGooglePkceVerifier } from '@/lib/google-pkce'

const STEPS = ['Account basics', 'Identity', 'Security & consent']
const STEP_BLURBS = [
  'Name, contact details, and optional Google sign-up.',
  'Date of birth, gender, and national ID for verification.',
  'Create a password, accept terms, then verify your email.',
]
const VERIFY_TOKEN_STORAGE_KEY = 'gg_verify_token'

interface GoogleProfileState {
  firstName: string
  lastName: string
  email: string
  googleIdToken: string
}

function StepProgress({ step }: { step: number }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.blue500,
          fontFamily: font.family,
          letterSpacing: '0.02em',
          marginBottom: 4,
        }}
      >
        Step {step + 1} of {STEPS.length}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: C.text,
          fontFamily: font.family,
          letterSpacing: '-0.02em',
          marginBottom: 4,
        }}
      >
        {STEPS[step]}
      </div>
      <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.45, marginBottom: 12 }}>
        {STEP_BLURBS[step]}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 999,
              background: i <= step ? C.blue500 : C.border,
              transition: 'background 0.2s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

interface PatientRegisterFlowProps {
  onStarted?: () => void
}

export function PatientRegisterFlow({ onStarted }: PatientRegisterFlowProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const setSession = useAuthStore(s => s.setSession)
  const { isMobile } = useResponsive()
  const [step, setStep] = useState(0)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const registerMutation = useRegisterPatientMutation()
  const googleMutation = useGoogleLoginMutation(ROUTES.REGISTER)
  const googleCallbackMutation = useGoogleCallbackMutation()
  const handledGoogleCallback = useRef(false)

  const googleProfile = (location.state as { googleProfile?: GoogleProfileState } | null)?.googleProfile ?? null
  const isGoogleSignup = googleProfile !== null

  // Google consent returns here when sign-up is started from this screen:
  // exchange the code, then either land on the pre-filled form (new user) or
  // finish the session (existing user) — no detour through /login.
  useEffect(() => {
    if (handledGoogleCallback.current) return
    const code = searchParams.get('code')
    const oauthError = searchParams.get('error')
    if (!code && !oauthError) return

    handledGoogleCallback.current = true
    setSearchParams({}, { replace: true })
    if (code) {
      googleCallbackMutation.mutate({
        code,
        redirectUri: `${window.location.origin}${ROUTES.REGISTER}`,
        codeVerifier: consumeGooglePkceVerifier(searchParams.get('state')),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<PatientRegisterFormValues>({
    resolver: zodResolver(
      isGoogleSignup ? patientRegisterGoogleSchema : patientRegisterSchema,
    ) as unknown as Resolver<PatientRegisterFormValues>,
    defaultValues: {
      firstName: googleProfile?.firstName ?? '',
      lastName: googleProfile?.lastName ?? '',
      email: googleProfile?.email ?? '',
      country: '',
      phone: '',
      dob: '',
      gender: '',
      nationalId: '',
      password: '',
    },
    mode: 'onBlur',
  })

  const country = watch('country') as CountryCode | ''
  const phone = watch('phone')
  const dobValue = watch('dob')
  const password = watch('password')
  const maxDob = new Date().toISOString().slice(0, 10)

  const markStarted = () => {
    onStarted?.()
  }

  const continueStep0 = async () => {
    const valid = await trigger(['firstName', 'lastName', 'email', 'country', 'phone'])
    if (valid) {
      markStarted()
      setStep(1)
    }
  }

  const continueStep1 = async () => {
    const valid = await trigger(['dob', 'gender', 'nationalId'])
    if (valid) {
      markStarted()
      setStep(2)
    }
  }

  const onSubmit = handleSubmit(values => {
    registerMutation.mutate(
      {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        country: values.country,
        phone: values.phone,
        dob: values.dob,
        gender: values.gender,
        nationalId: values.nationalId,
        password: isGoogleSignup ? undefined : values.password,
        googleIdToken: isGoogleSignup ? googleProfile.googleIdToken : undefined,
      },
      {
        onSuccess: result => {
          if (result.session) {
            setSession(result.session.role)
            navigate(PORTAL_HOME[result.session.role] ?? PORTAL_HOME.patient)
            return
          }
          if (result.verificationToken) {
            sessionStorage.setItem(VERIFY_TOKEN_STORAGE_KEY, result.verificationToken)
          }
          navigate(ROUTES.VERIFY)
        },
      },
    )
  })

  const submitError =
    registerMutation.error instanceof ApiError ? registerMutation.error.message : null

  const firstName = register('firstName')
  const lastName = register('lastName')
  const email = register('email')
  const genderField = register('gender')
  const nationalId = register('nationalId')
  const passwordField = register('password')

  const showToggle = (visible: boolean, onToggle: () => void) => (
    <span
      onClick={onToggle}
      style={{
        fontSize: 12,
        color: C.blue500,
        fontWeight: 600,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {visible ? 'Hide' : 'Show'}
    </span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <StepProgress step={step} />

      {step === 0 && (
        <>
          {isGoogleSignup && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.2)`, fontSize: '12px', color: '#1A5D8A', fontWeight: 600 }}>
              <svg width="16" height="16" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              Verified by Google — email is locked in. We&apos;ve pre-filled your name; feel free to correct it.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
            <GGInput
              label="First Name"
              placeholder="Sarah"
              name={firstName.name}
              onChange={e => { markStarted(); firstName.onChange(e) }}
              onBlur={firstName.onBlur}
              inputRef={firstName.ref}
              error={errors.firstName?.message}
              required
            />
            <GGInput
              label="Last Name"
              placeholder="Johnson"
              name={lastName.name}
              onChange={e => { markStarted(); lastName.onChange(e) }}
              onBlur={lastName.onBlur}
              inputRef={lastName.ref}
              error={errors.lastName?.message}
              required
            />
          </div>
          <GGInput
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            name={email.name}
            onChange={e => { markStarted(); email.onChange(e) }}
            onBlur={email.onBlur}
            inputRef={email.ref}
            error={errors.email?.message}
            required
            disabled={isGoogleSignup}
          />
          <CountryPhoneInput
            required
            countryCode={country}
            onCountryChange={code => {
              markStarted()
              setValue('country', code, { shouldValidate: true })
              setValue('phone', '', { shouldValidate: true })
            }}
            digits={phone}
            onDigitsChange={d => {
              markStarted()
              setValue('phone', d, { shouldValidate: true })
            }}
          />
          {(errors.country?.message || errors.phone?.message) && (
            <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>
              {errors.country?.message ?? errors.phone?.message}
            </span>
          )}
          <GGButton variant="primary" size="md" fullWidth onClick={continueStep0}>Continue</GGButton>

          {!isGoogleSignup && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
                <div style={{ flex: 1, height: '1px', background: C.border }} />
                <span style={{ fontSize: '12px', color: C.textSub, fontWeight: 500 }}>or</span>
                <div style={{ flex: 1, height: '1px', background: C.border }} />
              </div>
              <button
                type="button"
                onClick={() => {
                  markStarted()
                  googleMutation.mutate()
                }}
                disabled={googleMutation.isPending}
                style={{ width: '100%', padding: '11px 20px', background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: C.text, fontFamily: font.family, opacity: googleMutation.isPending ? 0.7 : 1 }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
                Sign up with Google
              </button>
              {googleMutation.error instanceof ApiError && (
                <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{googleMutation.error.message}</span>
              )}
              {googleCallbackMutation.error instanceof ApiError && (
                <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{googleCallbackMutation.error.message}</span>
              )}
            </>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <div
            style={{
              padding: '12px 14px',
              background: C.bg,
              borderRadius: radius.sm,
              border: `1px solid ${C.border}`,
              fontSize: 12,
              color: C.textSub,
              lineHeight: 1.55,
              fontFamily: font.family,
            }}
          >
            Identity details are used for KYC verification only and are kept confidential under our privacy policy.
          </div>
          <GGDatePicker
            label="Date of Birth"
            value={dobValue}
            onChange={value => setValue('dob', value, { shouldValidate: true })}
            max={maxDob}
            error={errors.dob?.message}
            required
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: C.textSub, fontFamily: font.family }}>
              Gender <span style={{ color: C.error }}>*</span>
            </label>
            <select
              name={genderField.name}
              onChange={genderField.onChange}
              onBlur={genderField.onBlur}
              ref={genderField.ref}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                fontFamily: font.family,
                color: C.navy800,
                background: '#fff',
                border: `1.5px solid ${errors.gender ? C.error : C.border}`,
                borderRadius: radius.sm,
                outline: 'none',
              }}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
            {errors.gender?.message && (
              <span style={{ fontSize: '12px', color: C.error, fontWeight: 500 }}>{errors.gender.message}</span>
            )}
          </div>
          <GGInput
            label="National ID Number"
            placeholder="ZW-XXXXXXXX-X"
            name={nationalId.name}
            onChange={nationalId.onChange}
            onBlur={nationalId.onBlur}
            inputRef={nationalId.ref}
            error={errors.nationalId?.message}
            required
            hint="Required for identity verification. Never shared with providers."
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <GGButton variant="secondary" size="md" onClick={() => setStep(0)} style={{ flex: 1 }}>Back</GGButton>
            <GGButton variant="primary" size="md" onClick={continueStep1} style={{ flex: 2 }}>Continue</GGButton>
          </div>
        </>
      )}

      {step === 2 && (
        <form onSubmit={onSubmit}>
          {isGoogleSignup ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.2)`, fontSize: '13px', color: '#1A5D8A', fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              You&apos;re signing up with Google — no password needed.
            </div>
          ) : (
            <>
              <GGInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                name={passwordField.name}
                onChange={passwordField.onChange}
                onBlur={passwordField.onBlur}
                inputRef={passwordField.ref}
                error={errors.password?.message}
                required
                rightEl={showToggle(showPassword, () => setShowPassword(v => !v))}
              />
              <PasswordStrength password={password} />
            </>
          )}
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              marginTop: '16px',
              padding: '12px 14px',
              background: agreedToTerms ? C.blue100 : C.bg,
              borderRadius: radius.sm,
              border: `1.5px solid ${agreedToTerms ? C.blue500 : C.border}`,
              transition: 'all 0.2s ease',
            }}
          >
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={event => setAgreedToTerms(event.target.checked)}
              style={{ accentColor: C.blue500, width: 16, height: 16, marginTop: '1px', flexShrink: 0 }}
            />
            <span style={{ fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6, fontFamily: font.family }}>
              By registering, you agree to our{' '}
              <a
                href={ROUTES.TERMS}
                target="_blank"
                rel="noopener noreferrer"
                onClick={event => event.stopPropagation()}
                style={{ color: C.blue500, fontWeight: 700 }}
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href={ROUTES.PRIVACY_POLICY}
                target="_blank"
                rel="noopener noreferrer"
                onClick={event => event.stopPropagation()}
                style={{ color: C.blue500, fontWeight: 700 }}
              >
                Privacy Policy
              </a>.
            </span>
          </label>
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: C.textSub,
              lineHeight: 1.5,
              fontFamily: font.family,
            }}
          >
            Next: we&apos;ll ask you to verify your email before you can sign in.
          </div>
          {submitError && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: C.error, fontWeight: 500 }}>{submitError}</div>
          )}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <GGButton variant="secondary" size="md" type="button" onClick={() => setStep(1)} style={{ flex: 1 }}>Back</GGButton>
            <GGButton variant="primary" size="md" type="submit" disabled={registerMutation.isPending || !agreedToTerms} style={{ flex: 2 }}>
              {registerMutation.isPending ? 'Creating…' : 'Create account'}
            </GGButton>
          </div>
        </form>
      )}
    </div>
  )
}
