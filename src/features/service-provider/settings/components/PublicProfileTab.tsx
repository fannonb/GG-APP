import { useRef, useState } from 'react'
import { GGBadge, GGButton, GGCard, GGInput, GGTextarea, PhonePrefixInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { LocationPicker } from '@/components/LocationPicker'
import { getCountryByName, getCountryDial, splitPhonePrefix } from '@/config/countries'
import { useResponsive } from '@/hooks/useResponsive'
import { ChipEditor } from './ChipEditor'
import { LockedField } from './LockedField'
import {
  DAYS_ORDER,
  SP_CATEGORIES,
  categoryLabel,
  formatHourRange,
  type ProfileFormState,
} from '../settings.helpers'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 15,
        fontWeight: 700,
        color: C.text,
        marginBottom: 16,
        fontFamily: font.family,
      }}
    >
      {children}
    </div>
  )
}

export function PublicProfileTab({
  profileForm,
  practiceName,
  email,
  setProfileForm,
  isEditing,
  setIsEditing,
  onCancel,
  onSave,
  saving,
  saveError,
}: {
  profileForm: ProfileFormState
  practiceName: string
  email: string
  setProfileForm: (updater: (current: ProfileFormState | null) => ProfileFormState | null) => void
  isEditing: boolean
  setIsEditing: (value: boolean) => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  saveError: string | null
}) {
  const { isMobile } = useResponsive()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [newLanguage, setNewLanguage] = useState('')
  const [newTag, setNewTag] = useState('')
  const [logoError, setLogoError] = useState<string | null>(null)
  const dial = getCountryByName(profileForm.country)?.dial ?? ''

  const patch = (partial: Partial<ProfileFormState>) =>
    setProfileForm(current => (current ? { ...current, ...partial } : current))

  const handleLogoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setLogoError(null)
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Logo must be 2 MB or smaller.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      patch({ logoUrl: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const copyMondayToWeekdays = () => {
    const monday = profileForm.openingHours.Mon ?? { open: true, from: '08:00', to: '17:00' }
    setProfileForm(current => {
      if (!current) return current
      const next = { ...current.openingHours }
      for (const day of ['Tue', 'Wed', 'Thu', 'Fri'] as const) {
        next[day] = { ...monday }
      }
      return { ...current, openingHours: next }
    })
  }

  const phoneDisplay =
    dial && profileForm.phone && !profileForm.phone.startsWith(dial)
      ? `${dial} ${profileForm.phone}`
      : profileForm.phone || '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!isEditing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <GGButton variant="primary" size="sm" onClick={() => setIsEditing(true)}>
            Edit public profile
          </GGButton>
        </div>
      )}

      <GGCard padding={isMobile ? '18px' : '24px'}>
        <SectionTitle>Practice identity</SectionTitle>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '120px 1fr',
            gap: 18,
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                width: isMobile ? 88 : 112,
                height: isMobile ? 88 : 112,
                borderRadius: 16,
                overflow: 'hidden',
                background: C.bg,
                border: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {profileForm.logoUrl ? (
                <img src={profileForm.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 12, color: C.textSub, fontFamily: font.family }}>No logo</span>
              )}
            </div>
            {isEditing && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoFile} />
                <GGButton variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()}>
                  Change logo
                </GGButton>
                {profileForm.logoUrl && (
                  <GGButton variant="ghost" size="sm" onClick={() => patch({ logoUrl: '' })}>
                    Remove
                  </GGButton>
                )}
                {logoError && <div style={{ fontSize: 12, color: C.error, fontFamily: font.family }}>{logoError}</div>}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isEditing ? (
              <GGTextarea
                label="About the practice"
                value={profileForm.about}
                onChange={event => patch({ about: event.target.value })}
                rows={4}
                placeholder="Describe your facility, specialties, and what patients can expect."
              />
            ) : (
              <div>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6, fontFamily: font.family }}>About</div>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.6, fontFamily: font.family }}>
                  {profileForm.about || 'No practice description yet.'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
          <LockedField label="Practice name" value={practiceName} />
          <LockedField label="Email" value={email} hint="Change under Security" />
          <LockedField label="Country" value={profileForm.country} hint="Fixed at registration" />
          <LockedField label="License" value={profileForm.license || '—'} />

          {isEditing ? (
            <>
              {(() => {
                const countryCode = getCountryByName(profileForm.country)?.code ?? 'ZW'
                const phoneParts = splitPhonePrefix(profileForm.phone, countryCode)
                return (
                  <PhonePrefixInput
                    label="Phone"
                    countryCode={phoneParts.countryCode}
                    onCountryChange={code => {
                      const d = getCountryDial(code)
                      patch({ phone: phoneParts.digits ? `${d} ${phoneParts.digits}` : '' })
                    }}
                    digits={phoneParts.digits}
                    onDigitsChange={digits => {
                      const d = getCountryDial(phoneParts.countryCode)
                      patch({ phone: digits ? `${d} ${digits}` : '' })
                    }}
                    placeholder="Practice contact number"
                  />
                )
              })()}
              <GGInput
                label="Established year"
                value={profileForm.establishedYear}
                onChange={event => patch({ establishedYear: event.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="e.g. 2010"
              />
              <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8, fontFamily: font.family }}>Address</div>
                <LocationPicker
                  value={profileForm.address}
                  onChange={({ address, lat, lng }) => patch({ address, lat, lng })}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6, fontFamily: font.family }}>Phone</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: font.family }}>{phoneDisplay}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6, fontFamily: font.family }}>Established</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: font.family }}>
                  {profileForm.establishedYear || '—'}
                </div>
              </div>
              <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6, fontFamily: font.family }}>Address</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: font.family }}>
                  {profileForm.address || '—'}
                </div>
              </div>
            </>
          )}
        </div>
      </GGCard>

      <GGCard padding={isMobile ? '18px' : '24px'}>
        <SectionTitle>Services & discovery</SectionTitle>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10, fontFamily: font.family }}>Categories</div>
          {isEditing ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SP_CATEGORIES.map(category => {
                const active = profileForm.categories.includes(category.value)
                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() =>
                      patch({
                        categories: active
                          ? profileForm.categories.filter(item => item !== category.value)
                          : [...profileForm.categories, category.value],
                      })
                    }
                    style={{
                      padding: '7px 12px',
                      borderRadius: radius.full,
                      border: `1.5px solid ${active ? C.blue500 : C.border}`,
                      background: active ? C.blue100 : '#fff',
                      color: active ? C.blue500 : C.textSub,
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: font.family,
                    }}
                  >
                    {category.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profileForm.categories.length === 0 ? (
                <span style={{ fontSize: 13, color: C.textSub, fontFamily: font.family }}>No categories selected.</span>
              ) : (
                profileForm.categories.map(category => (
                  <GGBadge key={category} type="info">
                    {categoryLabel(category)}
                  </GGBadge>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10, fontFamily: font.family }}>Services offered</div>
          <ChipEditor
            items={profileForm.tags}
            editing={isEditing}
            value={newTag}
            onChange={setNewTag}
            tone="green"
            placeholder="e.g. General Practice, Paediatrics..."
            onAdd={() => {
              const value = newTag.trim()
              if (!value || profileForm.tags.includes(value)) return
              patch({ tags: [...profileForm.tags, value] })
              setNewTag('')
            }}
            onRemove={item => patch({ tags: profileForm.tags.filter(tag => tag !== item) })}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10, fontFamily: font.family }}>Languages</div>
          <ChipEditor
            items={profileForm.languages}
            editing={isEditing}
            value={newLanguage}
            onChange={setNewLanguage}
            placeholder="e.g. English, Swahili..."
            onAdd={() => {
              const value = newLanguage.trim()
              if (!value || profileForm.languages.includes(value)) return
              patch({ languages: [...profileForm.languages, value] })
              setNewLanguage('')
            }}
            onRemove={item =>
              patch({ languages: profileForm.languages.filter(language => language !== item) })
            }
          />
        </div>
      </GGCard>

      <GGCard padding={isMobile ? '18px' : '24px'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: font.family }}>Availability</div>
          {isEditing && (
            <GGButton variant="ghost" size="sm" onClick={copyMondayToWeekdays}>
              Copy Monday to weekdays
            </GGButton>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10, fontFamily: font.family }}>Practice status</div>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {(['open', 'closed'] as const).map(status => {
                const active = profileForm.status === status
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => patch({ status })}
                    style={{
                      padding: '8px 14px',
                      borderRadius: radius.full,
                      border: `1.5px solid ${active ? C.blue500 : C.border}`,
                      background: active ? C.blue100 : '#fff',
                      color: active ? C.blue500 : C.textSub,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: font.family,
                      textTransform: 'capitalize',
                    }}
                  >
                    {status}
                  </button>
                )
              })}
            </div>
          ) : (
            <GGBadge type={profileForm.status === 'open' ? 'success' : 'default'}>
              {profileForm.status === 'open' ? 'Open' : 'Closed'}
            </GGBadge>
          )}
          <div style={{ fontSize: 12, color: C.textLight, marginTop: 8, fontFamily: font.family }}>
            Practice status is the quick open/closed signal patients see. Daily hours still control weekly availability.
          </div>
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DAYS_ORDER.map(day => {
              const hours = profileForm.openingHours[day] ?? { open: false, from: '08:00', to: '17:00' }
              const setDay = (partial: Partial<typeof hours>) =>
                setProfileForm(current =>
                  current
                    ? {
                        ...current,
                        openingHours: {
                          ...current.openingHours,
                          [day]: { ...hours, ...partial },
                        },
                      }
                    : current,
                )
              return (
                <div
                  key={day}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '48px 1fr' : '48px 1fr 110px 110px',
                    gap: 10,
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: font.family }}>{day}</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {([['open', true], ['closed', false]] as const).map(([label, open]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setDay({ open, from: hours.from || '08:00', to: hours.to || '17:00' })}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: 0,
                          color: hours.open === open ? C.text : C.textSub,
                          fontWeight: hours.open === open ? 700 : 500,
                          fontSize: 12,
                          fontFamily: font.family,
                          textTransform: 'capitalize',
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: `2px solid ${hours.open === open ? C.blue500 : C.border}`,
                            background: hours.open === open ? C.blue500 : '#fff',
                          }}
                        />
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="time"
                    value={hours.from}
                    disabled={!hours.open}
                    onChange={event => setDay({ from: event.target.value })}
                    style={{
                      gridColumn: isMobile ? '1 / -1' : undefined,
                      padding: '8px 10px',
                      border: `1px solid ${C.border}`,
                      borderRadius: radius.sm,
                      fontSize: 13,
                      fontFamily: font.family,
                      background: hours.open ? '#fff' : C.bg,
                      opacity: hours.open ? 1 : 0.5,
                    }}
                  />
                  <input
                    type="time"
                    value={hours.to}
                    disabled={!hours.open}
                    onChange={event => setDay({ to: event.target.value })}
                    style={{
                      gridColumn: isMobile ? '1 / -1' : undefined,
                      padding: '8px 10px',
                      border: `1px solid ${C.border}`,
                      borderRadius: radius.sm,
                      fontSize: 13,
                      fontFamily: font.family,
                      background: hours.open ? '#fff' : C.bg,
                      opacity: hours.open ? 1 : 0.5,
                    }}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {DAYS_ORDER.map((day, index) => {
              const hours = profileForm.openingHours[day] ?? { open: false, from: '08:00', to: '17:00' }
              return (
                <div
                  key={day}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: index < DAYS_ORDER.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: font.family }}>{day}</span>
                  <span style={{ fontSize: 13, color: hours.open ? C.text : C.textSub, fontFamily: font.family }}>
                    {hours.open ? formatHourRange(hours.from, hours.to) : 'Closed'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </GGCard>

      {isEditing && (
        <div
          style={{
            position: 'sticky',
            bottom: 12,
            zIndex: 5,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '14px 16px',
            borderRadius: radius.md,
            background: '#fff',
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 12, color: C.textSub, fontFamily: font.family, maxWidth: 420 }}>
            {saveError || 'Saving updates practice identity, services, and availability together.'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <GGButton variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
              Discard changes
            </GGButton>
            <GGButton variant="primary" size="sm" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save public profile'}
            </GGButton>
          </div>
        </div>
      )}
    </div>
  )
}
