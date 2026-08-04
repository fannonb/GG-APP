import { useEffect, useMemo, useState } from 'react'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { PaymentAlertBanner } from '@/components/PaymentAlertBanner'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminNotifications, useAdminPayments } from '@/hooks/api/useAdminQueries'
import { useMarkAdminNotificationReadMutation } from '@/hooks/api/useAdminMutations'
import { formatDate } from '@/utils/format'
import { getUnreadPaymentBannerItems } from '@/utils/payment-notifications'
import type { AdminPayment, AdminPaymentStatus } from '@/types/admin.types'
import { CountryBadge, countryCode, COUNTRY_CURRENCIES } from '@/features/admin/AdminShared'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

function formatAmt(amount: number, country: string) {
  const sym = COUNTRY_CURRENCIES[country] ?? 'Z$'
  return sym + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

const STATUS_STYLE: Record<AdminPaymentStatus, { color: string; label: string }> = {
  paid: { color: C.success, label: 'Paid' },
  authorized: { color: C.success, label: 'Paid' },
  pending: { color: C.success, label: 'Paid' },
  failed: { color: C.error, label: 'Failed' },
}

function StatCard({ icon, label, value, note, accent = false }: {
  icon: React.ReactElement
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <div style={{
      padding: '20px 22px',
      background: '#fff',
      borderRadius: radius.sm,
      border: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          {label}
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: radius.xs,
          background: accent ? C.blue500 : C.blue100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: accent ? '#fff' : C.blue500, display: 'flex' }}>{icon}</span>
        </div>
      </div>
      <div>
        <div style={{
          fontSize: '26px', fontWeight: 800,
          color: C.text,
          letterSpacing: '-0.04em', lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{ fontSize: '11px', color: C.textLight, marginTop: '5px' }}>{note}</div>
      </div>
    </div>
  )
}

function PaymentRow({ payment }: { payment: AdminPayment }) {
  const statusStyle = STATUS_STYLE[payment.status]

  return (
    <div
      style={{
        display: 'flex',
        background: '#fff',
        borderRadius: radius.sm,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = shadow.md)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <div style={{ flex: 1, padding: '16px 22px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{payment.patient}</span>
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 5h12M10 1l4 4-4 4" stroke={C.textLight} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{payment.provider}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: C.blue500 }}>{payment.invoiceId}</span>
          <span style={{ color: C.border }}>·</span>
          <CountryBadge code={countryCode(payment.country)} showName name={payment.country} size={14} />
          <span style={{ color: C.border }}>·</span>
          <span style={{ fontSize: '11px', color: C.textLight }}>{formatDate(payment.date)}</span>
          {payment.paymentRef && (
            <>
              <span style={{ color: C.border }}>·</span>
              <span style={{ fontSize: '11px', color: C.textSub }}>{payment.paymentRef}</span>
            </>
          )}
        </div>
      </div>
      <div style={{
        padding: '0 28px',
        background: C.blue100,
        borderLeft: `1px solid ${C.blue500}22`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexShrink: 0,
        gap: '4px',
        minWidth: 160,
      }}>
        <div style={{
          fontSize: '20px', fontWeight: 800,
          color: C.text,
          whiteSpace: 'nowrap', letterSpacing: '-0.02em',
        }}>
          {formatAmt(payment.amount, payment.country)}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusStyle.color, display: 'inline-block' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, color: statusStyle.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {statusStyle.label}
          </span>
        </div>
      </div>
    </div>
  )
}

const VOLUME_ICON = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="5.5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 9.5h16" stroke="currentColor" strokeWidth="1.3"/>
    <circle cx="15.5" cy="13.5" r="1.5" fill="currentColor"/>
    <path d="M5 13.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const TXN_ICON = (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M6.5 7h7M6.5 10.5h7M6.5 14h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

export function AdminPaymentsScreen() {
  const { isMobile } = useResponsive()
  const { country } = useAdminCountry()
  const { data: notifications = [] } = useAdminNotifications()
  const markNotificationRead = useMarkAdminNotificationReadMutation()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, country, pageSize])

  const { data, isLoading, isError, error, isFetching } = useAdminPayments({
    page,
    limit: pageSize,
    search: debouncedSearch,
    country,
  })

  const payments = data?.items ?? []
  const pagination = data?.pagination
  const summary = data?.summary

  const fmt = (n: number, sym = 'Z$') =>
    sym + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  const volumeCards = useMemo(() => {
    const volumes = summary?.volumeByCountry ?? []
    if (country === 'all') {
      return volumes.map(entry => ({
        label: `Volume · ${entry.country}`,
        value: fmt(entry.volume, COUNTRY_CURRENCIES[entry.country] ?? 'Z$'),
        note: `${entry.count} transaction${entry.count === 1 ? '' : 's'}`,
        accent: false,
      }))
    }

    const entry = volumes.find(item => item.country === country) ?? { country, volume: 0, count: 0 }
    return [{
      label: `Volume · ${country}`,
      value: fmt(entry.volume, COUNTRY_CURRENCIES[country] ?? 'Z$'),
      note: `${entry.count} transaction${entry.count === 1 ? '' : 's'}`,
      accent: true,
    }]
  }, [summary, country])

  const totalRecords = summary?.totalTransactions ?? 0
  const totalPages = pagination?.totalPages ?? 0
  const currentPage = pagination?.page ?? page
  const canGoPrev = currentPage > 1
  const canGoNext = totalPages > 0 && currentPage < totalPages
  const paymentItems = getUnreadPaymentBannerItems(notifications)

  const handlePaymentBannerAction = (items: { id: string }[]) => {
    items.forEach(item => markNotificationRead.mutate(item.id))
  }

  return (
    <AdminLayout title="Payments" subtitle="Platform-wide payment tracking and financial overview">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: font.family }}>

        {paymentItems.length > 0 && (
          <PaymentAlertBanner
            audience="admin"
            items={paymentItems}
            onAction={handlePaymentBannerAction}
          />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${volumeCards.length + 1}, 1fr)`, gap: '14px' }}>
          {volumeCards.map((vc, index) => (
            <StatCard
              key={vc.label}
              accent={vc.accent || (country !== 'all' && index === 0)}
              label={vc.label}
              value={vc.value}
              note={vc.note}
              icon={VOLUME_ICON}
            />
          ))}
          <StatCard
            label="Transactions"
            value={totalRecords.toString()}
            note={country === 'all' ? 'total across all countries' : `in ${country}`}
            icon={TXN_ICON}
          />
        </div>

        <div style={{ background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ borderBottom: `1px solid ${C.border}`, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 16, pointerEvents: 'none' }}>
              <circle cx="7" cy="7" r="5.5" stroke={C.textLight} strokeWidth="1.3"/>
              <path d="M11 11l3 3" stroke={C.textLight} strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by patient, provider or invoice number…"
              style={{ width: '100%', padding: '13px 16px 13px 40px', fontSize: '13px', fontFamily: font.family, color: C.text, background: 'transparent', border: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 14, background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.full, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2L2 8" stroke={C.textSub} strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: C.textSub }}>
              {country !== 'all' && <CountryBadge code={countryCode(country)} showName name={country} size={14} />}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.textSub }}>
                Show
                <select
                  value={pageSize}
                  onChange={event => setPageSize(Number(event.target.value))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: radius.xs,
                    border: `1px solid ${C.border}`,
                    background: '#fff',
                    fontSize: '12px',
                    fontFamily: font.family,
                    color: C.text,
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                per page
              </label>
              <span style={{ fontSize: '12px', color: C.textSub }}>
                {totalRecords} record{totalRecords !== 1 ? 's' : ''}
                {isFetching ? ' · refreshing…' : ''}
              </span>
            </div>
          </div>
        </div>

        {isLoading && !data ? (
          <GGCard padding="32px">
            <div style={{ textAlign: 'center', color: C.textSub, fontSize: '13px' }}>Loading payments…</div>
          </GGCard>
        ) : isError && !data ? (
          <GGCard padding="32px">
            <div style={{ textAlign: 'center', color: C.error, fontSize: '13px' }}>
              {error instanceof Error ? error.message : 'Unable to load payments.'}
            </div>
          </GGCard>
        ) : payments.length === 0 ? (
          <div style={{ padding: '56px', textAlign: 'center', color: C.textSub, fontSize: '13px', background: '#fff', borderRadius: radius.sm, border: `1px solid ${C.border}` }}>
            No payments match your filters.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {payments.map(payment => <PaymentRow key={payment.id} payment={payment} />)}
          </div>
        )}

        {totalPages > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '14px 16px',
            background: '#fff',
            borderRadius: radius.sm,
            border: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: '12px', color: C.textSub }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <GGButton variant="secondary" size="sm" disabled={!canGoPrev} onClick={() => setPage(current => Math.max(1, current - 1))}>
                Previous
              </GGButton>
              <GGButton variant="secondary" size="sm" disabled={!canGoNext} onClick={() => setPage(current => current + 1)}>
                Next
              </GGButton>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
