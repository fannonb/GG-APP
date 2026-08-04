import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GGBadge, GGButton, GGCard, GGInput, GGTextarea } from '@/design-system'
import type { ProviderPayoutAccount, ProviderSettingsResponse } from '@/api/types'
import { C, font, radius } from '@/design-system/tokens'
import { getCountryByName } from '@/config/countries'
import { LocationPicker } from '@/components/LocationPicker'
import {
  useChangeSPPasswordMutation,
  useCreateSPPayoutAccountMutation,
  useDeleteSPPayoutAccountMutation,
  useSetDefaultSPPayoutAccountMutation,
  useSPSettings,
  useUpdateSPPayoutAccountMutation,
  useUpdateSPProfileMutation,
} from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { ROUTES } from '@/router/routes'

type TabId = 'profile' | 'account' | 'security'

type OpeningHours = Record<string, { open: boolean; from: string; to: string }>

type ProfileFormState = {
  about: string
  address: string
  lat: number | null
  lng: number | null
  phone: string
  country: string
  categories: string[]
  status: 'open' | 'closed'
  establishedYear: string
  languages: string[]
  tags: string[]
  logoUrl: string
  license: string
  openingHours: OpeningHours
}

type PayoutFormState = {
  id?: string
  method: 'mpesa' | 'bank' | 'mobile_money'
  accountNumber: string
  accountName: string
  country: string
  isDefault: boolean
  // M-Pesa
  mpesaType: 'paybill' | 'till'
  paybillNumber: string
  // Bank
  bankName: string
  branch: string
  branchCode: string
  swiftCode: string
}

const EMPTY_PAYOUT_FORM: PayoutFormState = {
  method: 'bank',
  accountNumber: '',
  accountName: '',
  country: 'Zimbabwe',
  isDefault: false,
  mpesaType: 'paybill',
  paybillNumber: '',
  bankName: '',
  branch: '',
  branchCode: '',
  swiftCode: '',
}

const DAYS_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DEFAULT_DAY = { open: false, from: '08:00', to: '17:00' }

const SP_CATEGORIES: { value: string; label: string }[] = [
  { value: 'doctor',     label: 'Doctor' },
  { value: 'clinic',     label: 'Clinic' },
  { value: 'hospital',   label: 'Hospital' },
  { value: 'pharmacy',   label: 'Pharmacy' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'radiology',  label: 'Radiology / Imaging' },
]

function buildDefaultHours(): OpeningHours {
  return Object.fromEntries(DAYS_ORDER.map(d => [d, { ...DEFAULT_DAY }]))
}

function normalizeCategoryValue(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[/-]+/g, ' ').replace(/\s+/g, '_')
  switch (normalized) {
    case 'general_practitioner':
    case 'general_practitioner_doctor':
      return 'doctor'
    case 'radiology_imaging':
      return 'radiology'
    case 'specialist':
      return 'doctor'
    default:
      return normalized
  }
}

function formFromSettings(s: ProviderSettingsResponse): ProfileFormState {
  const p = s.profile
  const hours = buildDefaultHours()
  for (const day of DAYS_ORDER) {
    if (p.openingHours[day]) hours[day] = { ...p.openingHours[day] }
  }
  return {
    about: p.about,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    phone: p.phone,
    country: p.country,
    categories: p.category
      ? Array.from(new Set(p.category.split(',').map(c => normalizeCategoryValue(c)).filter(Boolean)))
      : [],
    status: p.status,
    establishedYear: p.establishedYear ? String(p.establishedYear) : '',
    languages: [...p.languages],
    tags: [...p.tags],
    logoUrl: p.logoUrl ?? '',
    license: p.license ?? '',
    openingHours: hours,
  }
}

