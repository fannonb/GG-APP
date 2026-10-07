import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGCard, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { PinInput } from '@/components/PinInput'
import { useLedgerStatus, useSetupLedgerPinMutation, useResetLedgerPinMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'

const CYAN_DEEP = '#0B7BC0'

const EXPIRY_OPTIONS: Array<{ value: number | undefined; label: string; note?: string }> = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days', note: 'Recommended' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
  { value: undefined, label: 'Never' },
]

const linkBtn: React.CSSProperties = {
  marginTop: 8,
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: 13,
  fontWeight: 700,
  color: CYAN_DEEP,
  cursor: 'pointer',
  fontFamily: font.family,
}

export function LedgerPinSetupScreen() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const statusQuery = useLedgerStatus()
  const setupPinMutation = useSetupLedgerPinMutation()
  const resetPinMutation = useResetLedgerPinMutation()
  const isChange = statusQuery.data?.hasPin ?? false
  const activeGrants = statusQuery.data?.activeGrants ?? []

  const [form, setForm] = useState({ currentPin: '', password: '', pin: '', confirmPin: '' })
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(90)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [forgotMode, setForgotMode] = useState(false)

  const setField = (key: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: '', submit: '' }))
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (isChange && !forgotMode && form.currentPin.length < 4) next.currentPin = 'Enter your current PIN'
    if (forgotMode && !form.password.trim()) next.password = 'Enter your account password'
    if (!/^\d{4,6}$/.test(form.pin)) next.pin = 'Use 4 to 6 digits'
    else if (form.confirmPin !== form.pin) next.confirmPin = 'The PINs don’t match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const saving = setupPinMutation.isPending || resetPinMutation.isPending

  const handleSubmit = async () => {
    if (!validate()) return
    try {
      if (forgotMode) {
        await resetPinMutation.mutateAsync({ password: form.password, pin: form.pin, confirmPin: form.confirmPin, expiresInDays })
      } else {
        await setupPinMutation.mutateAsync({
          currentPin: isChange ? form.currentPin : undefined,
          pin: form.pin,
          confirmPin: form.confirmPin,
          expiresInDays,
        })
      }
      navigate(ROUTES.LEDGER, { state: { pinUpdated: true } })
    } catch (error) {
      setErrors(current => ({ ...current, submit: error instanceof Error ? error.message : 'We couldn’t save your PIN. Try again.' }))
    }
  }

  return (
    <AppLayout title={isChange ? 'Change Ledger PIN' : 'Create Ledger PIN'} back>
      <div style={{ maxWidth: 520, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding={isMobile ? '20px 16px' : '26px'}>
          <p style={{ margin: 0, fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
            Give this PIN to a provider when you want them to see your history. Each time they use it, they get 24 hours, and you’ll see it in your activity.
          </p>

          {isChange && activeGrants.length > 0 && (
            <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: radius.sm, background: 'rgba(245,166,35,0.12)', color: '#92400E', fontSize: 13, lineHeight: 1.5 }}>
              Saving a new PIN ends access for {activeGrants.length === 1 ? activeGrants[0].provider.name : `${activeGrants.length} providers`}.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 22 }}>
            {isChange && !forgotMode && (
              <div>
                <PinInput label="Current PIN" value={form.currentPin} onChange={value => setField('currentPin', value)} error={errors.currentPin} autoFocus />
                <button type="button" onClick={() => { setForgotMode(true); setErrors({}); setField('currentPin', '') }} style={linkBtn}>
                  Forgot your PIN?
                </button>
              </div>
            )}

            {forgotMode && (
              <div>
                <GGInput
                  label="Account password"
                  type="password"
                  value={form.password}
                  onChange={event => setField('password', event.target.value)}
                  placeholder="The password you sign in with"
                  error={errors.password}
                />
                <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 6, lineHeight: 1.5 }}>
                  Your old PIN can’t be recovered. Confirm your password to set a new one.
                </div>
                <button type="button" onClick={() => { setForgotMode(false); setErrors({}); setField('password', '') }} style={linkBtn}>
                  I remember my PIN
                </button>
              </div>
            )}

            <PinInput
              label={isChange ? 'New PIN' : 'Choose a PIN'}
              value={form.pin}
              onChange={value => setField('pin', value)}
              hint="4 to 6 digits. Avoid your birth year or 1234."
              error={errors.pin}
              autoFocus={!isChange}
            />
            <PinInput label="Enter it again" value={form.confirmPin} onChange={value => setField('confirmPin', value)} error={errors.confirmPin} onEnter={() => void handleSubmit()} />

            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              <legend style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, padding: 0 }}>When should this PIN stop working?</legend>
              <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 10 }}>After that, you’ll need to set a new one before a provider can open your history.</div>
              <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: 8 }}>
                {EXPIRY_OPTIONS.map(option => {
                  const selected = expiresInDays === option.value
                  return (
                    <button
                      key={option.label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setExpiresInDays(option.value)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: radius.sm,
                        border: `1.5px solid ${selected ? CYAN_DEEP : C.border}`,
                        background: selected ? C.blue100 : '#fff',
                        cursor: 'pointer',
                        fontFamily: font.family,
                        textAlign: 'center',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: selected ? CYAN_DEEP : C.text }}>{option.label}</span>
                      {option.note && <span style={{ display: 'block', fontSize: 11, color: C.textSub, marginTop: 2 }}>{option.note}</span>}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            {errors.submit && (
              <div role="alert" style={{ padding: '10px 12px', borderRadius: radius.sm, background: C.errorBg, color: C.error, fontSize: 13 }}>{errors.submit}</div>
            )}

            <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              <GGButton variant="secondary" size="md" onClick={() => navigate(-1)} style={{ flex: 1 }}>
                Cancel
              </GGButton>
              <GGButton variant="primary" size="md" onClick={() => void handleSubmit()} disabled={saving || statusQuery.isLoading} style={{ flex: 1 }}>
                {saving ? 'Saving…' : isChange || forgotMode ? 'Save new PIN' : 'Create PIN'}
              </GGButton>
            </div>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
