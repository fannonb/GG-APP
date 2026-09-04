import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GGButton, GGCard } from '@/design-system'
import { C, font, radius } from '@/design-system/tokens'
import { AdminLayout } from '@/layouts/admin/AdminLayout'
import { useResponsive } from '@/hooks/useResponsive'
import { useAdminActivity, useAdminDashboard, useAdminNotifications, useAdminProviders, useAdminUsers, useAdminCreditApplications } from '@/hooks/api/useAdminQueries'
import { useMarkAdminNotificationReadMutation } from '@/hooks/api/useAdminMutations'
import { ROUTES } from '@/router/routes'
import { CountryBadge, countryCode } from '@/features/admin/AdminShared'
import { PaymentAlertBanner } from '@/components/PaymentAlertBanner'
import { CreditAlertBanner } from '@/components/CreditAlertBanner'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'
import { getUnreadPaymentBannerItems } from '@/utils/payment-notifications'
import { getUnreadCreditBannerItems, getPendingCreditApplications, getUnreadPatientRegistrationItems } from '@/utils/credit-notifications'
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/format'
import type { AdminCreditApplication } from '@/types/credit.types'
import type { AdminActivityCategory, AdminActivityItem, SPApplicationStatus } from '@/types/admin.types'

const STATUS_STYLE: Record<SPApplicationStatus, { bg: string; color: string; label: string }> = {
  pending:        { bg: C.bg,      color: C.textSub, label: 'Pending' },
  info_requested:  { bg: C.blue100, color: C.navy800, label: 'Info requested' },
  approved:       { bg: C.blue100, color: C.navy800, label: 'Approved' },
  rejected:       { bg: C.errorBg, color: C.error,   label: 'Rejected' },
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <GGCard padding="18px">
      <div style={{ fontSize: '10px', fontWeight: 700, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: accent, letterSpacing: '-0.04em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: C.textLight, marginTop: '6px', lineHeight: 1.4 }}>
        {sub}
      </div>
    </GGCard>
  )
}

const ACTIVITY_STYLE: Record<AdminActivityCategory, { color: string; bg: string }> = {
  appointment: { color: C.blue500, bg: C.blue100 },
  invoice: { color: C.navy800, bg: C.blue100 },
  payment: { color: C.success, bg: 'rgba(34,197,94,0.12)' },
  registration: { color: '#7C3AED', bg: 'rgba(124,58,237,0.1)' },
}

const CATEGORY_LABEL: Record<AdminActivityCategory, string> = {
  appointment: 'Appointment',
  invoice: 'Invoice',
  payment: 'Payment',
  registration: 'Registration',
}

const ACTIVITY_DASHBOARD_LIMIT = 10
const ACTIVITY_ALL_LIMIT = 30

function ActivityRow({ item, isLast }: { item: AdminActivityItem; isLast?: boolean }) {
  const style = ACTIVITY_STYLE[item.category]
  const highlight = item.actionHighlight || item.title
  const summary = item.summary || (item.detail !== 'Platform activity recorded' ? item.detail : undefined)

  return (
    <div
      style={{
        padding: '14px 0',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: radius.sm,
          background: style.bg,
          color: style.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 800,
          flexShrink: 0,
          textTransform: 'uppercase',
        }}
      >
        {item.actorType === 'patient' ? 'PT' : 'SP'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: style.color,
              background: style.bg,
              padding: '4px 10px',
              borderRadius: radius.full,
              letterSpacing: '0.02em',
              lineHeight: 1.2,
            }}
          >
            {highlight}
          </span>
          {item.reference && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: "'Courier New', monospace",
                color: C.text,
                background: C.bg,
                padding: '3px 8px',
                borderRadius: radius.sm,
                border: `1px solid ${C.border}`,
              }}
            >
              {item.reference}
            </span>
          )}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: C.textSub,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {CATEGORY_LABEL[item.category]}
          </span>
          <CountryBadge code={countryCode(item.country)} showName name={item.country} size={12} />
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, lineHeight: 1.4 }}>
          {item.title}
          <span style={{ fontWeight: 500, color: C.textSub }}> · {item.actorName}</span>
        </div>
        {summary && (
          <div style={{ fontSize: '11px', color: C.textSub, marginTop: '5px', lineHeight: 1.5 }}>
            {summary}
          </div>
        )}
        <div style={{ fontSize: '11px', color: C.textLight, marginTop: '5px' }}>
          {formatRelativeTime(item.occurredAt)}
        </div>
      </div>
    </div>
  )
}

