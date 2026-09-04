import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { GGCard, GGButton } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { usePatientInvoice, useSubmitReviewMutation } from '@/hooks/api'
import { isMockApi } from '@/api/config'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { formatCurrency } from '@/utils/format'
import { MOCK_INVOICE, MOCK_PROVIDERS } from '@/mock/patient.mock'
import { ProviderReviewForm } from '@/features/patient/components/ProviderReviewForm'
import { generateRef } from '@/utils/refgen'

type PaymentSuccessState = {
  walletAmountPaid?: number
  offAppAmountDue?: number
  invoiceAmount?: number
}

export function PaymentSuccessScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { data: invoice } = usePatientInvoice(id)
  const submitReviewMutation = useSubmitReviewMutation()
  const inv = invoice ?? (isMockApi ? MOCK_INVOICE : undefined)
  const [fallbackAuthRef] = useState(() => generateRef('AUTH'))
  const authRef = inv?.paymentRef ?? fallbackAuthRef
  const navState = (location.state as PaymentSuccessState | null) ?? null

  const [submitted, setSubmitted] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const providerId = inv?.providerId
    ?? (isMockApi ? MOCK_PROVIDERS.find(p => p.name === inv?.provider.name)?.id : undefined)

  if (!inv) {
    return (
      <AppLayout title="Payment Complete" back notifCount={0}>
        <div style={{ maxWidth: 520, margin: '0 auto', fontFamily: font.family }}>
          <GGCard padding="28px">
            <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Payment receipt unavailable</div>
            <div style={{ fontSize: '14px', color: C.textSub, lineHeight: 1.6 }}>
              We could not load the invoice tied to this payment for your account.
            </div>
          </GGCard>
        </div>
      </AppLayout>
    )
  }

  const walletPaid = navState?.walletAmountPaid ?? inv.walletAmountPaid ?? inv.amount
  const offAppDue = navState?.offAppAmountDue ?? inv.offAppAmountDue ?? 0
  const invoiceAmount = navState?.invoiceAmount ?? inv.amount
  const isPartialPay = offAppDue > 0

  const handleSubmit = async (rating: number, text: string) => {
    if (!providerId) {
      setSubmitError('Unable to identify the provider for this invoice. Please leave your review from the provider profile instead.')
      return
    }

    setSubmitError(null)

    try {
      await submitReviewMutation.mutateAsync({
        providerId,
        invoiceId: inv.id,
        rating,
        text,
        providerName: inv.provider.name,
      })
      setSubmitted(true)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to submit review. Please try again.')
    }
  }

  const reviewDismissed = submitted || skipped
  const canReview = !inv.reviewSubmitted

  return (
    <AppLayout title="Payment Complete" back notifCount={0}>
      <div style={{ maxWidth: 520, margin: '0 auto', fontFamily: font.family }}>

        <GGCard padding="48px 40px" style={{ textAlign: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: C.successBg, margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `4px solid ${C.success}` }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none"><path d="M8 22l9 9 19-17" stroke={C.success} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>

          <div style={{ fontSize: '26px', fontWeight: 800, color: C.text, letterSpacing: '-0.04em', marginBottom: '8px' }}>
            {isPartialPay ? 'Partial Payment Confirmed' : 'Payment Confirmed'}
          </div>
          <div style={{ fontSize: '40px', fontWeight: 800, color: C.success, letterSpacing: '-0.04em', marginBottom: '4px' }}>{formatCurrency(walletPaid)}</div>
          <div style={{ fontSize: '14px', color: C.textSub, marginBottom: '32px' }}>
            {isPartialPay
              ? `Paid from your GG'APP allocation. Please settle the remaining ${formatCurrency(offAppDue)} directly with ${inv.provider.name}.`
              : 'Your provider has been notified. This payment is recorded on your balance.'}
          </div>

          <div style={{ background: C.bg, borderRadius: radius.sm, border: `1px solid ${C.border}`, padding: '20px', marginBottom: '28px', textAlign: 'left' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>Payment Receipt</div>
            {[
              { label: 'Payment Ref', val: authRef },
              { label: 'Invoice',           val: inv.id },
              { label: 'Service Provider',  val: inv.provider.name },
              { label: 'Invoice Total',     val: formatCurrency(invoiceAmount) },
              { label: 'Paid via GG\'APP',  val: formatCurrency(walletPaid) },
              ...(isPartialPay
                ? [{ label: 'Off-app due', val: formatCurrency(offAppDue) }]
                : []),
              { label: 'Payment Method',    val: "GG'APP healthcare credit" },
              { label: 'Status',            val: isPartialPay ? 'Partially Paid' : 'Paid' },
              { label: 'Timestamp',         val: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '12px', color: C.textSub, fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>{item.val}</span>
              </div>
            ))}
          </div>

          {isPartialPay && (
            <div style={{ padding: '12px 14px', background: C.warningBg, borderRadius: radius.sm, marginBottom: '16px', fontSize: '12px', color: '#8A4D00', lineHeight: 1.6, textAlign: 'left' }}>
              <strong>Off-app balance:</strong> Settle {formatCurrency(offAppDue)} with {inv.provider.name} outside the app (cash, M-Pesa, card, etc.).
            </div>
          )}

          <div style={{ padding: '12px 14px', background: `rgba(13,30,66,0.04)`, borderRadius: radius.sm, marginBottom: '24px', fontSize: '12px', color: C.textSub, lineHeight: 1.6, textAlign: 'left' }}>
            <strong style={{ color: C.text }}>Security:</strong> This payment was recorded securely. Your PIN was verified locally.
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <GGButton variant="secondary" size="md" onClick={() => navigate('/app/transactions')} style={{ flex: 1 }}>View History</GGButton>
            <GGButton variant="primary"   size="md" onClick={() => navigate('/app/dashboard')}    style={{ flex: 1 }}>Dashboard</GGButton>
          </div>
        </GGCard>

        {canReview && !reviewDismissed ? (
          <GGCard padding="28px 32px" style={{ marginTop: '16px' }}>
            <ProviderReviewForm
              providerName={inv.provider.name}
              isSubmitting={submitReviewMutation.isPending}
              error={submitError}
              onSubmit={handleSubmit}
              onSkip={() => setSkipped(true)}
            />
          </GGCard>
        ) : submitted ? (
          <GGCard padding="28px 32px" style={{ marginTop: '16px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: C.successBg, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.success}` }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5 11-10" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Thank you for your review!</div>
            <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>
              Your feedback helps other patients make informed choices on GG'APP.
            </div>
          </GGCard>
        ) : null}

      </div>
    </AppLayout>
  )
}
