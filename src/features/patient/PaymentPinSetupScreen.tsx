import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GGButton, GGCard, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { useSetupPaymentPinMutation } from '@/hooks/api'
import { useUserStore } from '@/store/user.store'
import { ROUTES } from '@/router/routes'

type PaymentPinSetupLocationState = {
  returnTo?: string
  tab?: string
}

export function PaymentPinSetupScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useUserStore(s => s.user)
  const setupPinMutation = useSetupPaymentPinMutation()
  const locationState = (location.state ?? null) as PaymentPinSetupLocationState | null
  const returnTo = locationState?.returnTo ?? ROUTES.PROFILE
  const returnTab = locationState?.tab ?? 'security'
  const isReset = user.hasPaymentPin

  const [form, setForm] = useState({
    currentPin: '',
    pin: '',
    confirmPin: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const title = isReset ? 'Reset Payment PIN' : 'Set Up Payment PIN'
  const subtitle = isReset
    ? 'Update the PIN you enter three times to authorize payments'
    : 'Create the PIN required before you can authorize payments'

  const hintText = useMemo(
    () =>
      isReset
        ? 'You will enter this same PIN three times whenever you authorize an invoice.'
        : 'During invoice authorization you will enter this same 4-digit PIN three times to confirm payment.',
    [isReset],
  )

  const setField = <K extends keyof typeof form>(key: K, value: string) =>
    setForm(current => ({ ...current, [key]: value }))

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (isReset && form.currentPin.length !== 4) {
      nextErrors.currentPin = 'Enter your current 4-digit PIN'
    }
    if (!/^\d{4}$/.test(form.pin)) {
      nextErrors.pin = 'PIN must be exactly 4 digits'
    }
    if (form.confirmPin !== form.pin) {
      nextErrors.confirmPin = 'PIN confirmation does not match'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      await setupPinMutation.mutateAsync({
        currentPin: isReset ? form.currentPin : undefined,
        pin: form.pin,
        confirmPin: form.confirmPin,
      })

      navigate(returnTo, {
        state: {
          tab: returnTab,
          pinUpdated: true,
        },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save your payment PIN.'
      setErrors(current => ({
        ...current,
        submit: message,
      }))
    }
  }

  return (
    <AppLayout title={title} subtitle={subtitle} back notifCount={1}>
      <div style={{ maxWidth: 560, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="28px">
          <div style={{ padding: '14px 16px', background: C.blue100, borderRadius: radius.sm, border: `1px solid rgba(74,173,223,0.2)`, fontSize: '13px', color: '#1A5D8A', lineHeight: 1.6, marginBottom: '18px' }}>
            <strong>Triple confirmation:</strong> {hintText}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {isReset && (
              <div>
                <GGInput
                  label="Current PIN"
                  type="password"
                  value={form.currentPin}
                  onChange={event => setField('currentPin', event.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter current 4-digit PIN"
                  required
                />
                {errors.currentPin && <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: C.error }}>{errors.currentPin}</span>}
              </div>
            )}

            <div>
              <GGInput
                label={isReset ? 'New PIN' : 'Payment PIN'}
                type="password"
                value={form.pin}
                onChange={event => setField('pin', event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter 4-digit PIN"
                required
              />
              {errors.pin && <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: C.error }}>{errors.pin}</span>}
            </div>

            <div>
              <GGInput
                label="Confirm PIN"
                type="password"
                value={form.confirmPin}
                onChange={event => setField('confirmPin', event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Re-enter 4-digit PIN"
                required
              />
              {errors.confirmPin && <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: C.error }}>{errors.confirmPin}</span>}
            </div>

            {errors.submit && (
              <div style={{ fontSize: '12px', color: C.error, fontWeight: 600 }}>
                {errors.submit}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <GGButton
                variant="secondary"
                size="md"
                onClick={() => navigate(returnTo, { state: { tab: returnTab } })}
                style={{ flex: 1 }}
              >
                Cancel
              </GGButton>
              <GGButton
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={setupPinMutation.isPending}
                style={{ flex: 1 }}
              >
                {setupPinMutation.isPending
                  ? (isReset ? 'Updating PIN...' : 'Saving PIN...')
                  : (isReset ? 'Update PIN' : 'Create PIN')}
              </GGButton>
            </div>
          </div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
