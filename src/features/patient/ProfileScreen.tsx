import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GGCard, GGButton, GGInput, GGBadge, GGAvatar, GGDatePicker, PhonePrefixInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useResponsive } from '@/hooks/useResponsive'
import {
  useAddBeneficiaryMutation,
  useChangePatientPasswordMutation,
  useDeleteBeneficiaryMutation,
  usePatientProfile,
  useSetBeneficiariesEnabledMutation,
  useUpdateBeneficiaryMutation,
  useUpdatePatientProfileMutation,
} from '@/hooks/api'
import type { Beneficiary } from '@/types/user.types'
import { FlagImg } from '@/components/FlagImg'
import {
  getCountryByCode,
  OPERATING_COUNTRY_OPTIONS,
  WORLD_COUNTRIES,
  getWorldCountryByCode,
  isOperatingCountryCode,
  resolveResidenceSelectCode,
  getCountryDial,
  splitPhonePrefix,
} from '@/config/countries'
import type { CountryCode } from '@/config/countries'
import { formatPhone } from '@/utils/format'
import { useUserStore } from '@/store/user.store'
import { getPatientDisplayName, isBeneficiariesActive } from './patientAccount'
import { ROUTES } from '@/router/routes'

const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']

const TABS = [
  { id: 'profile',       label: 'Personal Info' },
  { id: 'beneficiaries', label: 'Beneficiaries' },
  { id: 'security',      label: 'Security & PIN' },
]

