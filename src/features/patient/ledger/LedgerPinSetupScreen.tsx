import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGCard, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useLedgerStatus, useSetupLedgerPinMutation, useResetLedgerPinMutation } from '@/hooks/api'
import { ROUTES } from '@/router/routes'

export function LedgerPinSetupScreen() {
  const navigate = useNavigate()
  const statusQuery = useLedgerStatus()
  const setupPinMutation = useSetupLedgerPinMutation()
  const resetPinMutation = useResetLedgerPinMutation()
  const isReset = statusQuery.data?.hasPin ?? false

  const [form, setForm] = useState({ currentPin: '', password: '', pin: '', confirmPin: '' })
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [forgotMode, setForgotMode] = useState(false)

  const title = isReset ? 'Change Ledger PIN' : 'Create Ledger PIN'

  const setField = <K extends keyof typeof form>(key: K, value: string) =>
    setForm(current => ({ ...current, [key]: value }))

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (isReset && !forgotMode && form.currentPin.length < 4) {
      nextErrors.currentPin = 'Enter your current ledger PIN'
    }
    if (forgotMode && !form.password.trim()) {
      nextErrors.password = 'Confirm your account password to reset the ledger PIN'
    }
    if (!/^\d{4,6}$/.test(form.pin)) {
      nextErrors.pin = 'PIN must be 4 to 6 digits'
    }
    if (form.confirmPin !== form.pin) {
      nextErrors.confirmPin = 'PIN confirmation does not match'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const saving = setupPinMutation.isPending || resetPinMutation.isPending

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      if (forgotMode) {
        await resetPinMutation.mutateAsync({
          password: form.password,
          pin: form.pin,
          confirmPin: form.confirmPin,
          expiresInDays,
        })
      } else {
        await setupPinMutation.mutateAsync({
          currentPin: isReset ? form.currentPin : undefined,
          pin: form.pin,
          confirmPin: form.confirmPin,
          expiresInDays,
        })
      }
      navigate(ROUTES.LEDGER, { state: { pinUpdated: true } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save your ledger PIN.'
      setErrors(current => ({ ...current, submit: message }))
    }
  }

  return (
    <AppLayout title={title} back>
      <div style={{ maxWidth: 560, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="28px">
          <div style={{ padding: '14px 16px', background: C.blue100, borderRadius: radius.sm, border: '1px solid rgba(74,173,223,0.2)', fontSize: '13px', color: '#1A5D8A', lineHeight: 1.6, marginBottom: '18px' }}>
            <strong>You are in control:</strong> only share this PIN with providers you want to
            view your treatment and diagnosis history. Access lasts 24 hours per unlock and is
            always logged.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isReset && !forgotMode && (
              <div>
                <GGInput
                  label="Current PIN"
                  type="password"
                  value={form.currentPin}
                  onChange={event => setField('currentPin', event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter current PIN"
                  required
                />
                {errors.currentPin && <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: C.error }}>{errors.currentPin}</span>}
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true)
                    setErrors({})
                    setField('currentPin', '')
                  }}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.blue500,
                    cursor: 'pointer',
                    fontFamily: font.family,
                  }}
                >
                  Forgot PIN?
                </button>
              </div>
            )}

            {forgotMode && (
              <div>
                <div style={{ padding: '12px 14px', background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, fontSize: 13, color: C.textSub, lineHeight: 1.6, marginBottom: 12 }}>
                  The old PIN cannot be recovered. Confirm your GG'APP account password, then choose a new Ledger PIN. This revokes any current provider access.
                </div>
                <GGInput
                  label="Account password"
                  type="password"
                  value={form.password}
                  onChange={event => setField('password', event.target.value)}
                  placeholder="Enter your account password"
                  required
                />
                {errors.password && <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: C.error }}>{errors.password}</span>}
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false)
                    setErrors({})
                    setField('password', '')
                  }}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: C.blue500,
                    cursor: 'pointer',
                    fontFamily: font.family,
                  }}
                >
                  I remember my PIN
                </button>
              </div>
            )}

            <div>
              <GGInput
                label={isReset ? 'New Ledger PIN' : 'Ledger PIN'}
                type="password"
                value={form.pin}
                onChange={event => setField('pin', event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 4–6 digit PIN"
                required
              />
              {errors.pin && <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: C.error }}>{errors.pin}</span>}
            </div>

            <div>
              <GGInput
                label="Confirm PIN"
                type="password"
                value={form.confirmPin}
                onChange={event => setField('confirmPin', event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Re-enter PIN"
                required
              />
              {errors.confirmPin && <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: C.error }}>{errors.confirmPin}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.navy800, marginBottom: 6 }}>
                PIN expiry (optional)
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { value: undefined, label: 'No expiry' },
                  { value: 30, label: '30 days' },
                  { value: 90, label: '90 days' },
                  { value: 180, label: '180 days' },
                  { value: 365, label: '1 year' },
                ].map(option => {
                  const active = expiresInDays === option.value
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setExpiresInDays(option.value)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: radius.sm,
                        border: `1.5px solid ${active ? C.navy800 : C.border}`,
                        background: active ? C.navy800 : '#fff',
                        color: active ? '#fff' : C.textSub,
                        fontSize: 12.5,
                        fontWeight: 700,
                        fontFamily: font.family,
                        cursor: 'pointer',
                      }}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <div style={{ fontSize: 12, color: C.textLight, marginTop: 6 }}>
                After expiry, providers can no longer unlock with this PIN until you create a new one.
              </div>
            </div>

            {errors.submit && (
              <div style={{ fontSize: '12px', color: C.error, fontWeight: 600 }}>{errors.submit}</div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <GGButton variant="secondary" size="md" onClick={() => navigate(ROUTES.LEDGER)} style={{ flex: 1 }}>
                Cancel
              </GGButton>
              <GGButton
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={saving || statusQuery.isLoading}
                style={{ flex: 1 }}
              >
                {saving ? 'Saving PIN...' : forgotMode || isReset ? 'Update PIN' : 'Create PIN'}
              </GGButton>
            </div>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
