import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGAvatar, GGCard } from '@/design-system'
import { SimplePager } from '@/components/SimplePager'
import { C, font, radius } from '@/design-system/tokens'
import { PaymentAlertBanner } from '@/components/PaymentAlertBanner'
import { InvoiceTable, type InvoiceTableColumn } from '@/components/InvoiceTable'
import { useSPDashboard, useSPNotifications, useSPPayments } from '@/hooks/api'
import { useMarkSPNotificationReadMutation } from '@/hooks/api/useSPMutations'
import { useResponsive } from '@/hooks/useResponsive'
import { SPLayout } from '@/layouts/sp/SPLayout'
import type { Payment, PaymentType } from '@/types/invoice.types'
import { formatCurrency, formatDate } from '@/utils/format'
import { getUnreadPaymentBannerItems } from '@/utils/payment-notifications'
import { useSPCurrency } from '@/hooks/useCurrency'

// One distinct pill per payment type, built from existing tokens.
const PAYMENT_TYPE_PILL: Record<PaymentType, { label: string; background: string; color: string; border: string }> = {
  prescription: { label: 'Prescription', background: C.blue100, color: '#1A5D8A', border: C.blue300 },
  appointment: { label: 'Appointment', background: C.navy800, color: '#fff', border: C.navy800 },
}

const PAYMENT_COLUMNS = (currency: string): InvoiceTableColumn<Payment>[] => [
  {
    key: 'patient',
    header: 'Patient',
    render: payment => (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <GGAvatar name={payment.patient} size={34} />
        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{payment.patient}</span>
      </div>
    ),
  },
  { key: 'ref', header: 'Reference', render: payment => <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{payment.ref}</span> },
  { key: 'date', header: 'Date', render: payment => <span style={{ whiteSpace: 'nowrap', color: C.textSub }}>{formatDate(payment.date)}</span> },
  {
    key: 'type',
    header: 'Type',
    render: payment => {
      const type = payment.type ?? (payment.isPrescription ? 'prescription' : 'appointment')
      const pill = PAYMENT_TYPE_PILL[type]
      return (
        <div>
          <span style={{ padding: '3px 8px', borderRadius: radius.full, background: pill.background, color: pill.color, border: `1px solid ${pill.border}`, fontSize: '11px', fontWeight: 700, fontFamily: font.family, whiteSpace: 'nowrap' }}>
            {pill.label}
          </span>
          {payment.service && (
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', whiteSpace: 'nowrap' }}>
              {payment.service}
            </div>
          )}
        </div>
      )
    },
  },
  { key: 'amount', header: 'Amount', align: 'right', render: payment => <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{formatCurrency(payment.amount, currency)}</span> },
]

export function SPPaymentsScreen() {
  const currency = useSPCurrency()
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const { data: payments = [], isLoading: paymentsLoading } = useSPPayments()
  const { data: dashboard } = useSPDashboard()
  const { data: notifications = [] } = useSPNotifications()
  const markNotificationRead = useMarkSPNotificationReadMutation()
  const [page, setPage] = useState(1)
  const pageSize = 10
  const paymentItems = getUnreadPaymentBannerItems(notifications)

  const paymentSummary = useMemo(
    () => ({
      totalReceived: payments.reduce((sum, payment) => sum + payment.amount, 0),
      paymentCount: payments.length,
    }),
    [payments],
  )

  const totalPages = Math.max(1, Math.ceil(payments.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const visiblePayments = payments.slice(start, start + pageSize)

  if (paymentsLoading) {
    return (
      <SPLayout title="Payments">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading payments...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  return (
    <SPLayout title="Payments">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {paymentItems.length > 0 && (
          <PaymentAlertBanner
            audience="sp"
            items={paymentItems}
            onAction={items => {
              items.forEach(item => markNotificationRead.mutate(item.id))
              const target = items[0]?.screen
              if (target?.startsWith('/sp/')) {
                navigate(target)
              }
            }}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { label: 'All-time earnings', value: formatCurrency(dashboard?.sp.totalEarnings ?? paymentSummary.totalReceived, currency), helper: 'Authorized lifetime', color: C.text },
            { label: 'Total Received', value: formatCurrency(paymentSummary.totalReceived, currency), helper: 'Disbursement records', color: C.blue500 },
            { label: 'Unique patients', value: String(dashboard?.sp.totalPatients ?? 0), helper: 'Patients served', color: C.text },
            { label: 'Payment Records', value: String(paymentSummary.paymentCount), helper: 'All disbursements', color: C.text },
          ].map(item => (
            <GGCard key={item.label} padding="18px">
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: font.family }}>
                {item.label}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: item.color, marginTop: '8px', letterSpacing: '-0.02em', fontFamily: font.family }}>
                {item.value}
              </div>
              <div style={{ fontSize: '12px', color: C.textSub, marginTop: '6px', fontFamily: font.family }}>
                {item.helper}
              </div>
            </GGCard>
          ))}
        </div>

        <GGCard padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, fontSize: '16px', fontWeight: 700, color: C.text, fontFamily: font.family }}>
            All Payments
          </div>

          {visiblePayments.length === 0 ? (
            <div style={{ padding: '24px 22px', fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
              No payment records yet.
            </div>
          ) : isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {visiblePayments.map(payment => (
                <div key={payment.id} style={{ padding: '16px 22px', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <GGAvatar name={payment.patient} size={34} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, fontFamily: font.family }}>
                          {payment.patient}
                        </div>
                        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px', fontFamily: font.family }}>
                          {payment.ref} · {formatDate(payment.date)}
                          {payment.isPrescription ? ' · Prescription' : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, fontFamily: font.family }}>
                        {formatCurrency(payment.amount, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <InvoiceTable
              label="Payments"
              columns={PAYMENT_COLUMNS(currency)}
              rows={visiblePayments}
              getKey={payment => payment.id}
            />
          )}

          <SimplePager page={currentPage} total={payments.length} pageSize={pageSize} onPageChange={setPage} />
        </GGCard>
      </div>
    </SPLayout>
  )
}
