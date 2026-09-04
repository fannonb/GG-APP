import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { useSPInvoices } from '@/hooks/api'
import { SPLayout } from '@/layouts/sp/SPLayout'
import { route, ROUTES } from '@/router/routes'
import type { SPInvoice } from '@/types/invoice.types'
import { formatCurrency, formatDate } from '@/utils/format'

function InvoiceStatusChip({ status }: { status: SPInvoice['status'] }) {
  const config = {
    paid: { bg: C.successBg, color: C.success },
    authorized: { bg: C.successBg, color: C.success },
    pending: { bg: C.warningBg, color: '#B45309' },
    rejected: { bg: C.errorBg, color: C.error },
  }[status]

  const label =
    status === 'pending'
      ? 'Pending Auth'
      : status === 'authorized' || status === 'paid'
        ? 'Paid'
        : status === 'rejected'
          ? 'Rejected'
          : status

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: radius.full,
        background: config.bg,
        color: config.color,
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        fontFamily: font.family,
      }}
    >
      {label}
    </span>
  )
}

export function SPInvoicesScreen() {
  const navigate = useNavigate()
  const { data: invoices = [], isLoading } = useSPInvoices()
  const [filter, setFilter] = useState<'all' | SPInvoice['status']>('all')

  const filteredInvoices = useMemo(
    () =>
      filter === 'all' ? invoices : invoices.filter(invoice => invoice.status === filter),
    [invoices, filter],
  )

  const stats = useMemo(
    () => ({
      total: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
      collected: invoices
        .filter(invoice => invoice.status === 'paid' || invoice.status === 'authorized')
        .reduce((sum, invoice) => sum + invoice.amount, 0),
    }),
    [invoices],
  )

  if (isLoading) {
    return (
      <SPLayout title="Invoices">
        <GGCard padding="24px">
          <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
            Loading invoices...
          </div>
        </GGCard>
      </SPLayout>
    )
  }

  return (
    <SPLayout title="Invoices">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Total Billed', value: formatCurrency(stats.total), color: C.text },
            { label: 'Collected', value: formatCurrency(stats.collected), color: C.success },
          ].map(item => (
            <GGCard key={item.label} padding="18px">
              <div style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: font.family }}>
                {item.label}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: item.color, marginTop: '8px', letterSpacing: '-0.04em', fontFamily: font.family }}>
                {item.value}
              </div>
            </GGCard>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['all', 'pending', 'authorized', 'paid', 'rejected'] as const).map(option => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                style={{
                  padding: '7px 14px',
                  borderRadius: radius.full,
                  border: `1px solid ${filter === option ? C.blue500 : C.border}`,
                  background: filter === option ? C.blue100 : '#fff',
                  color: filter === option ? C.blue500 : C.textSub,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: font.family,
                  textTransform: 'capitalize',
                }}
              >
                {option === 'all' ? 'All' : option}
              </button>
            ))}
          </div>

          <GGButton variant="success" size="md" onClick={() => navigate(ROUTES.SP_INVOICE_UPLOAD)}>
            Upload Invoice
          </GGButton>
        </div>

        {filteredInvoices.length === 0 ? (
          <GGCard padding="24px">
            <div style={{ fontSize: '14px', color: C.textSub, fontFamily: font.family }}>
              {invoices.length === 0 ? 'No invoices yet.' : 'No invoices found for this filter.'}
            </div>
          </GGCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredInvoices.map(invoice => (
              <GGCard
                key={invoice.id}
                padding="20px"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(route.spInvoice(invoice.id), { state: { invoice } })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, fontFamily: font.family }}>
                        {invoice.id}
                      </div>
                      <InvoiceStatusChip status={invoice.status} />
                      {invoice.isPrescription && (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: radius.full,
                            background: C.blue100,
                            color: '#1A5D8A',
                            fontSize: '11px',
                            fontWeight: 700,
                            fontFamily: font.family,
                          }}
                        >
                          Prescription
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: C.textSub, marginTop: '6px', fontFamily: font.family }}>
                      {invoice.patient} · {formatDate(invoice.issueDate)}
                    </div>
                    {invoice.isPrescription ? (
                      <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px', fontFamily: font.family }}>
                        Prescription order
                      </div>
                    ) : invoice.appointmentId ? (
                      <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px', fontFamily: font.family }}>
                        Appointment {invoice.appointmentId}
                      </div>
                    ) : null}
                    <div style={{ fontSize: '12px', color: C.textSub, marginTop: '6px', lineHeight: 1.6, fontFamily: font.family }}>
                      {invoice.services.map(service => service.name).join(', ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, fontFamily: font.family }}>
                      {formatCurrency(invoice.amount)}
                    </div>
                    <div style={{ fontSize: '11px', color: C.textSub, marginTop: '6px', fontFamily: font.family }}>
                      Submitted {formatDate(invoice.submittedAt)}
                    </div>
                  </div>
                </div>
              </GGCard>
            ))}
          </div>
        )}
      </div>
    </SPLayout>
  )
}
