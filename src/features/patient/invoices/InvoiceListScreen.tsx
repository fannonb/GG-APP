import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isMockApi } from '@/api/config'
import { GGCard, GGButton, GGBadge } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { usePatientInvoices } from '@/hooks/api'
import { AppLayout } from '@/layouts/patient/AppLayout'
import { route } from '@/router/routes'
import { formatCurrency, formatDate } from '@/utils/format'
import { useAuthStore } from '@/store/auth.store'
import type { BadgeType } from '@/design-system/GGBadge'
import { usePatientCurrency } from '@/hooks/useCurrency'
import { Pager, usePaged } from '@/components/paging'
import { InvoiceTable, type InvoiceTableColumn } from '@/components/InvoiceTable'
import { useResponsive } from '@/hooks/useResponsive'

type InvoiceFilter = 'All' | 'Pending' | 'Paid'
const FILTERS: InvoiceFilter[] = ['All', 'Pending', 'Paid']
const isPaidStatus = (status: string) => status === 'paid' || status === 'authorized'

const statusMap: Record<string, { type: BadgeType; label: string }> = {
  pending_auth: { type: 'warning', label: 'Awaiting Auth' },
  authorized: { type: 'success', label: 'Paid' },
  paid: { type: 'success', label: 'Paid' },
  rejected: { type: 'error', label: 'Rejected' },
  admin_review: { type: 'pending', label: 'Under Review' },
}

