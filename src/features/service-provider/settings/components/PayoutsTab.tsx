import { useEffect, useState } from 'react'
import { GGBadge, GGButton, GGCard, GGInput } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import type { ProviderPayoutAccount } from '@/api/types'
import { useResponsive } from '@/hooks/useResponsive'
import { MpesaLogoIcon } from './MpesaLogoIcon'
import {
  EMPTY_PAYOUT_FORM,
  mobileMoneyLabel,
  payoutDetailLine,
  validatePayoutForm,
  type PayoutFormState,
} from '../settings.helpers'

function MethodIcon({ method, active = false }: { method: PayoutFormState['method']; active?: boolean }) {
  if (method === 'mpesa') return <MpesaLogoIcon height={22} />
  const color = active ? C.blue500 : C.textSub
  if (method === 'bank') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M2 20h18M2 9h18M11 2L2 7h18L11 2z" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
        <line x1="5" y1="9" x2="5" y2="20" stroke={color} strokeWidth="1.4" />
        <line x1="9" y1="9" x2="9" y2="20" stroke={color} strokeWidth="1.4" />
        <line x1="13" y1="9" x2="13" y2="20" stroke={color} strokeWidth="1.4" />
        <line x1="17" y1="9" x2="17" y2="20" stroke={color} strokeWidth="1.4" />
      </svg>
    )
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="1" width="14" height="20" rx="2.5" stroke={color} strokeWidth="1.4" />
      <rect x="8" y="17" width="6" height="1.5" rx="0.75" fill={color} />
      <line x1="4" y1="15" x2="18" y2="15" stroke={color} strokeWidth="1.2" />
    </svg>
  )
}

function methodLabel(account: ProviderPayoutAccount) {
  if (account.method === 'mpesa') {
    return account.mpesaType === 'till' ? 'M-Pesa Till' : 'M-Pesa Paybill'
  }
  if (account.method === 'bank') return 'Bank Transfer'
  return mobileMoneyLabel(account.country)
}

function formFromAccount(account: ProviderPayoutAccount | undefined, country: string): PayoutFormState {
  if (!account) {
    return {
      ...EMPTY_PAYOUT_FORM,
      country,
      method: country === 'Kenya' ? 'mpesa' : 'bank',
      isDefault: true,
    }
  }
  return {
    ...EMPTY_PAYOUT_FORM,
    id: account.id,
    method: account.method,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
    country: account.country || country,
    isDefault: true,
    mpesaType: account.mpesaType ?? 'paybill',
    paybillNumber: account.paybillNumber ?? '',
    bankName: account.bankName ?? '',
    branch: account.branch ?? '',
    branchCode: account.branchCode ?? '',
    swiftCode: account.swiftCode ?? '',
  }
}