export function SPSettingsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialTab = ((location.state as { tab?: TabId } | null)?.tab ?? 'profile') as TabId
  const logoInputRef = useRef<HTMLInputElement>(null)

  const { data: settings, isLoading } = useSPSettings()
  const updateProfileMutation = useUpdateSPProfileMutation()
  const changePasswordMutation = useChangeSPPasswordMutation()
  const createPayoutAccountMutation = useCreateSPPayoutAccountMutation()
  const updatePayoutAccountMutation = useUpdateSPPayoutAccountMutation()
  const setDefaultPayoutAccountMutation = useSetDefaultSPPayoutAccountMutation()
  const deletePayoutAccountMutation = useDeleteSPPayoutAccountMutation()

  const [tab, setTab] = useState<TabId>(initialTab)
  const [isEditing, setIsEditing] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState<ProfileFormState | null>(null)
  const [newTag, setNewTag] = useState('')
  const [newLanguage, setNewLanguage] = useState('')
  const [payoutForm, setPayoutForm] = useState<PayoutFormState>(EMPTY_PAYOUT_FORM)
  const [showPayoutForm, setShowPayoutForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings) return
    setProfileForm(formFromSettings(settings))
  }, [settings])

  const flashSaved = (msg: string) => {
    setSavedMessage(msg)
    window.setTimeout(() => setSavedMessage(null), 2500)
  }

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileForm(cur => cur ? { ...cur, logoUrl: reader.result as string } : cur)
    }
    reader.readAsDataURL(file)
  }

  const handleCancelEdit = () => {
    if (settings) setProfileForm(formFromSettings(settings))
    setNewLanguage('')
    setNewTag('')
    setIsEditing(false)
  }

  const handleSaveProfile = async () => {
    if (!profileForm) return
    await updateProfileMutation.mutateAsync({
      about: profileForm.about,
      address: profileForm.address,
      lat: profileForm.lat ?? undefined,
      lng: profileForm.lng ?? undefined,
      phone: profileForm.phone,
      country: profileForm.country,
      category: profileForm.categories.length > 0 ? profileForm.categories.join(', ') : undefined,
      status: profileForm.status,
      establishedYear: profileForm.establishedYear ? Number(profileForm.establishedYear) : undefined,
      languages: profileForm.languages,
      tags: profileForm.tags,
      openingHours: profileForm.openingHours,
      logoUrl: profileForm.logoUrl || undefined,
    })
    setIsEditing(false)
    flashSaved('Profile saved successfully.')
  }

  const handleSavePassword = async () => {
    setPasswordError(null)
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    await changePasswordMutation.mutateAsync({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    flashSaved('Password updated successfully.')
  }

  const beginEditPayout = (account?: ProviderPayoutAccount) => {
    if (!account) {
      const country = settings?.profile.country || 'Zimbabwe'
      setPayoutForm({
        ...EMPTY_PAYOUT_FORM,
        country,
        method: country === 'Kenya' ? 'mpesa' : 'bank',
        isDefault: settings?.payoutAccounts.length === 0,
      })
    } else {
      setPayoutForm({
        ...EMPTY_PAYOUT_FORM,
        id: account.id,
        method: account.method,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        country: account.country,
        isDefault: account.isDefault,
        mpesaType: account.mpesaType ?? 'paybill',
        paybillNumber: account.paybillNumber ?? '',
        bankName: account.bankName ?? '',
        branch: account.branch ?? '',
        branchCode: account.branchCode ?? '',
        swiftCode: account.swiftCode ?? '',
      })
    }
    setShowPayoutForm(true)
  }

  const savePayoutAccount = async () => {
    const f = payoutForm
    // Build the canonical accountNumber/accountName based on method
    let accountNumber = ''
    const accountName = f.accountName.trim()
    if (f.method === 'mpesa') {
      accountNumber = f.mpesaType === 'paybill' ? f.paybillNumber.trim() : f.accountNumber.trim()
      if (!accountNumber) return
    } else {
      accountNumber = f.accountNumber.trim()
      if (!accountNumber || !accountName) return
    }
    const payload = {
      method: f.method,
      accountNumber,
      accountName,
      country: f.country.trim(),
      isDefault: f.isDefault,
      mpesaType: f.method === 'mpesa' ? f.mpesaType : undefined,
      paybillNumber: f.method === 'mpesa' && f.mpesaType === 'paybill' ? f.paybillNumber.trim() : undefined,
      bankName: f.method === 'bank' ? f.bankName.trim() : undefined,
      branch: f.method === 'bank' ? f.branch.trim() : undefined,
      branchCode: f.method === 'bank' ? f.branchCode.trim() : undefined,
      swiftCode: f.method === 'bank' ? f.swiftCode.trim() : undefined,
    }
    if (f.id) {
      await updatePayoutAccountMutation.mutateAsync({ id: f.id, payload })
    } else {
      await createPayoutAccountMutation.mutateAsync(payload)
    }
    setShowPayoutForm(false)
    setPayoutForm(EMPTY_PAYOUT_FORM)
    flashSaved('Payout account saved.')
  }

  if (isLoading || !settings || !profileForm) {
    return (
      <SPLayout title="Settings" subtitle="Manage your provider profile and account">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading provider settings...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  const logoSrc = profileForm.logoUrl || settings.profile.logoUrl

  // ── Small view-mode helpers ──────────────────────────────────
  const ViewRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <span style={{ marginTop: '2px', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', fontFamily: font.family }}>{label}</div>
        <div style={{ fontSize: '13px', color: C.text, fontWeight: 500, fontFamily: font.family }}>{value || '—'}</div>
      </div>
    </div>
  )

  return (
    <SPLayout title="Settings" subtitle="Manage your provider profile and account">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {savedMessage && (
          <div style={{ padding: '12px 16px', background: C.successBg, border: `1px solid ${C.success}33`, borderRadius: radius.sm, fontSize: '13px', fontWeight: 600, color: '#0D6B47', fontFamily: font.family }}>
            {savedMessage}
          </div>
        )}

        {/* Header banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #091F40 0%, #0D3270 45%, #1059B0 80%, #1A7BD4 100%)',
            borderRadius: '16px',
            padding: '28px',
            color: '#fff',
            fontFamily: font.family,
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 72, height: 72, borderRadius: '18px',
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'hidden',
            }}
          >
            {logoSrc
              ? <img src={logoSrc} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: font.family }}>{settings.profile.name[0]}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.03em' }}>{settings.profile.name}</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.78)', marginTop: '4px' }}>
              {settings.profile.category} · {settings.profile.country}
            </div>
            {settings.profile.address && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>{settings.profile.address}</div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <GGBadge type="success">Verified Provider</GGBadge>
              <GGBadge type={profileForm.status === 'open' ? 'open' : 'closed'}>
                {profileForm.status === 'open' ? 'Open' : 'Closed'}
              </GGBadge>
              {profileForm.license && <GGBadge type="info">Lic: {profileForm.license}</GGBadge>}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, background: '#fff', borderRadius: '12px', padding: '4px', border: `1px solid ${C.border}` }}>
          {([['profile', 'Public Profile'], ['account', 'Account'], ['security', 'Security']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); if (id !== 'profile') setIsEditing(false) }}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: '9px', border: 'none',
                background: tab === id ? C.blue500 : 'transparent',
                color: tab === id ? '#fff' : C.textSub,
                fontSize: '13px', fontWeight: tab === id ? 700 : 500,
                cursor: 'pointer', fontFamily: font.family,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── PUBLIC PROFILE TAB ── */}
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>

            {/* ── LEFT CARD ── */}
            <GGCard padding="24px">
              {!isEditing ? (
                /* ── VIEW MODE ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Practice Details</div>
                    <GGButton variant="secondary" size="sm" onClick={() => setIsEditing(true)}>Edit Profile</GGButton>
                  </div>

                  {/* Logo + About */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div
                      style={{
                        width: 56, height: 56, borderRadius: '14px',
                        background: C.blue100, border: `1px solid ${C.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', flexShrink: 0,
                      }}
                    >
                      {logoSrc
                        ? <img src={logoSrc} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '22px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{settings.profile.name[0]}</span>
                      }
                    </div>
                    <div style={{ flex: 1, fontSize: '13px', color: C.textSub, lineHeight: 1.7, fontFamily: font.family }}>
                      {profileForm.about || <em>No description added yet. Click Edit Profile to add one.</em>}
                    </div>
                  </div>

                  <div style={{ height: 1, background: C.border, marginBottom: '18px' }} />

                  {/* Info rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <ViewRow
                      icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1C4.8 1 3 2.8 3 5c0 3.2 4 8 4 8s4-4.8 4-8c0-2.2-1.8-4-4-4z" stroke={C.blue500} strokeWidth="1.2"/><circle cx="7" cy="5" r="1.5" stroke={C.blue500} strokeWidth="1.1"/></svg>}
                      label="Address"
                      value={profileForm.address}
                    />
                    <ViewRow
                      icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke={C.blue500} strokeWidth="1.2"/><path d="M1 4.5l6 4 6-4" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/></svg>}
                      label="Email"
                      value={settings.profile.email}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <ViewRow
                        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="6" stroke={C.blue500} strokeWidth="1.2"/><path d="M5 7l1.5 1.5 3-3" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/></svg>}
                        label="Phone"
                        value={(() => {
                          const dial = getCountryByName(profileForm.country)?.dial ?? ''
                          const phone = profileForm.phone
                          return dial && !phone.startsWith(dial) && phone ? `${dial} ${phone}` : phone
                        })()}
                      />
                      <ViewRow
                        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="10" rx="1.5" stroke={C.blue500} strokeWidth="1.2"/><path d="M1 6h12" stroke={C.blue500} strokeWidth="1.1"/><line x1="4" y1="2" x2="4" y2="4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/><line x1="10" y1="2" x2="10" y2="4" stroke={C.blue500} strokeWidth="1.2" strokeLinecap="round"/></svg>}
                        label="Established"
                        value={profileForm.establishedYear ? profileForm.establishedYear : '—'}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <ViewRow
                        icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={C.blue500} strokeWidth="1.2"/><path d="M7 1.5c-2 1.5-3 3.2-3 5.5s1 4 3 5.5" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/><path d="M7 1.5c2 1.5 3 3.2 3 5.5s-1 4-3 5.5" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/><path d="M1.5 7h11" stroke={C.blue500} strokeWidth="1.1"/></svg>}
                        label="Country"
                        value={profileForm.country}
                      />
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ marginTop: '2px', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3.5v3.5c0 2.8 2.2 5.1 5 5.5 2.8-.4 5-2.7 5-5.5V3.5L7 1z" stroke={C.blue500} strokeWidth="1.2" fill="none"/></svg>
                        </span>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontFamily: font.family }}>Category</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {profileForm.categories.length > 0
                              ? profileForm.categories.map(c => (
                                  <span key={c} style={{ padding: '3px 10px', borderRadius: radius.full, background: C.blue100, border: `1px solid ${C.blue500}22`, fontSize: '12px', fontWeight: 600, color: C.blue500, fontFamily: font.family }}>
                                    {SP_CATEGORIES.find(s => s.value === c)?.label ?? c}
                                  </span>
                                ))
                              : <span style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>—</span>
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* License */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 12px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M7 1L2 3.5v3.5c0 2.8 2.2 5.1 5 5.5 2.8-.4 5-2.7 5-5.5V3.5L7 1z" stroke={C.success} strokeWidth="1.2" fill="none"/>
                        <path d="M4.5 7l2 2 3-3" stroke={C.success} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font.family }}>License</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>{profileForm.license || 'Not assigned'}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: C.textSub, fontFamily: font.family }}>Managed by GG'APP</span>
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font.family }}>Practice Status</div>
                      <GGBadge type={profileForm.status === 'open' ? 'open' : 'closed'}>
                        {profileForm.status === 'open' ? 'Open' : 'Closed'}
                      </GGBadge>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── EDIT MODE ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Edit Profile</div>
                    <button
                      onClick={handleCancelEdit}
                      style={{ background: 'none', border: 'none', fontSize: '13px', color: C.textSub, cursor: 'pointer', fontFamily: font.family }}
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Logo upload */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family, marginBottom: '10px' }}>Practice Logo</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: 64, height: 64, borderRadius: '16px',
                          background: C.blue100, border: `2px dashed ${C.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', flexShrink: 0,
                        }}
                      >
                        {logoSrc
                          ? <img src={logoSrc} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '24px', fontWeight: 800, color: C.blue500, fontFamily: font.family }}>{settings.profile.name[0]}</span>
                        }
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoFile} />
                        <GGButton variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()}>
                          {logoSrc ? 'Change Logo' : 'Upload Logo'}
                        </GGButton>
                        {logoSrc && (
                          <button
                            onClick={() => setProfileForm(cur => cur ? { ...cur, logoUrl: '' } : cur)}
                            style={{ background: 'none', border: 'none', fontSize: '12px', color: C.error, cursor: 'pointer', fontFamily: font.family, textAlign: 'left' }}
                          >
                            Remove
                          </button>
                        )}
                        <div style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>PNG, JPG or SVG. Max 2 MB.</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 1, background: C.border }} />

                  <GGTextarea
                    label="About Us"
                    value={profileForm.about}
                    placeholder="Describe your practice — specialisations, team, experience, and what patients can expect when they visit."
                    onChange={e => setProfileForm(cur => cur ? { ...cur, about: e.target.value } : cur)}
                    rows={5}
                  />

                  <LocationPicker
                    value={profileForm.address}
                    onChange={({ address, lat, lng }) =>
                      setProfileForm(cur => cur ? { ...cur, address, lat, lng } : cur)
                    }
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Phone with country prefix */}
                    {(() => {
                      const countryConfig = getCountryByName(profileForm.country)
                      const dial = countryConfig?.dial ?? ''
                      const local = dial && profileForm.phone.startsWith(dial)
                        ? profileForm.phone.slice(dial.length).trimStart()
                        : profileForm.phone
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>
                            Phone
                          </label>
                          <div
                            style={{
                              display: 'flex', alignItems: 'stretch',
                              border: `1px solid ${C.border}`, borderRadius: radius.sm,
                              overflow: 'hidden', background: '#fff',
                            }}
                          >
                            {dial && (
                              <div
                                style={{
                                  padding: '10px 12px', background: C.blue100,
                                  borderRight: `1px solid ${C.border}`,
                                  fontSize: '13px', fontWeight: 700, color: C.blue500,
                                  fontFamily: font.family, flexShrink: 0,
                                  display: 'flex', alignItems: 'center',
                                }}
                              >
                                {dial}
                              </div>
                            )}
                            <input
                              value={local}
                              placeholder={countryConfig?.phonePlaceholder ?? 'Phone number'}
                              onChange={e => {
                                const full = dial ? `${dial} ${e.target.value}`.trimEnd() : e.target.value
                                setProfileForm(cur => cur ? { ...cur, phone: full } : cur)
                              }}
                              style={{
                                flex: 1, padding: '10px 12px', border: 'none', outline: 'none',
                                fontSize: '13px', fontFamily: font.family, background: 'transparent',
                                color: C.text, minWidth: 0,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })()}
                    <GGInput
                      label="Established Year"
                      value={profileForm.establishedYear}
                      placeholder="e.g. 2009"
                      onChange={e => setProfileForm(cur => cur ? { ...cur, establishedYear: e.target.value } : cur)}
                    />
                  </div>

                  {/* Country — read-only */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>Country</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.sm }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <rect x="4" y="1" width="6" height="8" rx="1" stroke={C.textSub} strokeWidth="1.2"/>
                        <path d="M2 9h10v3H2z" stroke={C.textSub} strokeWidth="1.1" fill="none" strokeLinejoin="round"/>
                        <line x1="7" y1="5" x2="7" y2="7" stroke={C.textSub} strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family, flex: 1 }}>
                        {profileForm.country}
                      </span>
                      <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>Fixed at registration</span>
                    </div>
                  </div>

                  {/* Category — multi-select checkboxes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>Category <span style={{ fontSize: '11px', fontWeight: 400, color: C.textSub }}>(select all that apply)</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {SP_CATEGORIES.map(cat => {
                        const selected = profileForm.categories.includes(cat.value)
                        return (
                          <div
                            key={cat.value}
                            onClick={() => setProfileForm(cur => {
                              if (!cur) return cur
                              const next = selected
                                ? cur.categories.filter(c => c !== cat.value)
                                : [...cur.categories, cat.value]
                              return { ...cur, categories: next }
                            })}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '9px 12px', borderRadius: radius.sm, cursor: 'pointer',
                              border: `1.5px solid ${selected ? C.blue500 : C.border}`,
                              background: selected ? C.blue100 : '#fff',
                              userSelect: 'none',
                            }}
                          >
                            <div style={{
                              width: 16, height: 16, borderRadius: '4px', flexShrink: 0,
                              border: `2px solid ${selected ? C.blue500 : C.border}`,
                              background: selected ? C.blue500 : '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {selected && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: selected ? 600 : 400, color: selected ? C.blue500 : C.text, fontFamily: font.family }}>
                              {cat.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* License — read-only */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>License Number</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.sm, fontSize: '13px', fontFamily: font.family }}>
                      <svg width="15" height="15" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M7 1L2 3.5v3.5c0 2.8 2.2 5.1 5 5.5 2.8-.4 5-2.7 5-5.5V3.5L7 1z" stroke={C.success} strokeWidth="1.2" fill="none"/>
                        <path d="M4.5 7l2 2 3-3" stroke={C.success} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ fontWeight: 600, color: C.text }}>{profileForm.license || 'Not assigned'}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: C.textSub }}>Managed by GG'APP</span>
                    </div>
                  </div>

                  {/* Practice Status */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: C.text, fontFamily: font.family }}>Practice Status</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {(['open', 'closed'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setProfileForm(cur => cur ? { ...cur, status: s } : cur)}
                          style={{
                            padding: '8px 20px', borderRadius: radius.full, cursor: 'pointer',
                            fontFamily: font.family, fontSize: '12px', fontWeight: 700, textTransform: 'capitalize',
                            border: `1px solid ${profileForm.status === s ? (s === 'open' ? C.success : C.error) : C.border}`,
                            background: profileForm.status === s ? (s === 'open' ? C.successBg : '#FFF0F0') : '#fff',
                            color: profileForm.status === s ? (s === 'open' ? '#0D6B47' : C.error) : C.textSub,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                    <GGButton
                      variant="primary"
                      size="md"
                      onClick={() => void handleSaveProfile()}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                    </GGButton>
                    <GGButton variant="secondary" size="md" onClick={handleCancelEdit}>
                      Cancel
                    </GGButton>
                  </div>
                </div>
              )}
            </GGCard>

            {/* ── RIGHT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Languages */}
              <GGCard padding="24px">
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '12px', fontFamily: font.family }}>
                  Languages
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: profileForm.languages.length > 0 ? '12px' : '0' }}>
                  {profileForm.languages.length === 0 && !isEditing && (
                    <span style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>No languages added yet.</span>
                  )}
                  {profileForm.languages.map(lang => (
                    <span
                      key={lang}
                      onClick={isEditing ? () => setProfileForm(cur => cur ? { ...cur, languages: cur.languages.filter(l => l !== lang) } : cur) : undefined}
                      style={{
                        padding: '6px 12px', borderRadius: radius.full,
                        background: C.blue100, border: `1px solid ${C.blue500}33`,
                        color: C.blue500, fontSize: '12px', fontWeight: 700,
                        cursor: isEditing ? 'pointer' : 'default',
                        fontFamily: font.family,
                      }}
                    >
                      {lang}{isEditing ? ' ×' : ''}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: profileForm.languages.length > 0 ? '0' : '0' }}>
                    <GGInput
                      value={newLanguage}
                      onChange={e => setNewLanguage(e.target.value)}
                      placeholder="e.g. English, Shona..."
                    />
                    <GGButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const v = newLanguage.trim()
                        if (!v) return
                        setProfileForm(cur => cur && !cur.languages.includes(v) ? { ...cur, languages: [...cur.languages, v] } : cur)
                        setNewLanguage('')
                      }}
                    >
                      Add
                    </GGButton>
                  </div>
                )}
              </GGCard>

              {/* Services Offered */}
              <GGCard padding="24px">
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '12px', fontFamily: font.family }}>
                  Services Offered
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: profileForm.tags.length > 0 ? '12px' : '0' }}>
                  {profileForm.tags.length === 0 && !isEditing && (
                    <span style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family }}>No services added yet.</span>
                  )}
                  {profileForm.tags.map(tag => (
                    <span
                      key={tag}
                      onClick={isEditing ? () => setProfileForm(cur => cur ? { ...cur, tags: cur.tags.filter(t => t !== tag) } : cur) : undefined}
                      style={{
                        padding: '6px 12px', borderRadius: radius.full,
                        background: C.successBg, border: `1px solid ${C.success}33`,
                        color: '#0D6B47', fontSize: '12px', fontWeight: 700,
                        cursor: isEditing ? 'pointer' : 'default',
                        fontFamily: font.family,
                      }}
                    >
                      {tag}{isEditing ? ' ×' : ''}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <GGInput
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      placeholder="e.g. General Practice, Paediatrics..."
                    />
                    <GGButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const v = newTag.trim()
                        if (!v) return
                        setProfileForm(cur => cur && !cur.tags.includes(v) ? { ...cur, tags: [...cur.tags, v] } : cur)
                        setNewTag('')
                      }}
                    >
                      Add
                    </GGButton>
                  </div>
                )}
              </GGCard>

              {/* Operating Hours */}
              <GGCard padding="24px">
                <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '16px', fontFamily: font.family }}>
                  Operating Hours
                </div>

                {isEditing ? (
                  <>
                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr 72px 72px', gap: '8px', alignItems: 'center', paddingBottom: '8px', borderBottom: `2px solid ${C.border}`, marginBottom: '2px' }}>
                      <div />
                      <span style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font.family }}>Status</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font.family, textAlign: 'center' }}>Opens</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font.family, textAlign: 'center' }}>Closes</span>
                    </div>

                    {DAYS_ORDER.map((day, i) => {
                      const h = profileForm.openingHours[day] ?? { ...DEFAULT_DAY }
                      const setDay = (patch: Partial<typeof h>) =>
                        setProfileForm(cur => cur ? { ...cur, openingHours: { ...cur.openingHours, [day]: { ...h, ...patch } } } : cur)

                      return (
                        <div
                          key={day}
                          style={{
                            display: 'grid', gridTemplateColumns: '38px 1fr 72px 72px', gap: '8px',
                            alignItems: 'center', padding: '9px 0',
                            borderBottom: i < DAYS_ORDER.length - 1 ? `1px solid ${C.border}` : 'none',
                          }}
                        >
                          {/* Day name */}
                          <span style={{ fontSize: '13px', fontWeight: 700, color: C.text, fontFamily: font.family }}>{day}</span>

                          {/* Radio: Open / Closed */}
                          <div style={{ display: 'flex', gap: '14px' }}>
                            {([['open', 'Open', true], ['closed', 'Closed', false]] as const).map(([, label, isOpen]) => (
                              <div
                                key={label}
                                onClick={() => setDay({ open: isOpen, from: h.from || '08:00', to: h.to || '17:00' })}
                                style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', userSelect: 'none' }}
                              >
                                <div style={{
                                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                                  border: `2px solid ${h.open === isOpen ? (isOpen ? C.blue500 : C.textSub) : C.border}`,
                                  background: h.open === isOpen ? (isOpen ? C.blue500 : C.textSub) : '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {h.open === isOpen && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                                </div>
                                <span style={{
                                  fontSize: '12px', fontFamily: font.family,
                                  fontWeight: h.open === isOpen ? 600 : 400,
                                  color: h.open === isOpen ? (isOpen ? C.blue500 : C.text) : C.textSub,
                                }}>
                                  {label}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Opens time */}
                          <input
                            type="time"
                            value={h.from}
                            disabled={!h.open}
                            onChange={e => setDay({ from: e.target.value })}
                            style={{
                              padding: '5px 4px', border: `1px solid ${C.border}`, borderRadius: radius.sm,
                              fontSize: '11px', fontFamily: font.family, width: '100%', textAlign: 'center',
                              background: h.open ? '#fff' : C.bg,
                              color: h.open ? C.text : C.textSub,
                              opacity: h.open ? 1 : 0.45,
                              cursor: h.open ? 'pointer' : 'default',
                            }}
                          />

                          {/* Closes time */}
                          <input
                            type="time"
                            value={h.to}
                            disabled={!h.open}
                            onChange={e => setDay({ to: e.target.value })}
                            style={{
                              padding: '5px 4px', border: `1px solid ${C.border}`, borderRadius: radius.sm,
                              fontSize: '11px', fontFamily: font.family, width: '100%', textAlign: 'center',
                              background: h.open ? '#fff' : C.bg,
                              color: h.open ? C.text : C.textSub,
                              opacity: h.open ? 1 : 0.45,
                              cursor: h.open ? 'pointer' : 'default',
                            }}
                          />
                        </div>
                      )
                    })}
                  </>
                ) : (
                  /* View mode */
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {DAYS_ORDER.map((day, i) => {
                      const h = profileForm.openingHours[day] ?? { ...DEFAULT_DAY }
                      return (
                        <div
                          key={day}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '7px 0',
                            borderBottom: i < DAYS_ORDER.length - 1 ? `1px solid ${C.border}` : 'none',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 700, color: C.text, width: 32, fontFamily: font.family }}>{day}</span>
                          <span style={{ fontSize: '12px', color: h.open ? C.text : C.textSub, fontFamily: font.family }}>
                            {h.open ? `${h.from} – ${h.to}` : 'Closed'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </GGCard>
            </div>
          </div>
        )}

        {/* ── ACCOUNT TAB ── */}
        {tab === 'account' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <GGCard padding="24px">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Payout Accounts</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '3px', fontFamily: font.family }}>Where GG'APP sends your earnings after patient payments are authorised.</div>
                </div>
                <GGButton variant="primary" size="sm" onClick={() => beginEditPayout()}>+ Add Account</GGButton>
              </div>

              {settings.payoutAccounts.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', border: `1.5px dashed ${C.border}`, borderRadius: radius.sm }}>
                  <div style={{ width: 48, height: 48, borderRadius: '12px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 20h18M2 9h18M11 2L2 7h18L11 2z" stroke={C.textSub} strokeWidth="1.4" strokeLinejoin="round"/><line x1="5" y1="9" x2="5" y2="20" stroke={C.textSub} strokeWidth="1.3"/><line x1="9" y1="9" x2="9" y2="20" stroke={C.textSub} strokeWidth="1.3"/><line x1="13" y1="9" x2="13" y2="20" stroke={C.textSub} strokeWidth="1.3"/><line x1="17" y1="9" x2="17" y2="20" stroke={C.textSub} strokeWidth="1.3"/></svg>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>No payout accounts yet</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', marginBottom: '16px', fontFamily: font.family }}>Add an account to start receiving payments.</div>
                  <GGButton variant="primary" size="sm" onClick={() => beginEditPayout()}>Add Your First Account</GGButton>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {settings.payoutAccounts.map(account => {
                    const isBank = account.method === 'bank'
                    const isMpesa = account.method === 'mpesa'
                    const methodLabel = isMpesa ? 'M-Pesa' : isBank ? 'Bank Transfer' : 'Mobile Money'
                    const methodColor = isMpesa ? '#00A651' : isBank ? C.navy800 : C.blue500
                    const methodBg = isMpesa ? '#F0FBF4' : isBank ? '#F0F2F5' : C.blue100
                    const detail = isMpesa
                      ? account.mpesaType === 'paybill'
                        ? `Paybill ${account.paybillNumber ?? account.accountNumber}${account.accountNumber ? ' · Ref: ' + account.accountNumber : ''}`
                        : `Till ${account.accountNumber}`
                      : isBank
                        ? [account.bankName, account.accountNumber, account.accountName].filter(Boolean).join(' · ')
                        : `${account.accountNumber} · ${account.accountName}`
                    return (
                      <div
                        key={account.id}
                        style={{
                          padding: '16px 18px', borderRadius: radius.sm,
                          border: `1.5px solid ${account.isDefault ? C.blue500 : C.border}`,
                          background: account.isDefault ? C.blue100 + '55' : '#fff',
                          display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap',
                        }}
                      >
                        {/* Method badge */}
                        <div style={{ width: 44, height: 44, borderRadius: '10px', background: methodBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isMpesa ? (
                            <svg width="34" height="20" viewBox="0 0 38 22" fill="none">
                              <rect width="38" height="22" rx="4" fill="#00A651"/>
                              <text x="5" y="16" fill="white" fontSize="13" fontWeight="800" fontFamily="Arial,sans-serif">M</text>
                              <text x="16" y="11" fill="white" fontSize="6.5" fontWeight="700" fontFamily="Arial,sans-serif">-PESA</text>
                            </svg>
                          ) : isBank ? (
                            <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><path d="M2 20h18M2 9h18M11 2L2 7h18L11 2z" stroke={methodColor} strokeWidth="1.4" strokeLinejoin="round"/><line x1="5" y1="9" x2="5" y2="20" stroke={methodColor} strokeWidth="1.3"/><line x1="9" y1="9" x2="9" y2="20" stroke={methodColor} strokeWidth="1.3"/><line x1="13" y1="9" x2="13" y2="20" stroke={methodColor} strokeWidth="1.3"/><line x1="17" y1="9" x2="17" y2="20" stroke={methodColor} strokeWidth="1.3"/></svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><rect x="4" y="1" width="14" height="20" rx="2.5" stroke={methodColor} strokeWidth="1.4"/><rect x="8" y="17" width="6" height="1.5" rx="0.75" fill={methodColor}/><line x1="4" y1="15" x2="18" y2="15" stroke={methodColor} strokeWidth="1.2"/></svg>
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: methodColor, fontFamily: font.family }}>{methodLabel}</span>
                            {account.isDefault && <GGBadge type="info">Default</GGBadge>}
                            <span style={{ fontSize: '11px', color: C.textSub, fontFamily: font.family }}>{account.country}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          {!account.isDefault && (
                            <GGButton variant="ghost" size="sm" onClick={() => void setDefaultPayoutAccountMutation.mutateAsync(account.id)}>Set Default</GGButton>
                          )}
                          <GGButton variant="secondary" size="sm" onClick={() => beginEditPayout(account)}>Edit</GGButton>
                          <GGButton variant="danger" size="sm" onClick={() => void deletePayoutAccountMutation.mutateAsync(account.id)}>Remove</GGButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </GGCard>

            {showPayoutForm && (() => {
              const f = payoutForm
              const set = (patch: Partial<PayoutFormState>) => setPayoutForm(cur => ({ ...cur, ...patch }))
              const isKenya = f.country === 'Kenya'
              const mobileName = f.country === 'Zimbabwe' ? 'EcoCash' : f.country === 'Zambia' ? 'MTN Mobile Money' : 'Mobile Money'

              // Available methods for this country
              const methods: { id: PayoutFormState['method']; label: string; icon: React.ReactNode }[] = [
                ...(isKenya ? [{
                  id: 'mpesa' as const,
                  label: 'M-Pesa',
                  icon: (
                    <svg width="38" height="22" viewBox="0 0 38 22" fill="none">
                      <rect width="38" height="22" rx="4" fill="#00A651"/>
                      <text x="5" y="16" fill="white" fontSize="13" fontWeight="800" fontFamily="Arial,sans-serif">M</text>
                      <text x="16" y="11" fill="white" fontSize="6.5" fontWeight="700" fontFamily="Arial,sans-serif">-PESA</text>
                    </svg>
                  ),
                }] : [{
                  id: 'mobile_money' as const,
                  label: mobileName,
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <rect x="4" y="1" width="14" height="20" rx="2.5" stroke={f.method === 'mobile_money' ? C.blue500 : C.textSub} strokeWidth="1.4"/>
                      <rect x="8" y="17" width="6" height="1.5" rx="0.75" fill={f.method === 'mobile_money' ? C.blue500 : C.textSub}/>
                      <line x1="4" y1="15" x2="18" y2="15" stroke={f.method === 'mobile_money' ? C.blue500 : C.textSub} strokeWidth="1.2"/>
                    </svg>
                  ),
                }]),
                {
                  id: 'bank' as const,
                  label: 'Bank',
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M2 20h18M2 9h18M11 2L2 7h18L11 2z" stroke={f.method === 'bank' ? C.blue500 : C.textSub} strokeWidth="1.4" strokeLinejoin="round"/>
                      <line x1="5" y1="9" x2="5" y2="20" stroke={f.method === 'bank' ? C.blue500 : C.textSub} strokeWidth="1.4"/>
                      <line x1="9" y1="9" x2="9" y2="20" stroke={f.method === 'bank' ? C.blue500 : C.textSub} strokeWidth="1.4"/>
                      <line x1="13" y1="9" x2="13" y2="20" stroke={f.method === 'bank' ? C.blue500 : C.textSub} strokeWidth="1.4"/>
                      <line x1="17" y1="9" x2="17" y2="20" stroke={f.method === 'bank' ? C.blue500 : C.textSub} strokeWidth="1.4"/>
                    </svg>
                  ),
                },
              ]

              return (
                <GGCard padding="28px">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>
                      {f.id ? 'Edit Payout Account' : 'Add Payout Account'}
                    </div>
                    <span style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{f.country}</span>
                  </div>

                  {/* Method selector */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontFamily: font.family }}>Payment Method</div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {methods.map(m => (
                        <button
                          key={m.id}
                          onClick={() => set({ method: m.id })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 16px', borderRadius: radius.sm, cursor: 'pointer',
                            border: `2px solid ${f.method === m.id ? C.blue500 : C.border}`,
                            background: f.method === m.id ? C.blue100 : '#fff',
                            fontFamily: font.family, fontSize: '13px', fontWeight: f.method === m.id ? 700 : 500,
                            color: f.method === m.id ? C.blue500 : C.textSub,
                          }}
                        >
                          {m.icon}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ height: 1, background: C.border, marginBottom: '20px' }} />

                  {/* ── M-PESA FIELDS ── */}
                  {f.method === 'mpesa' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Paybill / Till radio */}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontFamily: font.family }}>Account Type</div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {([['paybill', 'Paybill'], ['till', 'Till Number']] as const).map(([val, label]) => (
                            <div
                              key={val}
                              onClick={() => set({ mpesaType: val })}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', borderRadius: radius.sm, border: `2px solid ${f.mpesaType === val ? '#00A651' : C.border}`, background: f.mpesaType === val ? '#F0FBF4' : '#fff' }}
                            >
                              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${f.mpesaType === val ? '#00A651' : C.border}`, background: f.mpesaType === val ? '#00A651' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {f.mpesaType === val && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: f.mpesaType === val ? 700 : 500, color: f.mpesaType === val ? '#00A651' : C.textSub, fontFamily: font.family }}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {f.mpesaType === 'paybill' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                          <GGInput label="Paybill Number" value={f.paybillNumber} placeholder="e.g. 247247" onChange={e => set({ paybillNumber: e.target.value })} />
                          <GGInput label="Account Number / Reference" value={f.accountNumber} placeholder="e.g. Practice name or ID" onChange={e => set({ accountNumber: e.target.value })} />
                        </div>
                      ) : (
                        <GGInput label="Till Number" value={f.accountNumber} placeholder="e.g. 5501234" onChange={e => set({ accountNumber: e.target.value })} />
                      )}
                      <GGInput label="Business / Practice Name" value={f.accountName} placeholder="e.g. City Medical Centre" onChange={e => set({ accountName: e.target.value })} />
                    </div>
                  )}

                  {/* ── BANK FIELDS ── */}
                  {f.method === 'bank' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <GGInput label="Bank Name" value={f.bankName} placeholder="e.g. Equity Bank, ABSA, FNB Zambia..." onChange={e => set({ bankName: e.target.value })} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <GGInput label="Account Number" value={f.accountNumber} placeholder="e.g. 0123456789" onChange={e => set({ accountNumber: e.target.value })} />
                        <GGInput label="Account Name" value={f.accountName} placeholder="e.g. City Medical Centre" onChange={e => set({ accountName: e.target.value })} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <GGInput label="Branch" value={f.branch} placeholder="e.g. Harare Main Branch" onChange={e => set({ branch: e.target.value })} />
                        <GGInput label="Branch Code" value={f.branchCode} placeholder="e.g. 00256" onChange={e => set({ branchCode: e.target.value })} />
                      </div>
                      <GGInput label="SWIFT / BIC Code" value={f.swiftCode} placeholder="e.g. EQBLKENA" onChange={e => set({ swiftCode: e.target.value })} />
                    </div>
                  )}

                  {/* ── MOBILE MONEY FIELDS ── */}
                  {f.method === 'mobile_money' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <GGInput label="Phone / Wallet Number" value={f.accountNumber} placeholder="e.g. 0771234567" onChange={e => set({ accountNumber: e.target.value })} />
                      <GGInput label="Account Name" value={f.accountName} placeholder="e.g. City Medical Centre" onChange={e => set({ accountName: e.target.value })} />
                    </div>
                  )}

                  <div style={{ height: 1, background: C.border, margin: '20px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: C.text, fontFamily: font.family, cursor: 'pointer' }}>
                      <input type="checkbox" checked={f.isDefault} onChange={e => set({ isDefault: e.target.checked })} />
                      Set as default payout account
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <GGButton variant="secondary" size="sm" onClick={() => setShowPayoutForm(false)}>Cancel</GGButton>
                      <GGButton variant="primary" size="sm" onClick={() => void savePayoutAccount()}>Save Account</GGButton>
                    </div>
                  </div>
                </GGCard>
              )
            })()}
          </div>
        )}

        {/* ── SECURITY TAB ── */}
        {tab === 'security' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'flex-start' }}>

            {/* Change Password */}
            <GGCard padding="28px">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: C.blue100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="3" y="8" width="12" height="9" rx="1.5" stroke={C.blue500} strokeWidth="1.4"/>
                    <path d="M6 8V5.5a3 3 0 116 0V8" stroke={C.blue500} strokeWidth="1.4" strokeLinecap="round"/>
                    <circle cx="9" cy="12.5" r="1.5" fill={C.blue500}/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Change Password</div>
                  <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family, marginTop: '2px' }}>Use a strong password of at least 8 characters.</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <GGInput label="Current Password" type="password" value={passwordForm.currentPassword} placeholder="Enter your current password" onChange={e => setPasswordForm(cur => ({ ...cur, currentPassword: e.target.value }))} />
                <div style={{ height: 1, background: C.border }} />
                <GGInput label="New Password" type="password" value={passwordForm.newPassword} placeholder="At least 8 characters" onChange={e => setPasswordForm(cur => ({ ...cur, newPassword: e.target.value }))} />
                <GGInput label="Confirm New Password" type="password" value={passwordForm.confirmPassword} placeholder="Repeat new password" onChange={e => setPasswordForm(cur => ({ ...cur, confirmPassword: e.target.value }))} />

                {/* Strength indicator */}
                {passwordForm.newPassword.length > 0 && (() => {
                  const len = passwordForm.newPassword.length
                  const strength = len < 6 ? 1 : len < 10 ? 2 : len < 14 ? 3 : 4
                  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
                  const colors = ['', C.error, '#F59E0B', C.blue500, C.success]
                  return (
                    <div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= strength ? colors[strength] : C.border, transition: 'background 0.2s' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: colors[strength], fontFamily: font.family }}>{labels[strength]}</div>
                    </div>
                  )
                })()}

                {passwordError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#FFF0F0', border: `1px solid ${C.error}33`, borderRadius: radius.sm }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={C.error} strokeWidth="1.2"/><path d="M7 4.5v3M7 9.5v.5" stroke={C.error} strokeWidth="1.3" strokeLinecap="round"/></svg>
                    <span style={{ fontSize: '12px', color: C.error, fontFamily: font.family }}>{passwordError}</span>
                  </div>
                )}

                <GGButton variant="primary" size="md" onClick={() => void handleSavePassword()} disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </GGButton>
              </div>
            </GGCard>

            {/* Security overview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Account info */}
              <GGCard padding="22px">
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '14px', fontFamily: font.family }}>Account</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[
                    { label: 'Email', value: settings.profile.email, icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke={C.blue500} strokeWidth="1.2"/><path d="M1 4.5l6 4 6-4" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/></svg> },
                    { label: 'Phone', value: (() => { const d = getCountryByName(profileForm.country)?.dial ?? ''; const p = profileForm.phone; return d && !p.startsWith(d) && p ? `${d} ${p}` : p || '—' })(), icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="1" width="8" height="12" rx="2" stroke={C.blue500} strokeWidth="1.2"/><circle cx="7" cy="10.5" r="0.8" fill={C.blue500}/></svg> },
                    { label: 'Country', value: profileForm.country, icon: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke={C.blue500} strokeWidth="1.2"/><path d="M1.5 7h11M7 1.5c-2 1.5-3 3.2-3 5.5s1 4 3 5.5M7 1.5c2 1.5 3 3.2 3 5.5s-1 4-3 5.5" stroke={C.blue500} strokeWidth="1.1" strokeLinecap="round"/></svg> },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ flexShrink: 0 }}>{row.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: font.family }}>{row.label}</div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: C.text, fontFamily: font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </GGCard>

              {/* Security tips */}
              <GGCard padding="22px" style={{ background: 'linear-gradient(135deg, #F0F9FF, #EFF6FF)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: C.navy800, marginBottom: '12px', fontFamily: font.family }}>Security Tips</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    'Use a unique password not used on other sites.',
                    'Change your password every 3–6 months.',
                    'Never share your login credentials.',
                    'Contact support if you notice unusual activity.',
                  ].map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.blue100, border: `1px solid ${C.blue500}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 4.5l2 2 3-3" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span style={{ fontSize: '12px', color: C.textSub, lineHeight: 1.5, fontFamily: font.family }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </GGCard>
            </div>
          </div>
        )}

        {/* Sign out */}
        <GGCard padding="20px" style={{ background: '#fff', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>Sign Out</div>
            <div style={{ fontSize: '11px', color: C.textSub, marginTop: '2px', fontFamily: font.family }}>Leave the provider portal and return to login.</div>
          </div>
          <GGButton variant="danger" size="sm" onClick={() => navigate(ROUTES.LOGIN)}>Sign Out</GGButton>
        </GGCard>
      </div>
    </SPLayout>
  )
}