export function InvoiceListScreen() {
  const currency = usePatientCurrency()
  const navigate = useNavigate()
  const { userMode } = useAuthStore()
  const { data: invoiceData } = usePatientInvoices()
  const isNew = isMockApi && userMode === 'new'
  const invoices = isNew
    ? []
    : (invoiceData ?? []).map(invoice => ({
        id: invoice.id,
        provider: invoice.provider.name,
        amount: invoice.amount,
        date: invoice.date,
        status: invoice.status,
        service: invoice.services[0]?.name ?? 'Healthcare Service',
        isPrescription: Boolean(invoice.isPrescription),
        prescriptionQuoteReviewed: Boolean(invoice.prescriptionQuoteReviewed),
      }))
  const { isMobile } = useResponsive()
  const [filter, setFilter] = useState<InvoiceFilter>('All')
  const filteredInvoices = invoices.filter(invoice =>
    filter === 'All' ? true : filter === 'Paid' ? isPaidStatus(invoice.status) : !isPaidStatus(invoice.status) && invoice.status !== 'rejected',
  )
  const { pageItems: pagedInvoices, pager } = usePaged(filteredInvoices, filter)
  type Row = (typeof invoices)[number]
  const statusOf = (invoice: Row) => statusMap[invoice.status] ?? { type: 'default' as BadgeType, label: invoice.status }
  const columns: InvoiceTableColumn<Row>[] = [
    { key: 'id', header: 'Invoice', render: invoice => <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{invoice.id}</span> },
    { key: 'provider', header: 'Provider', render: invoice => invoice.provider },
    { key: 'service', header: 'Service', render: invoice => <span style={{ color: C.textSub }}>{invoice.service}</span> },
    { key: 'date', header: 'Date', render: invoice => <span style={{ whiteSpace: 'nowrap', color: C.textSub }}>{formatDate(invoice.date)}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: invoice => <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{formatCurrency(invoice.amount, currency)}</span> },
    { key: 'status', header: 'Status', align: 'right', render: invoice => <GGBadge type={statusOf(invoice).type}>{statusOf(invoice).label}</GGBadge> },
  ]
  const pendingInvoices = invoices.filter(invoice => {
    if (invoice.status !== 'pending_auth') return false
    // Prescription invoices wait until the patient has reviewed the pharmacy quote.
    if (invoice.isPrescription && !invoice.prescriptionQuoteReviewed) return false
    return true
  })
  const pendingCount = pendingInvoices.length
  const firstPendingInvoice = pendingInvoices[0]

  return (
    <AppLayout title="Invoices" status={!isNew && pendingCount > 0 ? `${pendingCount} to authorize` : undefined} notifCount={isNew ? 0 : pendingCount}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: font.family }}>
        {!isNew && pendingCount > 0 && (
          <div style={{ padding: '14px 20px', background: `linear-gradient(90deg, ${C.warningBg}, #FFF8E0)`, borderRadius: radius.sm, border: `1px solid rgba(245,166,35,0.25)`, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3l6 10H2z" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinejoin="round" /><line x1="8" y1="7.5" x2="8" y2="10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /><circle cx="8" cy="11.5" r="0.8" fill="#fff" /></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#8A4D00' }}>{pendingCount} invoice{pendingCount > 1 ? 's require' : ' requires'} your authorization</div>
              {firstPendingInvoice && (
                <div style={{ fontSize: '12px', color: '#A06000', marginTop: '2px' }}>
                  {firstPendingInvoice.id} from {firstPendingInvoice.provider} — {formatCurrency(firstPendingInvoice.amount, currency)}
                </div>
              )}
            </div>
            <GGButton
              variant="warning"
              size="sm"
              onClick={() => firstPendingInvoice && navigate(route.patientInvoice(firstPendingInvoice.id))}
              style={{ background: C.warning, color: '#fff', flexShrink: 0 }}
            >
              Authorize Now
            </GGButton>
          </div>
        )}

        <GGCard padding="0" noPad>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>All Invoices</div>
            {!isNew && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {FILTERS.map(option => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={filter === option}
                    onClick={() => setFilter(option)}
                    style={{ padding: '5px 12px', borderRadius: radius.full, border: `1px solid ${C.border}`, background: filter === option ? C.blue100 : '#fff', color: filter === option ? C.blue500 : C.textSub, fontSize: '12px', fontWeight: filter === option ? 700 : 500, cursor: 'pointer', fontFamily: font.family }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {invoices.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 24px' }}>
              <div style={{ width: 52, height: 52, borderRadius: '14px', background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="3" width="16" height="18" rx="2" stroke={C.blue500} strokeWidth="1.5" />
                  <path d="M8 8h8M8 12h8M8 16h5" stroke={C.blue500} strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>No invoices yet</div>
              <div style={{ fontSize: '13px', color: C.textSub, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
                Invoices from your healthcare providers will appear here once they submit them through GG&apos;APP.
              </div>
              <button
                onClick={() => navigate('/app/services')}
                style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: radius.sm, border: 'none', background: C.navy800, fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: font.family }}
                onMouseEnter={event => { event.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={event => { event.currentTarget.style.opacity = '1' }}
              >
                Find a Provider
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6.5 3L9.5 6l-3 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{ padding: '32px 22px', fontSize: '13px', color: C.textSub }}>No {filter.toLowerCase()} invoices.</div>
          ) : !isMobile ? (
            <InvoiceTable
              label="Invoices"
              columns={columns}
              rows={pagedInvoices}
              getKey={invoice => invoice.id}
              onRowClick={invoice => navigate(route.patientInvoice(invoice.id))}
            />
          ) : (
            pagedInvoices.map((invoice, index) => {
              const status = statusOf(invoice)
              const canOpen = true

              return (
                <div
                  key={invoice.id}
                  onClick={() => canOpen ? navigate(route.patientInvoice(invoice.id)) : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 22px', borderBottom: index < pagedInvoices.length - 1 ? `1px solid ${C.border}` : 'none', cursor: canOpen ? 'pointer' : 'default', transition: 'background 0.12s' }}
                  onMouseEnter={event => { if (canOpen) event.currentTarget.style.background = C.bg }}
                  onMouseLeave={event => { event.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '12px', background: invoice.status === 'pending_auth' ? C.warningBg : C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="2" width="12" height="14" rx="2" stroke={invoice.status === 'pending_auth' ? C.warning : C.success} strokeWidth="1.3" /><line x1="6" y1="6" x2="12" y2="6" stroke={invoice.status === 'pending_auth' ? C.warning : C.success} strokeWidth="1" strokeLinecap="round" /><line x1="6" y1="9" x2="12" y2="9" stroke={invoice.status === 'pending_auth' ? C.warning : C.success} strokeWidth="1" strokeLinecap="round" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{invoice.id}</div>
                    <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{invoice.provider} · {invoice.service}</div>
                    <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>{formatDate(invoice.date)}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>{formatCurrency(invoice.amount, currency)}</div>
                    <div style={{ marginTop: '4px' }}><GGBadge type={status.type}>{status.label}</GGBadge></div>
                  </div>
                </div>
              )
            })
          )}
          <div style={{ padding: '0 22px 14px' }}><Pager {...pager} /></div>
        </GGCard>
      </div>
    </AppLayout>
  )
}