export function PayoutsTab({
  accounts,
  country,
  onSave,
  saving,
}: {
  accounts: ProviderPayoutAccount[]
  country: string
  onSave: (form: PayoutFormState) => Promise<void>
  saving: boolean
}) {
  const { isMobile } = useResponsive()
  const activeAccount = accounts[0]
  const [isEditing, setIsEditing] = useState(!activeAccount)
  const [form, setForm] = useState<PayoutFormState>(() => formFromAccount(activeAccount, country))
  const [formError, setFormError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing) {
      setForm(formFromAccount(accounts[0], country))
    }
  }, [accounts, country, isEditing])

  useEffect(() => {
    if (!activeAccount) setIsEditing(true)
  }, [activeAccount])

  const set = (patch: Partial<PayoutFormState>) => setForm(current => ({ ...current, ...patch }))

  const methods: { id: PayoutFormState['method']; label: string }[] =
    country === 'Kenya'
      ? [
          { id: 'mpesa', label: 'M-Pesa' },
          { id: 'bank', label: 'Bank' },
        ]
      : [
          { id: 'mobile_money', label: mobileMoneyLabel(country) },
          { id: 'bank', label: 'Bank' },
        ]

  const beginEdit = () => {
    setForm(formFromAccount(activeAccount, country))
    setFormError(null)
    setSavedMessage(null)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    if (!activeAccount) return
    setForm(formFromAccount(activeAccount, country))
    setFormError(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    const error = validatePayoutForm(form)
    if (error) {
      setFormError(error)
      return
    }
    setFormError(null)
    try {
      await onSave({ ...form, isDefault: true })
      setIsEditing(false)
      setSavedMessage('Payment account saved. Payouts will go to this destination.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save payment account.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <GGCard padding={isMobile ? '18px' : '24px'}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: isEditing ? 20 : 0,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: font.family }}>
              Payment account
            </div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 3, fontFamily: font.family }}>
              Only one active payout destination is allowed. Switch method anytime — the selected
              account is where GG&apos;APP sends earnings.
            </div>
          </div>
          {activeAccount && !isEditing && (
            <GGButton variant="primary" size="sm" onClick={beginEdit}>
              Change payment account
            </GGButton>
          )}
        </div>

        {!isEditing && activeAccount && (
          <div
            style={{
              marginTop: 16,
              padding: '16px 18px',
              borderRadius: radius.sm,
              border: `1.5px solid ${C.blue500}`,
              background: `${C.blue100}55`,
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: activeAccount.method === 'mpesa' ? 'transparent' : C.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MethodIcon method={activeAccount.method} active />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: font.family }}>
                  {methodLabel(activeAccount)}
                </span>
                <GGBadge type="info">Active</GGBadge>
                <span style={{ fontSize: 11, color: C.textSub, fontFamily: font.family }}>
                  {activeAccount.country}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.textSub, fontFamily: font.family }}>
                {payoutDetailLine(activeAccount)}
              </div>
              <div style={{ fontSize: 12, color: C.textLight, marginTop: 2, fontFamily: font.family }}>
                {activeAccount.accountName}
              </div>
            </div>
          </div>
        )}

        {savedMessage && !isEditing && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: radius.sm,
              background: C.successBg,
              border: `1px solid ${C.success}33`,
              fontSize: 12,
              color: C.success,
              fontFamily: font.family,
            }}
          >
            {savedMessage}
          </div>
        )}

        {isEditing && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.textSub,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 10,
                  fontFamily: font.family,
                }}
              >
                Payment method
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {methods.map(method => {
                  const active = form.method === method.id
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => set({ method: method.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 16px',
                        borderRadius: radius.sm,
                        cursor: 'pointer',
                        border: `2px solid ${active ? C.blue500 : C.border}`,
                        background: active ? C.blue100 : '#fff',
                        fontFamily: font.family,
                        fontSize: 13,
                        fontWeight: active ? 700 : 500,
                        color: active ? C.blue500 : C.textSub,
                      }}
                    >
                      <MethodIcon method={method.id} active={active} />
                      {method.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ height: 1, background: C.border, marginBottom: 20 }} />

            {form.method === 'mpesa' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {([['paybill', 'Paybill'], ['till', 'Till Number']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set({ mpesaType: value })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        padding: '10px 16px',
                        borderRadius: radius.sm,
                        border: `2px solid ${form.mpesaType === value ? '#00A651' : C.border}`,
                        background: form.mpesaType === value ? '#F0FBF4' : '#fff',
                        color: form.mpesaType === value ? '#00A651' : C.textSub,
                        fontSize: 13,
                        fontWeight: form.mpesaType === value ? 700 : 500,
                        fontFamily: font.family,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {form.mpesaType === 'paybill' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                    <GGInput
                      label="Paybill Number"
                      value={form.paybillNumber}
                      placeholder="e.g. 247247"
                      onChange={event => set({ paybillNumber: event.target.value })}
                    />
                    <GGInput
                      label="Account Number / Reference"
                      value={form.accountNumber}
                      placeholder="e.g. Practice name or ID"
                      onChange={event => set({ accountNumber: event.target.value })}
                    />
                  </div>
                ) : (
                  <GGInput
                    label="Till Number"
                    value={form.accountNumber}
                    placeholder="e.g. 5501234"
                    onChange={event => set({ accountNumber: event.target.value })}
                  />
                )}
                <GGInput
                  label="Business / Practice Name"
                  value={form.accountName}
                  placeholder="e.g. City Medical Centre"
                  onChange={event => set({ accountName: event.target.value })}
                />
              </div>
            )}

            {form.method === 'bank' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <GGInput
                  label="Bank Name"
                  value={form.bankName}
                  placeholder="e.g. Equity Bank, ABSA, FNB Zambia..."
                  onChange={event => set({ bankName: event.target.value })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                  <GGInput
                    label="Account Number"
                    value={form.accountNumber}
                    placeholder="e.g. 0123456789"
                    onChange={event => set({ accountNumber: event.target.value })}
                  />
                  <GGInput
                    label="Account Name"
                    value={form.accountName}
                    placeholder="e.g. City Medical Centre"
                    onChange={event => set({ accountName: event.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                  <GGInput
                    label="Branch"
                    value={form.branch}
                    placeholder="e.g. Harare Main Branch"
                    onChange={event => set({ branch: event.target.value })}
                  />
                  <GGInput
                    label="Branch Code"
                    value={form.branchCode}
                    placeholder="e.g. 00256"
                    onChange={event => set({ branchCode: event.target.value })}
                  />
                </div>
                <GGInput
                  label="SWIFT / BIC Code"
                  value={form.swiftCode}
                  placeholder="e.g. EQBLKENA"
                  onChange={event => set({ swiftCode: event.target.value })}
                />
              </div>
            )}

            {form.method === 'mobile_money' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <GGInput
                  label="Phone / Wallet Number"
                  value={form.accountNumber}
                  placeholder="e.g. 0771234567"
                  onChange={event => set({ accountNumber: event.target.value })}
                />
                <GGInput
                  label="Account Name"
                  value={form.accountName}
                  placeholder="e.g. City Medical Centre"
                  onChange={event => set({ accountName: event.target.value })}
                />
              </div>
            )}

            {formError && (
              <div
                style={{
                  marginTop: 16,
                  padding: '10px 12px',
                  borderRadius: radius.sm,
                  background: '#FFF0F0',
                  border: `1px solid ${C.error}33`,
                  fontSize: 12,
                  color: C.error,
                  fontFamily: font.family,
                }}
              >
                {formError}
              </div>
            )}

            <div
              style={{
                marginTop: 20,
                padding: '10px 12px',
                borderRadius: radius.sm,
                background: C.bg,
                border: `1px solid ${C.border}`,
                fontSize: 12,
                color: C.textSub,
                lineHeight: 1.5,
                fontFamily: font.family,
              }}
            >
              Saving replaces any previous payout destination. Only this {form.method === 'mpesa'
                ? form.mpesaType === 'till'
                  ? 'M-Pesa till'
                  : 'M-Pesa paybill'
                : form.method === 'bank'
                  ? 'bank account'
                  : 'mobile money wallet'}{' '}
              will receive payments.
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {activeAccount && (
                <GGButton variant="secondary" size="sm" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </GGButton>
              )}
              <GGButton variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save payment account'}
              </GGButton>
            </div>
          </>
        )}
      </GGCard>
    </div>
  )
}
