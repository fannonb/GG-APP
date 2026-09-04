import { useEffect, useState } from 'react'
import { GGButton, GGCard, GGInput, PhonePrefixInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { getCountryByName, getCountryDial, splitPhonePrefix } from '@/config/countries'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function EditIcon({ color = C.blue500 }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11.3 2.3a1.4 1.4 0 012 2L5.2 12.3 2 13l.7-3.2L11.3 2.3z"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 3.6l2.4 2.4" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function SecurityTab({
  email,
  phone,
  country,
  onSaveAccountAccess,
  onChangePassword,
  onSignOut,
  accountAccessPending,
  passwordPending,
  logoutPending,
}: {
  email: string
  phone: string
  country: string
  onSaveAccountAccess: (payload: { email: string; phone: string }) => Promise<void>
  onChangePassword: (payload: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) => Promise<void>
  onSignOut: () => void
  accountAccessPending: boolean
  passwordPending: boolean
  logoutPending: boolean
}) {
  const { isMobile } = useResponsive()
  const [isEditingAccess, setIsEditingAccess] = useState(false)
  const [accessForm, setAccessForm] = useState({ email, phone })
  const [accessError, setAccessError] = useState<string | null>(null)
  const [accessSuccess, setAccessSuccess] = useState<string | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditingAccess) {
      setAccessForm({ email, phone })
    }
  }, [email, phone, isEditingAccess])

  const dial = getCountryByName(country)?.dial ?? ''
  const phoneDisplay =
    dial && phone && !phone.startsWith(dial) ? `${dial} ${phone}` : phone || '—'
  const accessDirty =
    accessForm.email.trim() !== email.trim() || accessForm.phone.trim() !== phone.trim()

  const strength =
    passwordForm.newPassword.length === 0
      ? 0
      : passwordForm.newPassword.length < 6
        ? 1
        : passwordForm.newPassword.length < 10
          ? 2
          : passwordForm.newPassword.length < 14
            ? 3
            : 4
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = ['', C.error, '#F59E0B', C.blue500, C.success]

  const beginEditAccess = () => {
    setAccessError(null)
    setAccessSuccess(null)
    setAccessForm({ email, phone })
    setIsEditingAccess(true)
  }

  const cancelEditAccess = () => {
    setAccessForm({ email, phone })
    setAccessError(null)
    setIsEditingAccess(false)
  }

  const handleSaveAccess = async () => {
    setAccessError(null)
    setAccessSuccess(null)
    const nextEmail = accessForm.email.trim().toLowerCase()
    const nextPhone = accessForm.phone.trim()
    if (!nextEmail || !isValidEmail(nextEmail)) {
      setAccessError('Enter a valid email address.')
      return
    }
    if (!nextPhone || nextPhone.replace(/\D/g, '').length < 7) {
      setAccessError('Enter a valid phone number.')
      return
    }
    try {
      await onSaveAccountAccess({ email: nextEmail, phone: nextPhone })
      setIsEditingAccess(false)
      setAccessSuccess('Contact details updated.')
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : 'Unable to update contact details.')
    }
  }

  const handleSubmit = async () => {
    setPasswordError(null)
    setPasswordSuccess(null)
    if (
      !passwordForm.currentPassword.trim() ||
      !passwordForm.newPassword.trim() ||
      !passwordForm.confirmPassword.trim()
    ) {
      setPasswordError('Please fill in all password fields.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.')
      return
    }
    try {
      await onChangePassword(passwordForm)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordSuccess('Password updated successfully.')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Unable to update password.')
    }
  }

  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <GGCard padding={isMobile ? '18px' : '22px'}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: font.family }}>
              Account access
            </div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, fontFamily: font.family }}>
              {isEditingAccess
                ? 'Update the email and phone used to sign in and receive account notices.'
                : 'Email and phone used to sign in and receive account notices.'}
            </div>
          </div>
          {!isEditingAccess && (
            <button
              type="button"
              onClick={beginEditAccess}
              aria-label="Edit account access"
              title="Edit"
              style={{
                width: 36,
                height: 36,
                borderRadius: radius.sm,
                border: `1px solid ${C.border}`,
                background: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <EditIcon />
            </button>
          )}
        </div>

        {isEditingAccess ? (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <GGInput
              label="Email"
              type="email"
              value={accessForm.email}
              placeholder="you@example.com"
              onChange={event => {
                setAccessSuccess(null)
                setAccessForm(current => ({ ...current, email: event.target.value }))
              }}
            />
            {(() => {
              const countryCode = getCountryByName(country)?.code ?? 'ZW'
              const phoneParts = splitPhonePrefix(accessForm.phone, countryCode)
              return (
                <PhonePrefixInput
                  label="Phone"
                  countryCode={phoneParts.countryCode}
                  onCountryChange={code => {
                    setAccessSuccess(null)
                    const d = getCountryDial(code)
                    setAccessForm(current => ({
                      ...current,
                      phone: phoneParts.digits ? `${d} ${phoneParts.digits}` : '',
                    }))
                  }}
                  digits={phoneParts.digits}
                  onDigitsChange={digits => {
                    setAccessSuccess(null)
                    const d = getCountryDial(phoneParts.countryCode)
                    setAccessForm(current => ({
                      ...current,
                      phone: digits ? `${d} ${digits}` : '',
                    }))
                  }}
                  placeholder="Practice contact number"
                />
              )
            })()}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: C.textSub,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 4,
                  fontFamily: font.family,
                }}
              >
                Country
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: font.family }}>
                {country || '—'}
              </div>
              <div style={{ fontSize: 11, color: C.textLight, marginTop: 4, fontFamily: font.family }}>
                Fixed at registration
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            {[
              { label: 'Email', value: email || '—' },
              { label: 'Phone', value: phoneDisplay },
              { label: 'Country', value: country || '—' },
            ].map(row => (
              <div key={row.label}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.textSub,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 4,
                    fontFamily: font.family,
                  }}
                >
                  {row.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: font.family }}>
                  {row.value}
                </div>
                {row.label === 'Country' && (
                  <div style={{ fontSize: 11, color: C.textLight, marginTop: 4, fontFamily: font.family }}>
                    Fixed at registration
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {accessError && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              background: '#FFF0F0',
              border: `1px solid ${C.error}33`,
              borderRadius: radius.sm,
              fontSize: 12,
              color: C.error,
              fontFamily: font.family,
            }}
          >
            {accessError}
          </div>
        )}
        {accessSuccess && !isEditingAccess && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              background: C.successBg,
              border: `1px solid ${C.success}33`,
              borderRadius: radius.sm,
              fontSize: 12,
              color: C.success,
              fontFamily: font.family,
            }}
          >
            {accessSuccess}
          </div>
        )}

        {isEditingAccess && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <GGButton
              variant="primary"
              size="md"
              onClick={() => void handleSaveAccess()}
              disabled={accountAccessPending || !accessDirty}
            >
              {accountAccessPending ? 'Saving...' : 'Save contact details'}
            </GGButton>
            <GGButton variant="secondary" size="md" onClick={cancelEditAccess} disabled={accountAccessPending}>
              Cancel
            </GGButton>
          </div>
        )}
      </GGCard>

      <GGCard padding={isMobile ? '18px' : '28px'}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: font.family }}>Change password</div>
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 4, fontFamily: font.family }}>
            Use a strong password of at least 8 characters that you do not reuse elsewhere.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <GGInput
            label="Current password"
            type="password"
            value={passwordForm.currentPassword}
            placeholder="Enter your current password"
            onChange={event => setPasswordForm(current => ({ ...current, currentPassword: event.target.value }))}
          />
          <div style={{ height: 1, background: C.border }} />
          <GGInput
            label="New password"
            type="password"
            value={passwordForm.newPassword}
            placeholder="At least 8 characters"
            onChange={event => setPasswordForm(current => ({ ...current, newPassword: event.target.value }))}
          />
          <GGInput
            label="Confirm new password"
            type="password"
            value={passwordForm.confirmPassword}
            placeholder="Repeat new password"
            onChange={event => setPasswordForm(current => ({ ...current, confirmPassword: event.target.value }))}
          />

          {passwordForm.newPassword.length > 0 && (
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: level <= strength ? strengthColors[strength] : C.border,
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: strengthColors[strength], fontFamily: font.family }}>
                {strengthLabels[strength]}
              </div>
            </div>
          )}

          {passwordError && (
            <div
              style={{
                padding: '10px 12px',
                background: '#FFF0F0',
                border: `1px solid ${C.error}33`,
                borderRadius: radius.sm,
                fontSize: 12,
                color: C.error,
                fontFamily: font.family,
              }}
            >
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div
              style={{
                padding: '10px 12px',
                background: C.successBg,
                border: `1px solid ${C.success}33`,
                borderRadius: radius.sm,
                fontSize: 12,
                color: C.success,
                fontFamily: font.family,
              }}
            >
              {passwordSuccess}
            </div>
          )}

          <GGButton variant="primary" size="md" onClick={() => void handleSubmit()} disabled={passwordPending}>
            {passwordPending ? 'Updating...' : 'Update password'}
          </GGButton>
        </div>
      </GGCard>

      <GGCard padding={isMobile ? '18px' : '22px'} style={{ border: `1px solid ${C.error}33` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: font.family }}>Danger zone</div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 3, fontFamily: font.family }}>
              Sign out of the provider portal on this device.
            </div>
          </div>
          <GGButton variant="danger" size="sm" onClick={onSignOut} disabled={logoutPending}>
            {logoutPending ? 'Signing out...' : 'Sign out'}
          </GGButton>
        </div>
      </GGCard>
    </div>
  )
}