function DetailField({
  label,
  value,
  locked,
}: {
  label: string
  value: string
  locked?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>{label}</div>
        {locked && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
            <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke={C.textLight} strokeWidth="1.2" />
            <path d="M4 5.5V4a2 2 0 014 0v1.5" stroke={C.textLight} strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.45, wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}

export function ProfileScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile } = useResponsive()
  const storedUser = useUserStore(s => s.user)
  const storedBeneficiaries = useUserStore(s => s.beneficiaries)
  const { data: profile } = usePatientProfile()
  const updatePatientProfile = useUpdatePatientProfileMutation()
  const changePassword = useChangePatientPasswordMutation()
  const setBeneficiariesEnabled = useSetBeneficiariesEnabledMutation()
  const addBeneficiary = useAddBeneficiaryMutation()
  const updateBeneficiary = useUpdateBeneficiaryMutation()
  const deleteBeneficiary = useDeleteBeneficiaryMutation()
  const u = profile?.user ?? storedUser
  const beneficiaries = profile?.beneficiaries ?? storedBeneficiaries
  const beneficiariesActive = isBeneficiariesActive(u.beneficiariesEnabled, beneficiaries.length)
  const country = getCountryByCode(u.countryCode)
  const countryName = country?.name ?? u.country
  const currencyLabel = country
    ? `${country.currencyName} (${country.currencyCode})`
    : 'Not available'
  const dateOfBirth = u.dateOfBirth
    ? new Date(u.dateOfBirth).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not provided'
  const phoneDisplay = u.phone
    ? formatPhone(u.phone, countryName).display
    : 'Not provided'
  const displayValue = (value: string | undefined) => value?.trim() || 'Not provided'
  const memberSince = u.memberSince
    ? new Date(u.memberSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'New member'
  const residenceName = u.residenceCountry ?? countryName
  const residenceFlagCode = resolveResidenceSelectCode(u) || u.countryCode
  const identityLocation = u.residesAbroad
    ? [`${residenceName} (lives abroad)`, `${countryName} market`, country?.currencyCode].filter(Boolean).join(' · ')
    : [countryName, country?.currencyCode].filter(Boolean).join(' · ')

  const initialTab = ((location.state as { tab?: string } | null)?.tab ?? 'profile')
  const [tab, setTab] = useState(initialTab)
  const [editing, setEditing] = useState(false)
  const initialResCode = resolveResidenceSelectCode(u)
  const initialPhoneState = splitPhonePrefix(u.phone, initialResCode)
  const [form, setForm] = useState({
    name: u.name,
    email: u.email,
    phone: u.phone,
    residenceCountryCode: initialResCode,
  })
  const [phoneCountryCode, setPhoneCountryCode] = useState(initialPhoneState.countryCode)
  const [phoneDigits, setPhoneDigits] = useState(initialPhoneState.digits)
  const [saved, setSaved] = useState(Boolean((location.state as { pinUpdated?: boolean } | null)?.pinUpdated))
  const [saveError, setSaveError] = useState('')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const setF = <K extends keyof typeof form>(k: K, v: string) => setForm(f => ({ ...f, [k]: v }))
  const setPasswordField = <K extends keyof typeof passwordForm>(k: K, v: string) =>
    setPasswordForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (editing) return
    const resCode = resolveResidenceSelectCode(u)
    const parsed = splitPhonePrefix(u.phone, resCode)
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone,
      residenceCountryCode: resCode,
    })
    setPhoneCountryCode(parsed.countryCode)
    setPhoneDigits(parsed.digits)
  }, [editing, u.email, u.name, u.phone, u.residenceCountry, u.residesAbroad, u.countryCode, u.country])

  useEffect(() => {
    const nextTab = (location.state as { tab?: string } | null)?.tab
    if (nextTab) setTab(nextTab)
  }, [location.state])

  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 3000)
    return () => clearTimeout(timer)
  }, [saved])

  const [bens, setBens] = useState<Beneficiary[]>(beneficiaries)
  const [showAddBen, setShowAddBen] = useState(false)
  const [editingBen, setEditingBen] = useState<Beneficiary | null>(null)
  const [benForm, setBenForm] = useState({ name: '', relation: '', dob: '', nationalId: '', countryCode: u.countryCode as CountryCode })
  const setBen = <K extends keyof typeof benForm>(k: K, v: typeof benForm[K]) => setBenForm(f => ({ ...f, [k]: v }))
  const [addBenError, setAddBenError] = useState('')
  const [deletingBen, setDeletingBen] = useState<Beneficiary | null>(null)

  useEffect(() => {
    setBens(beneficiaries)
  }, [beneficiaries])

  const startEditing = () => {
    setSaveError('')
    const resCode = resolveResidenceSelectCode(u)
    const parsed = splitPhonePrefix(u.phone, resCode)
    setPhoneCountryCode(parsed.countryCode)
    setPhoneDigits(parsed.digits)
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone,
      residenceCountryCode: resCode,
    })
    setEditing(true)
  }

  const cancelEditing = () => {
    setSaveError('')
    const resCode = resolveResidenceSelectCode(u)
    const parsed = splitPhonePrefix(u.phone, resCode)
    setPhoneCountryCode(parsed.countryCode)
    setPhoneDigits(parsed.digits)
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone,
      residenceCountryCode: resCode,
    })
    setEditing(false)
  }

  const handleSave = async () => {
    setSaveError('')
    const dial = getCountryDial(phoneCountryCode)
    const cleanDigits = phoneDigits.trim()
    if (!form.name.trim() || !form.email.trim() || !cleanDigits || !form.residenceCountryCode) {
      setSaveError('Please fill in all required fields.')
      return
    }
    const fullPhone = `${dial} ${cleanDigits}`
    const selected = getWorldCountryByCode(form.residenceCountryCode)
    try {
      await updatePatientProfile.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: fullPhone,
        residenceCountryCode: form.residenceCountryCode,
        residenceCountryName: selected?.name ?? form.residenceCountryCode,
      })
      setSaved(true)
      setEditing(false)
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Unable to save profile changes. Please try again.',
      )
    }
  }

  const handleAddBen = async () => {
    setAddBenError('')
    if (!benForm.name.trim() || !benForm.relation || !benForm.dob || !benForm.countryCode) {
      setAddBenError('Please fill in all required fields, including date of birth.')
      return
    }
    const payload = {
      name: benForm.name,
      relation: benForm.relation,
      dob: benForm.dob,
      countryCode: benForm.countryCode,
      nationalId: benForm.nationalId || undefined,
    }
    try {
      if (editingBen) {
        await updateBeneficiary.mutateAsync({ id: editingBen.id, payload })
      } else {
        await addBeneficiary.mutateAsync(payload)
      }
      setBenForm({ name: '', relation: '', dob: '', nationalId: '', countryCode: u.countryCode })
      setShowAddBen(false)
      setEditingBen(null)
    } catch (error) {
      setAddBenError(
        error instanceof Error ? error.message : 'Unable to save this beneficiary. Please try again.',
      )
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim() || !passwordForm.confirmPassword.trim()) {
      setPasswordError('Please fill in all required password fields.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password confirmation does not match.')
      return
    }
    try {
      const result = await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordSuccess(result.message || 'Password updated successfully.')
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : 'Unable to update password. Please try again.',
      )
    }
  }

  return (
    <AppLayout title="My Profile" notifCount={1}>
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>

        {saved && (
          <div style={{ padding: '12px 18px', background: C.successBg, borderRadius: radius.sm, border: `1px solid rgba(34,201,138,0.25)`, fontSize: '14px', color: '#0D7A52', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-6" stroke={C.success} strokeWidth="2" strokeLinecap="round"/></svg>
            Profile updated successfully.
          </div>
        )}

        <GGCard padding={isMobile ? '18px 16px' : '20px 22px'}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <GGAvatar name={getPatientDisplayName(u)} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em' }}>
                {getPatientDisplayName(u)}
              </div>
              <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <FlagImg code={residenceFlagCode} size={16} />
                <span>{identityLocation}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>
                Member since {memberSince}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <GGBadge type="primary">Verified patient</GGBadge>
                <GGBadge type={beneficiariesActive ? 'info' : 'outline'}>
                  {beneficiariesActive
                    ? `${bens.length} beneficiar${bens.length === 1 ? 'y' : 'ies'}`
                    : 'Beneficiaries off'}
                </GGBadge>
              </div>
            </div>
          </div>
        </GGCard>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '0', background: '#fff', borderRadius: '12px', padding: '4px', border: `1px solid ${C.border}` }}>
          {TABS.map(t => {
            const inactiveBeneficiaries = t.id === 'beneficiaries' && !beneficiariesActive
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: '9px 10px',
                  borderRadius: '9px',
                  border: 'none',
                  background: active ? C.blue500 : 'transparent',
                  color: active ? '#fff' : inactiveBeneficiaries ? C.textLight : C.textSub,
                  fontSize: '13px',
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: font.family,
                  transition: 'all 0.14s',
                  opacity: inactiveBeneficiaries && !active ? 0.7 : 1,
                }}
              >
                {t.label}{inactiveBeneficiaries ? ' (Locked)' : ''}
              </button>
            )
          })}
        </div>

        {/* Personal Info */}
        {tab === 'profile' && (
          <GGCard padding="28px">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editing ? 20 : 4 }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Personal Details</div>
              {!editing
                ? <GGButton variant="secondary" size="sm" onClick={startEditing}>Edit</GGButton>
                : <div style={{ display: 'flex', gap: '8px' }}>
                    <GGButton variant="secondary" size="sm" onClick={cancelEditing}>Cancel</GGButton>
                  <GGButton variant="primary" size="sm" onClick={() => { void handleSave() }} disabled={updatePatientProfile.isPending}>
                    {updatePatientProfile.isPending ? 'Saving…' : 'Save Changes'}
                  </GGButton>
                  </div>}
            </div>
            {saveError && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: C.errorBg, borderRadius: radius.sm, border: `1px solid rgba(229,71,77,0.25)`, fontSize: '13px', color: C.error, fontWeight: 600 }}>
                {saveError}
              </div>
            )}
            {editing ? (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <GGInput label="Full Name"      value={form.name}  onChange={e => setF('name', e.target.value)}  required />
                <GGInput label="Email Address"  type="email" value={form.email} onChange={e => setF('email', e.target.value)} required />
                <PhonePrefixInput
                  label="Phone Number"
                  required
                  countryCode={phoneCountryCode}
                  onCountryChange={setPhoneCountryCode}
                  digits={phoneDigits}
                  onDigitsChange={setPhoneDigits}
                  dropdownPlacement="top"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>
                    Country of residence <span style={{ color: C.error }}>*</span>
                  </label>
                  <select
                    value={form.residenceCountryCode}
                    onChange={e => setF('residenceCountryCode', e.target.value)}
                    style={{
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontFamily: font.family,
                      color: C.text,
                      background: '#fff',
                      border: `1.5px solid ${C.border}`,
                      borderRadius: radius.sm,
                      outline: 'none',
                      appearance: 'none',
                    }}
                  >
                    {WORLD_COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '11px', color: C.textSub, lineHeight: 1.5 }}>
                    {isOperatingCountryCode(form.residenceCountryCode)
                      ? 'You live in an operating market. Credit currency follows this country.'
                      : `You live abroad. Credit market stays ${countryName}; beneficiaries must still be in Kenya, Zimbabwe, or Zambia.`}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {[
                  [
                    { label: 'Full name', value: getPatientDisplayName(u) },
                    { label: 'Email address', value: displayValue(u.email) },
                  ],
                  [
                    { label: 'Phone number', value: phoneDisplay },
                    { label: 'Country of residence', value: u.residesAbroad
                      ? `${u.residenceCountry ?? u.country} (abroad)`
                      : (u.residenceCountry ?? countryName) },
                  ],
                  [
                    { label: 'Market country', value: countryName },
                    { label: 'Currency', value: currencyLabel },
                  ],
                  [
                    { label: 'National ID', value: displayValue(u.nationalId), locked: true },
                    { label: 'Date of birth', value: dateOfBirth, locked: true },
                  ],
                ].map((pair, i, rows) => (
                  <div
                    key={pair[0].label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: isMobile ? 16 : 40,
                      padding: '18px 0',
                      borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}
                  >
                    {pair.map(field => (
                      <DetailField key={field.label} label={field.label} value={field.value} locked={'locked' in field ? field.locked : undefined} />
                    ))}
                  </div>
                ))}
                <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, paddingTop: 4 }}>
                  National ID and date of birth are on file for verification and cannot be changed here.
                </div>
              </div>
            )}
          </GGCard>
        )}

        {/* Beneficiaries */}
        {tab === 'beneficiaries' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '16px 18px',
              background: '#fff',
              borderRadius: radius.lg,
              border: `1px solid ${C.border}`,
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Beneficiaries</div>
                <div style={{ fontSize: '13px', color: C.textSub, marginTop: '2px' }}>
                  {beneficiariesActive
                    ? 'Manage the people you can book appointments and pay for.'
                    : 'Turn this on to add family members and book healthcare for them.'}
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: beneficiariesActive ? C.success : C.textSub }}>
                  {beneficiariesActive ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={beneficiariesActive}
                  aria-label={beneficiariesActive ? 'Disable beneficiaries' : 'Enable beneficiaries'}
                  disabled={setBeneficiariesEnabled.isPending}
                  onClick={() => {
                    if (beneficiariesActive && bens.length > 0) {
                      return
                    }
                    setBeneficiariesEnabled.reset()
                    setBeneficiariesEnabled.mutate(!beneficiariesActive)
                  }}
                  title={bens.length > 0 ? 'Turned on because this account already has beneficiaries' : undefined}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 999,
                    border: 'none',
                    padding: 3,
                    background: beneficiariesActive ? C.blue500 : C.border,
                    cursor: setBeneficiariesEnabled.isPending || bens.length > 0 ? (bens.length > 0 ? 'default' : 'wait') : 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    opacity: bens.length > 0 ? 1 : undefined,
                  }}
                >
                  <span style={{
                    display: 'block',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#fff',
                    transform: beneficiariesActive ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    pointerEvents: 'none',
                  }} />
                </button>
              </div>
            </div>

            {setBeneficiariesEnabled.isError && (
              <div style={{ padding: '12px 16px', background: C.errorBg, borderRadius: radius.sm, border: `1px solid rgba(239,68,68,0.25)`, fontSize: '13px', color: C.error, fontWeight: 600 }}>
                {setBeneficiariesEnabled.error instanceof Error
                  ? setBeneficiariesEnabled.error.message
                  : 'Unable to update beneficiaries. Restart the backend if this persists.'}
              </div>
            )}

            {!beneficiariesActive ? (
              <GGCard padding="48px" style={{ textAlign: 'center', border: `2px dashed ${C.border}`, opacity: 0.92 }}>
                <div style={{ margin: '0 auto 16px', width: 56, height: 56, borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke={C.textSub} strokeWidth="1.5"/><path d="M8 11V8a4 4 0 018 0v3" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Beneficiaries are locked</div>
                <div style={{ fontSize: '13px', color: C.textSub, maxWidth: 420, margin: '0 auto 18px', lineHeight: 1.6 }}>
                  Enable the toggle above to activate this section, or choose Self + beneficiaries during your credit application.
                </div>
                <GGButton
                  variant="primary"
                  size="sm"
                  disabled={setBeneficiariesEnabled.isPending}
                  onClick={() => {
                    setBeneficiariesEnabled.reset()
                    setBeneficiariesEnabled.mutate(true)
                  }}
                >
                  {setBeneficiariesEnabled.isPending ? 'Enabling...' : 'Activate Beneficiaries'}
                </GGButton>
              </GGCard>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>Registered Beneficiaries</div>
                    <div style={{ fontSize: '13px', color: C.textSub, marginTop: '2px' }}>People covered from your healthcare balance.</div>
                  </div>
                  <GGButton variant="primary" size="sm" onClick={() => { setBenForm({ name: '', relation: '', dob: '', nationalId: '', countryCode: u.countryCode }); setEditingBen(null); setAddBenError(''); setShowAddBen(true) }}>+ Add Beneficiary</GGButton>
                </div>

                <div style={{ padding: '12px 16px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.2)`, fontSize: '12px', color: '#1A5D8A', lineHeight: 1.6 }}>
                  Beneficiaries are funded from your balance and must reside in Kenya, Zimbabwe, or Zambia. All appointments and invoices remain tied to your account.
                </div>

                {showAddBen && (
                  <GGCard padding="24px" style={{ border: `2px solid ${C.blue500}`, background: C.blue100 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>{editingBen ? 'Edit Beneficiary' : 'New Beneficiary'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                      <GGInput label="Full Name" placeholder="e.g. David Johnson" value={benForm.name} onChange={e => setBen('name', e.target.value)} required />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Relationship <span style={{ color: C.error }}>*</span></label>
                        <select value={benForm.relation} onChange={e => setBen('relation', e.target.value)}
                          style={{ padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: benForm.relation ? C.text : C.textSub, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', appearance: 'none' }}>
                          <option value="">Select relation</option>
                          {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <GGDatePicker label="Date of Birth" value={benForm.dob} onChange={value => setBen('dob', value)} max={new Date().toISOString().slice(0, 10)} required />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Country of residence <span style={{ color: C.error }}>*</span></label>
                        <select
                          value={benForm.countryCode}
                          onChange={e => setBen('countryCode', e.target.value as CountryCode)}
                          style={{ padding: '10px 14px', fontSize: '14px', fontFamily: font.family, color: C.text, background: '#fff', border: `1.5px solid ${C.border}`, borderRadius: radius.sm, outline: 'none', appearance: 'none' }}
                        >
                          {OPERATING_COUNTRY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <GGInput label="National ID" placeholder="ZW-XXXXXXXX-X" value={benForm.nationalId} onChange={e => setBen('nationalId', e.target.value)} />
                    </div>
                    {addBenError && (
                      <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: radius.sm, background: C.errorBg, color: C.error, fontSize: '12px', fontWeight: 500 }}>
                        {addBenError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <GGButton variant="secondary" size="sm" onClick={() => { setShowAddBen(false); setEditingBen(null); setAddBenError('') }}>Cancel</GGButton>
                      <GGButton variant="primary" size="sm" onClick={handleAddBen} disabled={!benForm.name || !benForm.relation || !benForm.dob || !benForm.countryCode || addBeneficiary.isPending || updateBeneficiary.isPending}>{editingBen ? 'Save Changes' : 'Add Beneficiary'}</GGButton>
                    </div>
                  </GGCard>
                )}

                {deletingBen && (
                  <GGCard padding="20px" style={{ border: `2px solid ${C.error}`, background: C.errorBg }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.error, marginBottom: '8px' }}>Remove {deletingBen.name}?</div>
                    <div style={{ fontSize: '13px', color: C.text, marginBottom: '16px' }}>This beneficiary will be removed from your account. Past appointments and invoices won't be affected.</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <GGButton variant="secondary" size="sm" onClick={() => setDeletingBen(null)}>Cancel</GGButton>
                      <GGButton variant="danger" size="sm" onClick={async () => { await deleteBeneficiary.mutateAsync(deletingBen.id); setDeletingBen(null) }} disabled={deleteBeneficiary.isPending}>Remove</GGButton>
                    </div>
                  </GGCard>
                )}

                {bens.length === 0 && (
                  <GGCard padding="48px" style={{ textAlign: 'center', border: `2px dashed ${C.border}` }}>
                    <div style={{ margin: '0 auto 16px', width: 56, height: 56, borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><circle cx="10" cy="9" r="4" stroke={C.textSub} strokeWidth="1.5"/><path d="M2 22c0-4 3.6-7 8-7" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round"/><circle cx="19" cy="11" r="4" stroke={C.blue500} strokeWidth="1.5"/><path d="M11 26c0-4 3.6-7 8-7s8 3 8 7" stroke={C.blue500} strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>No beneficiaries yet</div>
                    <div style={{ fontSize: '13px', color: C.textSub }}>Add family members so you can book and pay for their healthcare.</div>
                  </GGCard>
                )}

                {bens.map(ben => (
                  <GGCard key={ben.id} padding="20px">
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <GGAvatar name={ben.name} size={48} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>{ben.name}</div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <GGBadge type="info">{ben.relation}</GGBadge>
                          {ben.countryCode && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: C.textSub }}>
                              <FlagImg code={ben.countryCode} size={14} style={{ borderRadius: '2px' }} />
                              {getCountryByCode(ben.countryCode)?.name ?? ben.countryCode}
                            </span>
                          )}
                          {ben.age > 0 && <span style={{ fontSize: '12px', color: C.textSub }}>Age {ben.age}</span>}
                          {ben.nationalId && <span style={{ fontSize: '12px', color: C.textSub }}>{ben.nationalId}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <GGButton variant="secondary" size="sm" onClick={() => { setEditingBen(ben); setBenForm({ name: ben.name, relation: ben.relation, dob: ben.dob ?? '', nationalId: ben.nationalId ?? '', countryCode: ben.countryCode ?? u.countryCode }); setAddBenError(''); setShowAddBen(true) }}>Edit</GGButton>
                        <GGButton variant="danger" size="sm" onClick={() => setDeletingBen(ben)}>Remove</GGButton>
                      </div>
                    </div>
                  </GGCard>
                ))}
              </>
            )}
          </div>
        )}

        {/* Security & PIN */}
        {tab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Payment PIN */}
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Payment PIN</div>
              <div style={{ fontSize: '13px', color: C.textSub, marginBottom: '16px', lineHeight: 1.5 }}>
                One 4-digit PIN protects every payment. During authorization you enter the same PIN three times to confirm.
              </div>

              <div style={{
                padding: '18px 20px',
                borderRadius: radius.sm,
                background: u.hasPaymentPin ? C.successBg : C.warningBg,
                border: `1px solid ${u.hasPaymentPin ? 'rgba(34,201,138,0.25)' : 'rgba(245,166,35,0.3)'}`,
                display: 'flex',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '16px',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Your payment PIN</span>
                    <GGBadge type={u.hasPaymentPin ? 'success' : 'warning'}>
                      {u.hasPaymentPin ? '✓ Set' : '⚠ Not Set'}
                    </GGBadge>
                  </div>
                  <div style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.5 }}>
                    {u.hasPaymentPin
                      ? 'Ready for invoice authorization (enter 3 times to confirm).'
                      : 'Set a PIN before you can authorize any invoice payment.'}
                  </div>
                </div>
                <GGButton
                  variant={u.hasPaymentPin ? 'secondary' : 'warning'}
                  size="sm"
                  style={u.hasPaymentPin ? {} : { background: C.warning, color: '#fff' }}
                  onClick={() => navigate(ROUTES.SECURITY_PIN, {
                    state: {
                      returnTo: ROUTES.PROFILE,
                      tab: 'security',
                    },
                  })}
                >
                  {u.hasPaymentPin ? 'Reset PIN' : 'Set PIN'}
                </GGButton>
              </div>

              <div style={{ padding: '12px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: '12px', color: C.textSub, lineHeight: 1.6 }}>
                <strong style={{ color: C.text }}>How it works:</strong> When authorizing a payment, you enter your PIN three times in a row. Each entry must match the same PIN.
              </div>
            </GGCard>

            {/* Password change — 2-column */}
            <GGCard padding="24px">
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px' }}>Change Password</div>
              {passwordError && (
                <div style={{ marginBottom: '14px', padding: '12px 14px', background: C.errorBg, borderRadius: radius.sm, border: `1px solid rgba(229,71,77,0.25)`, fontSize: '13px', color: C.error, fontWeight: 600 }}>
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div style={{ marginBottom: '14px', padding: '12px 14px', background: C.successBg, borderRadius: radius.sm, border: `1px solid rgba(34,201,138,0.25)`, fontSize: '13px', color: '#0D7A52', fontWeight: 600 }}>
                  {passwordSuccess}
                </div>
              )}
              <div style={{ marginBottom: '14px' }}>
                <GGInput
                  label="Current Password"
                  type="password"
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordField('currentPassword', e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <GGInput
                  label="New Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordField('newPassword', e.target.value)}
                  required
                />
                <GGInput
                  label="Confirm New Password"
                  type="password"
                  placeholder="Repeat new password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordField('confirmPassword', e.target.value)}
                  required
                />
              </div>
              <GGButton
                variant="primary"
                size="md"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => { void handleChangePassword() }}
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? 'Updating…' : 'Update Password'}
              </GGButton>
            </GGCard>

          </div>
        )}
      </div>
    </AppLayout>
  )
}
