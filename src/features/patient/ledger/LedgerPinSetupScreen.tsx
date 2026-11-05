import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGCard, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { PinInput } from '@/components/PinInput'
import { useLedgerStatus, useSetupLedgerPinMutation, useResetLedgerPinMutation } from '@/hooks/api'
import { useResponsive } from '@/hooks/useResponsive'
import { ROUTES } from '@/router/routes'
import { PinChangeSummary } from './components/PinChangeSummary'
import { PinChecklist, PinMatchStatus } from './components/PinChecks'
import { PinExpiryPicker } from './components/PinExpiryPicker'
import { pinExpiryDate } from './components/pinExpiry'
import { isLedgerPinAcceptable } from './components/pinRules'

const CYAN_DEEP = '#0B7BC0'

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

function Step({ number, title, subtitle, children }: { number: number; title: string; subtitle?: string; children: ReactNode }) {
  const { isMobile } = useResponsive()
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: C.blue100,
            color: CYAN_DEEP,
            fontSize: 13,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {number}
        </span>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>{title}</h2>
      </div>
      {subtitle && (
        <p style={{ margin: isMobile ? '6px 0 0' : '6px 0 0 40px', fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>{subtitle}</p>
      )}
      <div style={{ marginTop: 14, paddingLeft: isMobile ? 0 : 40 }}>{children}</div>
    </div>
  )
}

export function LedgerPinSetupScreen() {
  const navigate = useNavigate()
  const { isMobile, isDesktop } = useResponsive()
  const statusQuery = useLedgerStatus()
  const setupPinMutation = useSetupLedgerPinMutation()
  const resetPinMutation = useResetLedgerPinMutation()
  const isChange = statusQuery.data?.hasPin ?? false
  const activeGrants = statusQuery.data?.activeGrants ?? []

  const [form, setForm] = useState({ currentPin: '', password: '', pin: '', confirmPin: '' })
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(90)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [forgotMode, setForgotMode] = useState(false)
  const [now] = useState(() => Date.now())

  const setField = (key: keyof typeof form, value: string) => {
    setForm(current => ({ ...current, [key]: value }))
    setErrors(current => ({ ...current, [key]: '', submit: '' }))
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (isChange && !forgotMode && form.currentPin.length < 4) next.currentPin = 'Enter your current PIN'
    if (forgotMode && !form.password.trim()) next.password = 'Enter your account password'
    if (!/^\d{4,6}$/.test(form.pin)) next.pin = 'Use 4 to 6 digits'
    else if (!isLedgerPinAcceptable(form.pin)) next.pin = 'Pick a PIN that’s harder to guess'
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

  const mode: 'create' | 'change' | 'reset' = forgotMode ? 'reset' : isChange ? 'change' : 'create'
  const expiresOn = pinExpiryDate(expiresInDays, now)
  const activeProviders = activeGrants.map(grant => grant.provider.name)

  const actions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
  )

  const stepDivider =<div aria-hidden="true" style={{ height: 1, background: C.border, margin: '24px 0' }} />

  const steps = (
    <>
      {isChange && (
        <Step
          number={1}
          title="Confirm it’s you"
          subtitle={forgotMode ? 'Use your account password since your PIN can’t be recovered.' : 'Enter the PIN you use now.'}
        >
          {forgotMode ? (
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
          ) : (
            <div>
              <PinInput label="Current PIN" value={form.currentPin} onChange={value => setField('currentPin', value)} error={errors.currentPin} autoFocus />
              <button type="button" onClick={() => { setForgotMode(true); setErrors({}); setField('currentPin', '') }} style={linkBtn}>
                Forgot your PIN?
              </button>
            </div>
          )}
        </Step>
      )}

      {isChange && stepDivider}

      <Step
        number={isChange ? 2 : 1}
        title={isChange ? 'Choose your new PIN' : 'Choose a PIN'}
        subtitle="You’ll give this to a provider when you want them to see your history."
      >
        <PinInput
          label={isChange ? 'New PIN' : 'Choose a PIN'}
          value={form.pin}
          onChange={value => setField('pin', value)}
          error={errors.pin}
          autoFocus={!isChange}
        />
        <PinChecklist pin={form.pin} />
        <div style={{ marginTop: 18 }}>
          <PinInput
            label="Enter it again"
            value={form.confirmPin}
            onChange={value => setField('confirmPin', value)}
            error={errors.confirmPin}
            onEnter={() => void handleSubmit()}
          />
          {!errors.confirmPin && <PinMatchStatus pin={form.pin} confirmPin={form.confirmPin} />}
        </div>
      </Step>

      {stepDivider}

      <Step number={isChange ? 3 : 2} title="Pick when it expires">
        <PinExpiryPicker value={expiresInDays} onChange={setExpiresInDays} now={now} />
      </Step>
    </>
  )

  const formCard = (
    <GGCard padding={isMobile ? '20px 16px' : '28px 30px'}>
      <p style={{ margin: 0, fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
        Give this PIN to a provider when you want them to see your history. Each time they use it, they get 24 hours, and you’ll see it in your activity.
      </p>

      <div aria-hidden="true" style={{ height: 1, background: C.border, margin: '20px 0 24px' }} />

      {steps}

      {isDesktop && (
        <>
          <div aria-hidden="true" style={{ height: 1, background: C.border, margin: '24px 0 20px' }} />
          {actions}
        </>
      )}
    </GGCard>
  )

  return (
    <AppLayout title={isChange ? 'Change Ledger PIN' : 'Create Ledger PIN'} back>
      <div style={{ maxWidth: isDesktop ? 1040 : 560, margin: '0 auto', fontFamily: font.family }}>
        {isDesktop ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(300px, 1fr)', gap: 16, alignItems: 'start' }}>
            {formCard}
            <div style={{ position: 'sticky', top: 16 }}>
              <PinChangeSummary mode={mode} activeProviders={activeProviders} expiresOn={expiresOn} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formCard}
            <PinChangeSummary mode={mode} activeProviders={activeProviders} expiresOn={expiresOn} />
            {actions}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
