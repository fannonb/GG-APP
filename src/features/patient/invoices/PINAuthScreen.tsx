import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { StepIndicator } from '@/design-system'
import { formatCurrency } from '@/utils/format'
import { usePatientInvoice, useAuthorizePaymentMutation } from '@/hooks/api'
import { isMockApi } from '@/api/config'
import { MOCK_INVOICE } from '@/mock/patient.mock'
import { useUserStore } from '@/store/user.store'
import { route, ROUTES } from '@/router/routes'

const PIN_LENGTH = 4

const KEYS = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['del','0','ok'],
]

export function PINAuthScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const user = useUserStore(s => s.user)
  const { data: invoice } = usePatientInvoice(id)
  const inv = invoice ?? (isMockApi ? MOCK_INVOICE : undefined)
  const authorizeMutation = useAuthorizePaymentMutation()

  const [step, setStep] = useState(1)
  const [pin, setPin] = useState('')
  const [lockTimer, setLockTimer] = useState(0)
  const locked = lockTimer > 0
  const [attempts, setAttempts] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)

  useEffect(() => {
    if (lockTimer <= 0) return
    const t = setTimeout(() => {
      setLockTimer(prev => {
        const next = prev - 1
        if (next <= 0) {
          setAttempts(0)
          setPin('')
        }
        return Math.max(0, next)
      })
    }, 1000)
    return () => clearTimeout(t)
  }, [lockTimer])

  if (!user.hasPaymentPin) {
    return (
      <AppLayout title="Payment Authorization" back notifCount={0}>
        <div style={{ maxWidth: 460, margin: '0 auto', fontFamily: font.family }}>
          <GGCard padding="28px">
            <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Set up your payment PIN first</div>
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '18px' }}>
              You need a payment PIN before you can authorize this invoice.
            </div>
            <button
              onClick={() => navigate(ROUTES.SECURITY_PIN, {
                state: {
                  returnTo: `/app/invoices/${id}/pay`,
                },
              })}
              style={{ width: '100%', padding: '12px 16px', borderRadius: radius.sm, border: 'none', background: C.navy800, color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}
            >
              Set Up Payment PIN
            </button>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  if (!inv) {
    return (
      <AppLayout title="Payment Authorization" back notifCount={0}>
        <div style={{ maxWidth: 460, margin: '0 auto', fontFamily: font.family }}>
          <GGCard padding="28px">
            <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Payment authorization unavailable</div>
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6 }}>
              We could not load the invoice for this payment request.
            </div>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  if (inv.status === 'rejected') {
    return (
      <AppLayout title="Payment Authorization" back notifCount={0}>
        <div style={{ maxWidth: 460, margin: '0 auto', fontFamily: font.family }}>
          <GGCard padding="28px">
            <div style={{ fontSize: '18px', fontWeight: 700, color: C.error, marginBottom: '8px' }}>Authorization blocked</div>
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '18px' }}>
              This invoice was rejected. The provider must correct and resubmit it before you can authorize payment.
            </div>
            <button
              onClick={() => navigate(route.patientInvoice(id ?? ''))}
              style={{ width: '100%', padding: '12px 16px', borderRadius: radius.sm, border: 'none', background: C.navy800, color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: font.family }}
            >
              Back to Invoice Review
            </button>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  const walletPayAmount = Math.min(Math.max(0, user.creditAvailable), inv.amount)
  const offAppDue = Math.max(0, Number((inv.amount - walletPayAmount).toFixed(2)))
  const isPartialPay = walletPayAmount > 0 && offAppDue > 0

  const handleConfirm = async (entered: string) => {
    if (!id) return
    setPinError(null)

    try {
      const result = await authorizeMutation.mutateAsync({
        invoiceId: id,
        pin: entered,
        step,
      })

      if (!result.success) {
        if (result.lockedUntil) {
          setLockTimer(Math.max(0, Math.floor((result.lockedUntil - Date.now()) / 1000)))
          setPin('')
          return
        }
        const next = attempts + 1
        setAttempts(next)
        setPinError(result.message ?? 'Incorrect PIN. Please try again.')
        setPin('')
        return
      }

      setAttempts(0)
      if (step < 3) {
        setTimeout(() => { setStep(s => s + 1); setPin('') }, 400)
      } else {
        setProcessing(true)
        setTimeout(() => {
          setProcessing(false)
          navigate(`/app/invoices/${id}/success`, {
            state: {
              walletAmountPaid: result.walletAmountPaid ?? walletPayAmount,
              offAppAmountDue: result.offAppAmountDue ?? offAppDue,
              invoiceAmount: result.invoiceAmount ?? inv.amount,
            },
          })
        }, 2200)
      }
    } catch {
      setPinError('Unable to authorize payment. Please try again.')
      setPin('')
    }
  }

  const handleKey = (key: string) => {
    if (locked || processing) return
    if (key === 'del') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= PIN_LENGTH) return
    const next = pin + key
    setPin(next)
    if (next.length === PIN_LENGTH) setTimeout(() => handleConfirm(next), 300)
  }

  const stepMessages: Record<number, { title: string; sub: string }> = {
    1: { title: 'Enter your PIN',  sub: 'Enter your 4-digit payment PIN (1 of 3)' },
    2: { title: 'Confirm your PIN', sub: 'Enter the same PIN again (2 of 3)' },
    3: {
      title: 'Final confirmation',
      sub: isPartialPay
        ? `Enter your PIN one last time to authorize ${formatCurrency(walletPayAmount)} from your allocation. Settle ${formatCurrency(offAppDue)} off-app with ${inv.provider.name}.`
        : `Enter your PIN one last time to authorize ${formatCurrency(walletPayAmount)} to ${inv.provider.name}. This action is irreversible.`,
    },
  }

  const sm = stepMessages[step]

  return (
    <AppLayout title="Payment Authorization" back notifCount={0}>
      <div style={{ maxWidth: 460, margin: '0 auto', fontFamily: font.family }}>
        <GGCard padding="40px">
          {processing ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.successBg, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${C.success}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'gg-spin 0.8s linear infinite' }} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Processing Payment...</div>
              <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>Recording authorization and notifying both parties. Please wait.</div>
              <style>{`@keyframes gg-spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : locked ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.errorBg, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="7" y="15" width="18" height="14" rx="3" stroke={C.error} strokeWidth="1.8"/><path d="M10 15v-4a6 6 0 0112 0v4" stroke={C.error} strokeWidth="1.8" strokeLinecap="round"/><circle cx="16" cy="22" r="2" fill={C.error}/></svg>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: C.error, marginBottom: '8px' }}>Session Locked</div>
              <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6, marginBottom: '16px' }}>Too many incorrect PIN entries. Please try again in:</div>
              <div style={{ fontSize: '40px', fontWeight: 800, color: C.error, letterSpacing: '-0.03em', marginBottom: '8px' }}>
                {String(Math.floor(lockTimer / 60)).padStart(2, '0')}:{String(lockTimer % 60).padStart(2, '0')}
              </div>
              <div style={{ fontSize: '12px', color: C.textSub }}>The platform admin has been notified of this event.</div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <StepIndicator steps={['1st entry', '2nd entry', '3rd entry']} current={step - 1} />
              </div>

              <div style={{ padding: '14px 18px', background: step === 3 ? C.warningBg : C.bg, borderRadius: radius.sm, border: `1px solid ${step === 3 ? 'rgba(245,166,35,0.25)' : C.border}`, marginBottom: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px' }}>
                  {isPartialPay ? 'Authorizing In-App Portion' : 'Authorizing Payment'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em' }}>{formatCurrency(walletPayAmount)}</div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>to {inv.provider.name}</div>
                {isPartialPay && (
                  <div style={{ fontSize: '12px', color: '#8A4D00', marginTop: '6px', fontWeight: 600 }}>
                    Invoice {formatCurrency(inv.amount)} · Off-app remainder {formatCurrency(offAppDue)}
                  </div>
                )}
                {step === 3 && <div style={{ fontSize: '12px', color: '#8A4D00', marginTop: '6px', fontWeight: 600 }}>Warning: This action is irreversible</div>}
              </div>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '17px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>{sm.title}</div>
                <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.5 }}>{sm.sub}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginBottom: '8px' }}>
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: i < pin.length ? (attempts > 0 ? C.error : C.navy800) : C.border, transition: 'all 0.15s ease', transform: i < pin.length ? 'scale(1.1)' : 'scale(1)' }} />
                ))}
              </div>

              {(attempts > 0 || pinError) && (
                <div style={{ textAlign: 'center', fontSize: '12px', color: C.error, fontWeight: 600, marginBottom: '8px' }}>
                  {pinError ?? `Incorrect PIN - ${3 - attempts} ${attempts === 2 ? 'attempt' : 'attempts'} remaining`}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {KEYS.flat().map((k, idx) => {
                  const isOk = k === 'ok'
                  const isDel = k === 'del'
                  return (
                    <button key={idx} onClick={() => handleKey(k)}
                      style={{ height: 60, borderRadius: radius.sm, border: `1.5px solid ${C.border}`, background: isOk ? (pin.length === PIN_LENGTH ? C.success : C.border) : isDel ? C.bg : '#fff', color: isOk ? '#fff' : isDel ? C.textSub : C.text, fontSize: isOk || isDel ? '18px' : '22px', fontWeight: 700, cursor: 'pointer', fontFamily: font.family, transition: 'all 0.12s ease', boxShadow: isOk && pin.length === PIN_LENGTH ? `0 4px 12px rgba(34,201,138,0.3)` : 'none' }}>
                      {isDel ? '⌫' : isOk ? '✓' : k}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </GGCard>
      </div>
    </AppLayout>
  )
}
