import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font } from '@/design-system/tokens'
import {
  useChangeSPPasswordMutation,
  useCreateSPPayoutAccountMutation,
  useLogoutMutation,
  useSPSettings,
  useUpdateSPPayoutAccountMutation,
  useUpdateSPProfileMutation,
} from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { ProviderIdentityStrip } from './components/ProviderIdentityStrip'
import { PublicProfileTab } from './components/PublicProfileTab'
import { PayoutsTab } from './components/PayoutsTab'
import { SecurityTab } from './components/SecurityTab'
import { SettingsTabBar } from './components/SettingsTabBar'
import {
  formFromSettings,
  profilesEqual,
  type PayoutFormState,
  type ProfileFormState,
  type SettingsTabId,
} from './settings.helpers'

function normalizeTab(value: unknown): SettingsTabId {
  if (value === 'payouts' || value === 'account') return 'payouts'
  if (value === 'security') return 'security'
  return 'profile'
}

export function SPSettingsScreen() {
  const location = useLocation()
  const { data: settings, isLoading } = useSPSettings()
  const updateProfileMutation = useUpdateSPProfileMutation()
  const changePasswordMutation = useChangeSPPasswordMutation()
  const createPayoutAccountMutation = useCreateSPPayoutAccountMutation()
  const updatePayoutAccountMutation = useUpdateSPPayoutAccountMutation()
  const logoutMutation = useLogoutMutation()

  const [tab, setTab] = useState<SettingsTabId>(() =>
    normalizeTab((location.state as { tab?: string } | null)?.tab),
  )
  const [isEditing, setIsEditing] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [profileForm, setProfileForm] = useState<ProfileFormState | null>(null)
  const [baselineForm, setBaselineForm] = useState<ProfileFormState | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!settings) return
    const next = formFromSettings(settings)
    setProfileForm(next)
    if (!isEditing) setBaselineForm(next)
  }, [settings, isEditing])

  useEffect(() => {
    const nextTab = normalizeTab((location.state as { tab?: string } | null)?.tab)
    setTab(nextTab)
  }, [location.state])

  const flashSaved = (message: string) => {
    setSavedMessage(message)
    window.setTimeout(() => setSavedMessage(null), 2500)
  }

  const hasUnsavedChanges =
    isEditing && profileForm && baselineForm ? !profilesEqual(profileForm, baselineForm) : false

  const requestTabChange = (next: SettingsTabId) => {
    if (next === tab) return
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved profile changes. Discard them and switch tabs?')
      if (!confirmed) return
      if (settings) {
        const restored = formFromSettings(settings)
        setProfileForm(restored)
        setBaselineForm(restored)
      }
      setIsEditing(false)
      setProfileError(null)
    } else if (next !== 'profile') {
      setIsEditing(false)
    }
    setTab(next)
  }

  const handleCancelEdit = () => {
    if (settings) {
      const restored = formFromSettings(settings)
      setProfileForm(restored)
      setBaselineForm(restored)
    }
    setProfileError(null)
    setIsEditing(false)
  }

  const handleSaveProfile = async () => {
    if (!profileForm) return
    setProfileError(null)
    try {
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
      setBaselineForm(profileForm)
      setIsEditing(false)
      flashSaved('Public profile saved.')
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to save profile changes.')
    }
  }

  const handleSavePayout = async (form: PayoutFormState) => {
    const payload = {
      method: form.method,
      accountNumber: form.accountNumber.trim(),
      accountName: form.accountName.trim(),
      country: form.country,
      isDefault: true,
      mpesaType: form.method === 'mpesa' ? form.mpesaType : undefined,
      paybillNumber:
        form.method === 'mpesa' && form.mpesaType === 'paybill' ? form.paybillNumber.trim() : undefined,
      bankName: form.method === 'bank' ? form.bankName.trim() : undefined,
      branch: form.method === 'bank' ? form.branch.trim() : undefined,
      branchCode: form.method === 'bank' ? form.branchCode.trim() : undefined,
      swiftCode: form.method === 'bank' ? form.swiftCode.trim() : undefined,
    }

    // Always upsert as the sole active destination (backend replaces any previous accounts).
    const existingId = settings?.payoutAccounts[0]?.id
    if (existingId) {
      await updatePayoutAccountMutation.mutateAsync({ id: existingId, payload })
      flashSaved('Payment account updated.')
      return
    }

    await createPayoutAccountMutation.mutateAsync(payload)
    flashSaved('Payment account saved.')
  }

  if (isLoading || !settings || !profileForm) {
    return (
      <SPLayout title="Settings">
        <GGCard padding="24px">
          <div style={{ fontSize: 14, color: C.textSub, fontFamily: font.family }}>Loading settings...</div>
        </GGCard>
      </SPLayout>
    )
  }

  return (
    <SPLayout title="Settings">
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {savedMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: C.successBg,
              border: `1px solid ${C.success}33`,
              color: C.success,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: font.family,
            }}
          >
            {savedMessage}
          </div>
        )}

        <ProviderIdentityStrip settings={settings} profileForm={profileForm} />
        <SettingsTabBar tab={tab} onChange={requestTabChange} />

        {tab === 'profile' && (
          <PublicProfileTab
            profileForm={profileForm}
            practiceName={settings.profile.name}
            email={settings.profile.email}
            setProfileForm={setProfileForm}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            onCancel={handleCancelEdit}
            onSave={() => void handleSaveProfile()}
            saving={updateProfileMutation.isPending}
            saveError={profileError}
          />
        )}

        {tab === 'payouts' && (
          <PayoutsTab
            accounts={settings.payoutAccounts}
            country={settings.profile.country}
            saving={createPayoutAccountMutation.isPending || updatePayoutAccountMutation.isPending}
            onSave={handleSavePayout}
          />
        )}

        {tab === 'security' && (
          <SecurityTab
            email={settings.profile.email}
            phone={profileForm.phone}
            country={profileForm.country}
            accountAccessPending={updateProfileMutation.isPending}
            passwordPending={changePasswordMutation.isPending}
            logoutPending={logoutMutation.isPending}
            onSaveAccountAccess={async payload => {
              await updateProfileMutation.mutateAsync({
                email: payload.email,
                phone: payload.phone,
              })
              setProfileForm(current => (current ? { ...current, phone: payload.phone } : current))
              setBaselineForm(current => (current ? { ...current, phone: payload.phone } : current))
              flashSaved('Contact details updated.')
            }}
            onChangePassword={async payload => {
              await changePasswordMutation.mutateAsync({
                currentPassword: payload.currentPassword,
                newPassword: payload.newPassword,
              })
              flashSaved('Password updated.')
            }}
            onSignOut={() => logoutMutation.mutate()}
          />
        )}
      </div>
    </SPLayout>
  )
}