function ActivityModal({
  items,
  onClose,
  isMobile,
}: {
  items: AdminActivityItem[]
  onClose: () => void
  isMobile: boolean
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,21,40,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '16px' : '32px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: 640,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(8,21,40,0.25)',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>Recent activity</div>
            <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>
              Up to {ACTIVITY_ALL_LIMIT} latest actions from patients and service providers
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke={C.textSub} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div style={{ padding: '0 24px', overflowY: 'auto', flex: 1 }}>
          {items.map((item, index) => (
            <ActivityRow key={item.id} item={item} isLast={index === items.length - 1} />
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: SPApplicationStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 10px',
      borderRadius: radius.full,
      background: s.bg,
      border: `1px solid ${C.border}`,
      fontSize: '11px',
      fontWeight: 700,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  )
}

export function AdminDashboardScreen() {
  const { isMobile, isTablet } = useResponsive()
  const isNarrow = isMobile || isTablet
  const navigate = useNavigate()
  const { country } = useAdminCountry()
  const [showAllActivity, setShowAllActivity] = useState(false)
  const [showAllApplications, setShowAllApplications] = useState(false)
  const [appPage, setAppPage] = useState(0)
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminDashboard()
  const { data: notifications = [] } = useAdminNotifications()
  const {
    data: activity = [],
    isLoading: activityLoading,
    isError: activityError,
    error: activityErrorDetails,
  } = useAdminActivity(country, ACTIVITY_ALL_LIMIT)
  const dashboardActivity = activity.slice(0, ACTIVITY_DASHBOARD_LIMIT)
  const hasMoreActivity = activity.length > ACTIVITY_DASHBOARD_LIMIT
  const { data: users = [] } = useAdminUsers()
  const { data: providers = [] } = useAdminProviders()
  const { data: creditApplications = [] } = useAdminCreditApplications()
  const markNotificationRead = useMarkAdminNotificationReadMutation()

  const stats = data?.stats
  const applications = data?.applications ?? []
  const dashboardCreditApps = data?.creditApplications ?? creditApplications
  const mapCreditCountry = (country: string) => {
    if (country === 'KE') return 'Kenya'
    if (country === 'ZM') return 'Zambia'
    if (country === 'ZW') return 'Zimbabwe'
    return country
  }
  const scopedCreditApplications = useMemo(
    () => (country === 'all'
      ? dashboardCreditApps
      : dashboardCreditApps.filter(app => mapCreditCountry(app.country) === country)),
    [dashboardCreditApps, country],
  )
  const scopedApplications = useMemo(
    () => (country === 'all' ? applications : applications.filter(app => app.country === country)),
    [applications, country],
  )
  const scopedUsers = useMemo(
    () => (country === 'all' ? users : users.filter(user => user.country === country)),
    [users, country],
  )
  const scopedProviders = useMemo(
    () => (country === 'all' ? providers : providers.filter(provider => provider.country === country)),
    [providers, country],
  )

  const statusCounts = useMemo(() => {
    return scopedApplications.reduce<Record<SPApplicationStatus, number>>((acc, app) => {
      acc[app.status] += 1
      return acc
    }, { pending: 0, info_requested: 0, approved: 0, rejected: 0 })
  }, [scopedApplications])

  const pendingCreditApps = getPendingCreditApplications(scopedCreditApplications).length
    || stats?.pendingCreditApps
    || 0
  const recentCreditApplications = useMemo(
    () => getPendingCreditApplications(scopedCreditApplications).slice(0, 6),
    [scopedCreditApplications],
  )
  const totalPatients = country === 'all' ? (scopedUsers.length || stats?.totalPatients || 0) : scopedUsers.length
  const totalProviders = country === 'all' ? (scopedProviders.length || stats?.totalProviders || 0) : scopedProviders.length
  const pendingSPApps = stats?.pendingSPApps ?? (statusCounts.pending + statusCounts.info_requested)
  const paymentItems = getUnreadPaymentBannerItems(notifications)
  const creditItems = getUnreadCreditBannerItems(notifications)
  const registrationItems = getUnreadPatientRegistrationItems(notifications)

  const APPS_PER_PAGE = 10
  const ALL_APPS_MAX = 20
  const recentApplications = useMemo(() => scopedApplications.slice(0, APPS_PER_PAGE), [scopedApplications])
  const hasMoreApps = scopedApplications.length > APPS_PER_PAGE

  const handlePaymentBannerAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => markNotificationRead.mutate(item.id))
    navigate(items[0]?.screen ?? ROUTES.ADMIN_PAYMENTS)
  }

  const handleCreditBannerAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => markNotificationRead.mutate(item.id))
    navigate(items[0]?.screen ?? ROUTES.ADMIN_CREDIT_APPLICATIONS)
  }

  const handleRegistrationBannerAction = (items: { id: string; screen?: string }[]) => {
    items.forEach(item => markNotificationRead.mutate(item.id))
    navigate(items[0]?.screen ?? ROUTES.ADMIN_USERS)
  }

  /* Banners disappear shortly after they've been viewed — all their
     notifications are marked read so they don't linger on the homepage. */
  const pendingBannerIds = useMemo(
    () => [...paymentItems, ...creditItems, ...registrationItems].map(item => item.id),
    [notifications],
  )

  useEffect(() => {
    if (pendingBannerIds.length === 0) return
    const timer = setTimeout(() => {
      pendingBannerIds.forEach(id => markNotificationRead.mutate(id))
    }, 3000)
    return () => clearTimeout(timer)
  }, [pendingBannerIds])

  if (isLoading && !data) {
    return (
      <AdminLayout title="Dashboard">
        <GGCard padding="28px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center', color: C.textSub }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', border: `3px solid ${C.border}`, borderTopColor: C.blue500, animation: 'spin 0.8s linear infinite' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Loading admin dashboard...</div>
          </div>
        </GGCard>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </AdminLayout>
    )
  }

  if (isError && !data) {
    const message = error instanceof Error ? error.message : 'Unable to load admin dashboard data.'
    return (
      <AdminLayout title="Dashboard">
        <GGCard padding="28px" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>Dashboard data unavailable</div>
            <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.6 }}>{message}</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <GGButton variant="primary" size="sm" onClick={() => refetch()}>
                Retry
              </GGButton>
              <GGButton variant="secondary" size="sm" onClick={() => navigate(ROUTES.ADMIN_APPLICATIONS)}>
                Go to applications
              </GGButton>
            </div>
          </div>
        </GGCard>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', fontFamily: font.family }}>
        {paymentItems.length > 0 && (
          <PaymentAlertBanner
            audience="admin"
            items={paymentItems}
            onAction={handlePaymentBannerAction}
          />
        )}

        {creditItems.length > 0 && (
          <CreditAlertBanner
            items={creditItems}
            onAction={handleCreditBannerAction}
          />
        )}

        {registrationItems.length > 0 && (
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(90deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))',
            borderRadius: radius.lg,
            border: '1.5px solid rgba(34,197,94,0.28)',
            display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap',
            boxShadow: '0 2px 12px rgba(34,197,94,0.08)',
          }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: C.success, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(34,197,94,0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="6" r="3" stroke="#fff" strokeWidth="1.4"/>
                <path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: C.navy800, fontFamily: font.family }}>
                {registrationItems.length > 1 ? `${registrationItems.length} new patients registered` : 'New patient registered'}
              </div>
              <div style={{ fontSize: '13px', color: C.textSub, lineHeight: 1.55, marginTop: '4px', fontFamily: font.family }}>
                {registrationItems.length > 1
                  ? `${registrationItems[0].detail} and ${registrationItems.length - 1} more.`
                  : registrationItems[0].detail}
              </div>
            </div>
            <GGButton variant="success" size="sm" onClick={() => handleRegistrationBannerAction(registrationItems)} style={{ flexShrink: 0 }}>
              View Patients
            </GGButton>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '14px' }}>
          <StatCard
            label="Pending SP apps"
            value={pendingSPApps.toString()}
            sub={country === 'all' ? 'Applications awaiting review' : `Applications awaiting review in ${country}`}
            accent={C.blue500}
          />
          <StatCard
            label="Pending credit apps"
            value={pendingCreditApps.toString()}
            sub={country === 'all' ? 'Patient credit requests awaiting review' : `Credit requests in ${country}`}
            accent="#7C3AED"
          />
          <StatCard
            label="Total providers"
            value={totalProviders.toString()}
            sub={country === 'all' ? 'Live provider accounts' : `Live provider accounts in ${country}`}
            accent={C.text}
          />
          <StatCard
            label="Total patients"
            value={totalPatients.toString()}
            sub={country === 'all' ? 'Registered patient accounts' : `Registered patient accounts in ${country}`}
            accent={C.navy800}
          />
        </div>

        {/* Health Intelligence Platform Strategic Quick-Launch */}
        <div style={{
          background: `linear-gradient(135deg, ${C.navy800} 0%, #102B69 100%)`,
          borderRadius: radius.lg,
          padding: '22px 24px',
          color: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(9, 28, 68, 0.14)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: C.blue400, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                GG'APP Strategic Health Intelligence Platform
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                Epidemiological, Actuarial & Consumer Health Intelligence
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'rgba(255,255,255,0.7)', maxWidth: '640px', lineHeight: 1.4 }}>
                Real-time operational monitoring, disease burden analytics, 5-band demographic profiling, and medical inflation observatory.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div
              onClick={() => navigate(ROUTES.ADMIN_DISEASE_BURDEN)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.blue400 }}>01 · DISEASE BURDEN</div>
              <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '4px' }}>Epidemiology Hub →</div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>Acute/chronic ratio, county heatmaps, day vs. night care patterns.</div>
            </div>

            <div
              onClick={() => navigate(ROUTES.ADMIN_DEMOGRAPHICS)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>02 · DEMOGRAPHICS</div>
              <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '4px' }}>Actuarial Pyramids →</div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>5-band age stratification (&lt;18, 19–24, 25–34, 35–50, 51+) & gender ratios.</div>
            </div>

            <div
              onClick={() => navigate(ROUTES.ADMIN_FINANCIALS)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>03 · FINANCIALS & CPI</div>
              <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '4px' }}>Medical Inflation →</div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>Tracking 7.8% health inflation vs 4.5% CPI & credit thresholds.</div>
            </div>

            <div
              onClick={() => navigate(ROUTES.ADMIN_CONSUMER_HEALTH)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#EC4899' }}>04 · CONSUMER HEALTH</div>
              <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '4px' }}>Member Experience →</div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>+68 NPS, top provider ratings, and wallet spending habits.</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isNarrow ? '1fr' : '1.6fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>Recent applications</div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>
                  {country === 'all' ? 'Latest submissions from the live backend' : `Latest submissions in ${country}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: C.textSub, whiteSpace: 'nowrap' }}>
                  {scopedApplications.length} loaded
                </span>
                {hasMoreApps && (
                  <GGButton variant="outline" size="sm" onClick={() => { setAppPage(0); setShowAllApplications(true) }}>
                    View all
                  </GGButton>
                )}
              </div>
            </div>

            {recentApplications.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: C.textSub, fontSize: '13px' }}>
                No applications available yet.
              </div>
            ) : (
              <div>
                {recentApplications.map((app, index) => (
                  <div
                    key={app.id}
                    onClick={() => navigate(ROUTES.ADMIN_APPLICATIONS)}
                    style={{
                      padding: '16px 20px',
                      borderBottom: index < recentApplications.length - 1 ? `1px solid ${C.border}` : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{app.name}</div>
                          <StatusPill status={app.status} />
                        </div>
                        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px' }}>
                          {app.serviceTypes.join(' - ')} - {app.country}
                        </div>
                        <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>
                          Submitted {formatDate(app.submitted)} | {formatRelativeTime(app.submitted)}
                        </div>
                      </div>
                      <CountryBadge code={countryCode(app.country)} showName name={app.country} size={14} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GGCard>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <GGCard padding="18px">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: C.text }}>Recent activity</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>
                    Latest actions from patients and service providers
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {isFetching && (
                    <span style={{ fontSize: '11px', color: C.textLight, whiteSpace: 'nowrap' }}>Refreshing…</span>
                  )}
                  {hasMoreActivity && (
                    <GGButton variant="outline" size="sm" onClick={() => setShowAllActivity(true)}>
                      View all
                    </GGButton>
                  )}
                </div>
              </div>

              {activityLoading && activity.length === 0 ? (
                <div style={{ fontSize: '13px', color: C.textSub, padding: '12px 0' }}>Loading activity…</div>
              ) : activityError ? (
                <div style={{ fontSize: '13px', color: C.error, padding: '12px 0' }}>
                  {activityErrorDetails instanceof Error
                    ? activityErrorDetails.message
                    : 'Recent activity is temporarily unavailable.'}
                </div>
              ) : activity.length === 0 ? (
                <div style={{ fontSize: '13px', color: C.textSub, padding: '12px 0' }}>
                  No recent patient or provider activity yet.
                </div>
              ) : (
                <div>
                  {dashboardActivity.map((item, index) => (
                    <ActivityRow key={item.id} item={item} isLast={index === dashboardActivity.length - 1} />
                  ))}
                </div>
              )}
            </GGCard>
          </div>
        </div>

        {recentCreditApplications.length > 0 && (
          <GGCard padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>Pending credit applications</div>
                <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>
                  Patient healthcare credit requests awaiting approval
                </div>
              </div>
              <GGButton variant="outline" size="sm" onClick={() => navigate(ROUTES.ADMIN_CREDIT_APPLICATIONS)}>
                Review all
              </GGButton>
            </div>
            <div>
              {recentCreditApplications.map((app: AdminCreditApplication, index) => (
                <div
                  key={app.id}
                  onClick={() => navigate(ROUTES.ADMIN_CREDIT_APPLICATIONS)}
                  style={{
                    padding: '16px 20px',
                    borderBottom: index < recentCreditApplications.length - 1 ? `1px solid ${C.border}` : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: C.text, lineHeight: 1.3 }}>{app.patientName}</div>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: radius.full,
                          background: C.warningBg,
                          border: `1px solid ${C.border}`,
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#92400E',
                        }}>
                          {app.type === 'increase' ? 'Limit increase' : 'New application'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px' }}>
                        {app.reference} · Requested {formatCurrency(app.requestedAmount)}
                      </div>
                      <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>
                        Submitted {formatDate(app.submittedAt)} · {formatRelativeTime(app.submittedAt)}
                      </div>
                    </div>
                    <CountryBadge code={countryCode(mapCreditCountry(app.country))} showName name={mapCreditCountry(app.country)} size={14} />
                  </div>
                </div>
              ))}
            </div>
          </GGCard>
        )}
      </div>

      {showAllActivity && (
        <ActivityModal
          items={activity}
          onClose={() => setShowAllActivity(false)}
          isMobile={isMobile}
        />
      )}

      {showAllApplications && (() => {
        const allApps = scopedApplications.slice(0, ALL_APPS_MAX)
        const totalPages = Math.ceil(allApps.length / APPS_PER_PAGE)
        const pageApps = allApps.slice(appPage * APPS_PER_PAGE, (appPage + 1) * APPS_PER_PAGE)
        return (
          <div
            onClick={() => setShowAllApplications(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(8,21,40,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '16px' : '32px' }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(8,21,40,0.25)' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: C.text }}>All applications</div>
                  <div style={{ fontSize: '12px', color: C.textSub, marginTop: '2px' }}>
                    Showing up to {ALL_APPS_MAX} most recent submissions
                  </div>
                </div>
                <button type="button" onClick={() => setShowAllApplications(false)} aria-label="Close" style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke={C.textSub} strokeWidth="1.8" strokeLinecap="round" /></svg>
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                {pageApps.map((app, index) => (
                  <div
                    key={app.id}
                    onClick={() => { setShowAllApplications(false); navigate(ROUTES.ADMIN_APPLICATIONS) }}
                    style={{ padding: '16px 24px', borderBottom: index < pageApps.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: C.text }}>{app.name}</div>
                          <StatusPill status={app.status} />
                        </div>
                        <div style={{ fontSize: '12px', color: C.textSub, marginTop: '4px' }}>{app.serviceTypes.join(' - ')} - {app.country}</div>
                        <div style={{ fontSize: '11px', color: C.textLight, marginTop: '4px' }}>Submitted {formatDate(app.submitted)} | {formatRelativeTime(app.submitted)}</div>
                      </div>
                      <CountryBadge code={countryCode(app.country)} showName name={app.country} size={14} />
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div style={{ padding: '14px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', color: C.textSub }}>Page {appPage + 1} of {totalPages}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <GGButton variant="outline" size="sm" onClick={() => setAppPage(p => Math.max(0, p - 1))} style={{ opacity: appPage === 0 ? 0.4 : 1 }}>← Prev</GGButton>
                    <GGButton variant="outline" size="sm" onClick={() => setAppPage(p => Math.min(totalPages - 1, p + 1))} style={{ opacity: appPage === totalPages - 1 ? 0.4 : 1 }}>Next →</GGButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </AdminLayout>
  )
}
