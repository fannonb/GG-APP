import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminDashboard, useAdminCreditApplications, useAdminNotifications } from '@/hooks/api/useAdminQueries'
import { useMarkAdminNotificationReadMutation } from '@/hooks/api/useAdminMutations'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { AdminSidebar } from './AdminSidebar'
import { useAdminCountry, type AdminCountryFilter } from '@/features/admin/AdminCountryContext'
import { CountryFlag } from '@/features/admin/AdminShared'
import { formatRelativeTime } from '@/utils/format'
import type { SPApplicationStatus } from '@/types/admin.types'
import { ROUTES } from '@/router/routes'
import { getUnreadCreditBannerItems, getUnreadPatientRegistrationItems } from '@/utils/credit-notifications'

const COUNTRY_OPTIONS: { id: AdminCountryFilter; label: string; code?: 'ZW' | 'KE' | 'ZM' }[] = [
  { id: 'all',      label: 'All' },
  { id: 'Zimbabwe', label: 'ZWL', code: 'ZW' },
  { id: 'Kenya',    label: 'KES', code: 'KE' },
  { id: 'Zambia',   label: 'ZMW', code: 'ZM' },
]

const APPLICATION_STYLE: Record<SPApplicationStatus, { tileBg: string; tileColor: string; label: string; labelColor: string; border: string }> = {
  pending:       { tileBg: C.blue100, tileColor: C.navy800, label: 'Pending review', labelColor: C.blue500, border: C.blue500 + '33' },
  info_requested:{ tileBg: C.blue100, tileColor: C.navy800, label: 'Info requested', labelColor: C.blue500, border: C.blue500 + '33' },
  approved:      { tileBg: C.navy800, tileColor: '#fff',    label: 'Approved',       labelColor: C.navy800, border: C.navy800 + '33' },
  rejected:      { tileBg: C.errorBg, tileColor: C.error,    label: 'Rejected',       labelColor: C.error,    border: C.error + '33' },
}

function ApplicationIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1" width="11" height="12" rx="1.5" stroke={color} strokeWidth="1.3" />
      <path d="M4 5h6M4 7.5h6M4 10h4" stroke={color} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}

interface AdminLayoutProps {
  children: ReactNode
  title: string
  status?: string
  /** @deprecated Prefer `status` for actionable counts. Ignored in the top bar. */
  subtitle?: string
  back?: boolean
}

export function AdminLayout({ children, title, status, back = false }: AdminLayoutProps) {
  const { isDesktop, isMobile } = useResponsive()
  const navigate = useNavigate()
  const { data: dashboard } = useAdminDashboard()
  const { data: creditApplications = [] } = useAdminCreditApplications()
  const { data: notifications = [] } = useAdminNotifications()
  const markNotificationRead = useMarkAdminNotificationReadMutation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const { country, setCountry } = useAdminCountry()
  const [adminSearch, setAdminSearch] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const applications = dashboard?.applications ?? []
  const pendingCreditCount = creditApplications.filter(app => app.status === 'submitted').length
  const unreadCreditNotifications = getUnreadCreditBannerItems(notifications)
  const registrationNotifications = getUnreadPatientRegistrationItems(notifications)
  const scopedApplications = country === 'all'
    ? applications
    : applications.filter(app => app.country === country)
  const actionableApplications = scopedApplications.filter(
    app => app.status === 'pending' || app.status === 'info_requested',
  )
  const unreadCount = actionableApplications.filter(app => !readIds.has(app.id)).length
    + unreadCreditNotifications.length
    + registrationNotifications.length

  const markAllRead = () => {
    setReadIds(new Set(scopedApplications.map(app => app.id)))
    unreadCreditNotifications.forEach(item => markNotificationRead.mutate(item.id))
    registrationNotifications.forEach(item => markNotificationRead.mutate(item.id))
  }

  const handleRegistrationClick = (id: string, screen?: string) => {
    markNotificationRead.mutate(id)
    setNotifOpen(false)
    navigate(screen ?? ROUTES.ADMIN_USERS)
  }

  const markOneRead = (id: string) => setReadIds(prev => new Set([...prev, id]))

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: '#EEF4FB',
      padding: isDesktop ? '16px 20px 16px 16px' : '0',
      gap: isDesktop ? '20px' : '0',
      boxSizing: 'border-box',
    }}>

      {isDesktop && <AdminSidebar pendingCreditCount={pendingCreditCount} />}

      {!isDesktop && drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(5,14,34,0.6)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50, width: 240, animation: 'slideInLeft 0.2s ease' }}>
            <AdminSidebar onClose={() => setDrawerOpen(false)} pendingCreditCount={pendingCreditCount} />
          </div>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', overflow: 'hidden' }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: isDesktop ? 'transparent' : '#fff',
          borderBottom: isDesktop ? 'none' : `1px solid ${C.border}`,
          padding: isDesktop ? '14px 20px 18px 20px' : '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minHeight: isDesktop ? 'auto' : '58px',
          boxSizing: 'border-box',
        }}>
          {!isDesktop && mobileSearchOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setMobileSearchOpen(false)
                  setAdminSearch('')
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, padding: '6px', display: 'flex', alignItems: 'center' }}
                aria-label="Back"
              >
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  const q = adminSearch.trim()
                  if (q) {
                    setMobileSearchOpen(false)
                    navigate(`/admin/providers?q=${encodeURIComponent(q)}`)
                  }
                }}
                style={{
                  flex: 1,
                  background: '#E9EDF5',
                  borderRadius: '9999px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  gap: '8px',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={adminSearch}
                  onChange={e => setAdminSearch(e.target.value)}
                  placeholder="Search providers, users..."
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '13px',
                    color: C.navy800,
                    width: '100%',
                    fontFamily: font.family,
                  }}
                />
                {adminSearch && (
                  <button
                    type="button"
                    onClick={() => setAdminSearch('')}
                    style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#94A3B8' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </form>
              <button
                type="button"
                onClick={() => {
                  const q = adminSearch.trim()
                  if (q) {
                    setMobileSearchOpen(false)
                    navigate(`/admin/providers?q=${encodeURIComponent(q)}`)
                  }
                }}
                style={{
                  background: C.blue500,
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: radius.full,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontFamily: font.family,
                  flexShrink: 0,
                }}
              >
                Search
              </button>
            </div>
          ) : (
            <>
              {!isDesktop && (
                <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, padding: '4px', display: 'flex', alignItems: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}

              {back && (
                <button onClick={() => navigate(-1)} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '10px', cursor: 'pointer', color: C.textSub, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: font.family }}>Back</span>
                </button>
              )}

              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 style={{ fontSize: isDesktop ? '28px' : '20px', fontWeight: 800, color: C.navy800, fontFamily: font.family, letterSpacing: '-0.035em', lineHeight: 1.15, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
                {status && (
                  <span style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: C.blue100,
                    color: C.blue500,
                    fontSize: '11.5px',
                    fontWeight: 700,
                    fontFamily: font.family,
                  }}>
                    {status}
                  </span>
                )}
              </div>

              {/* Search pill in Admin TopBar (Desktop) */}
              {isDesktop && (
                <form
                  onSubmit={e => {
                    e.preventDefault()
                    const q = adminSearch.trim()
                    if (q) navigate(`/admin/providers?q=${encodeURIComponent(q)}`)
                  }}
                  style={{
                    background: '#E9EDF5',
                    borderRadius: '9999px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px 0 16px',
                    gap: '10px',
                    width: '260px',
                    border: '1px solid transparent',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={e => setAdminSearch(e.target.value)}
                    placeholder="Search providers, users..."
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '13px',
                      color: C.navy800,
                      width: '100%',
                      fontFamily: font.family,
                    }}
                  />
                  {adminSearch && (
                    <button
                      type="button"
                      onClick={() => setAdminSearch('')}
                      style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94A3B8' }}
                      title="Clear search"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </form>
              )}

              {/* Mobile Search Icon Button */}
              {!isDesktop && (
                <button
                  onClick={() => setMobileSearchOpen(true)}
                  aria-label="Search"
                  style={{
                    width: 38, height: 38,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    flexShrink: 0,
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              )}
            </>
          )}

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              style={{
                position: 'relative',
                width: 38, height: 38,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: `1px solid ${notifOpen ? C.blue500 : '#E2E8F0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.12s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { if (!notifOpen) { e.currentTarget.style.background = '#F8FAFC' } }}
              onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.background = '#FFFFFF' } }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={notifOpen ? C.blue500 : '#64748B'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: C.error, color: '#fff',
                  fontSize: '9px', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #fff', fontFamily: font.family,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />

                <div style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                  width: 360, maxHeight: 480,
                  background: '#fff',
                  border: `1px solid ${C.border}`,
                  borderRadius: radius.sm,
                  boxShadow: shadow.md,
                  zIndex: 30,
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                  fontFamily: font.family,
                }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>Action items</span>
                      {unreadCount > 0 && (
                        <span style={{ padding: '1px 7px', borderRadius: radius.full, background: C.error, color: '#fff', fontSize: '10px', fontWeight: 800 }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: C.blue500, fontFamily: font.family, padding: 0 }}>
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {registrationNotifications.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleRegistrationClick(item.id, item.screen)}
                        style={{
                          padding: '12px 18px',
                          borderBottom: `1px solid ${C.border}`,
                          background: 'rgba(34,197,94,0.06)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                        }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: radius.sm, flexShrink: 0,
                          background: 'rgba(34,197,94,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid rgba(34,197,94,0.25)',
                          color: C.success, fontSize: '10px', fontWeight: 800,
                        }}>
                          PT
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: C.success, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Patient registration
                          </div>
                          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.45, marginTop: '3px' }}>{item.headline}</div>
                          <div style={{ fontSize: '11px', color: C.textSub, marginTop: '3px', lineHeight: 1.45 }}>{item.detail}</div>
                        </div>
                      </div>
                    ))}

                    {unreadCreditNotifications.map(item => (
                      <div
                        key={item.id}
                        onClick={() => { setNotifOpen(false); navigate(item.screen ?? ROUTES.ADMIN_CREDIT_APPLICATIONS) }}
                        style={{
                          padding: '12px 18px',
                          borderBottom: `1px solid ${C.border}`,
                          background: 'rgba(124,58,237,0.06)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                        }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: radius.sm, flexShrink: 0,
                          background: 'rgba(124,58,237,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid rgba(124,58,237,0.2)',
                          color: '#7C3AED', fontSize: '10px', fontWeight: 800,
                        }}>
                          CR
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Credit application
                          </div>
                          <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.45, marginTop: '3px' }}>{item.headline}</div>
                          <div style={{ fontSize: '11px', color: C.textSub, marginTop: '3px', lineHeight: 1.45 }}>{item.detail}</div>
                        </div>
                      </div>
                    ))}

                    {actionableApplications.length === 0 && unreadCreditNotifications.length === 0 && registrationNotifications.length === 0 ? (
                      <div style={{ padding: '24px 18px', textAlign: 'center', color: C.textSub, fontSize: '12px' }}>
                        No pending action items
                      </div>
                    ) : actionableApplications.map((app, i) => {
                      const s = APPLICATION_STYLE[app.status]
                      const read = readIds.has(app.id)
                      const serviceTypes = app.serviceTypes.join(' - ')
                      return (
                        <div
                          key={app.id}
                          onClick={() => { markOneRead(app.id); setNotifOpen(false); navigate(ROUTES.ADMIN_APPLICATIONS) }}
                          style={{
                            padding: '12px 18px',
                            borderBottom: i < actionableApplications.length - 1 ? `1px solid ${C.border}` : 'none',
                            background: read ? 'transparent' : C.blue100 + '55',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'flex-start', gap: '12px',
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                          onMouseLeave={e => (e.currentTarget.style.background = read ? 'transparent' : C.blue100 + '55')}
                        >
                          <div style={{
                            width: 30, height: 30, borderRadius: radius.sm, flexShrink: 0,
                            background: s.tileBg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${s.border}`,
                          }}>
                            <ApplicationIcon color={s.tileColor} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                              <span style={{ fontSize: '9px', fontWeight: 700, color: s.labelColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
                              {!read && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue500, display: 'inline-block', flexShrink: 0 }} />}
                            </div>
                            <div style={{ fontSize: '12px', color: C.text, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {app.name}{serviceTypes ? ` - ${serviceTypes}` : ''} - {app.country}
                            </div>
                            <div style={{ fontSize: '10px', color: C.textLight, marginTop: '3px' }}>Submitted {formatRelativeTime(app.submitted)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div
                    onClick={() => { setNotifOpen(false); navigate(ROUTES.ADMIN_APPLICATIONS) }}
                    style={{ padding: '11px 18px', borderTop: `1px solid ${C.border}`, textAlign: 'center', fontSize: '12px', fontWeight: 600, color: C.blue500, cursor: 'pointer', background: C.bg, flexShrink: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.blue100)}
                    onMouseLeave={e => (e.currentTarget.style.background = C.bg)}
                  >
                    View SP applications {'->'}
                  </div>
                  {registrationNotifications.length > 0 && (
                    <div
                      onClick={() => { setNotifOpen(false); navigate(ROUTES.ADMIN_USERS) }}
                      style={{ padding: '11px 18px', borderTop: `1px solid ${C.border}`, textAlign: 'center', fontSize: '12px', fontWeight: 600, color: C.success, cursor: 'pointer', background: C.bg, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = C.bg)}
                    >
                      View patients ({registrationNotifications.length}) {'->'}
                    </div>
                  )}
                  {pendingCreditCount > 0 && (
                    <div
                      onClick={() => { setNotifOpen(false); navigate(ROUTES.ADMIN_CREDIT_APPLICATIONS) }}
                      style={{ padding: '11px 18px', borderTop: `1px solid ${C.border}`, textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#7C3AED', cursor: 'pointer', background: C.bg, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background = C.bg)}
                    >
                      View credit applications ({pendingCreditCount}) {'->'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: C.bg, borderRadius: radius.full, padding: '3px', border: `1px solid ${C.border}`, flexShrink: 0 }}>
            {COUNTRY_OPTIONS.map(opt => {
              const active = country === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setCountry(opt.id)}
                  title={opt.id === 'all' ? 'All countries' : opt.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: isMobile ? '4px 7px' : '4px 10px',
                    borderRadius: radius.full, border: 'none',
                    background: active ? C.navy800 : 'transparent',
                    color: active ? '#fff' : C.textSub,
                    fontSize: '11px', fontWeight: active ? 700 : 500,
                    cursor: 'pointer', fontFamily: font.family,
                    transition: 'all 0.12s', whiteSpace: 'nowrap',
                  }}
                >
                  {opt.code && <CountryFlag code={opt.code} size={14} />}
                  {(!isMobile || opt.id === 'all') && opt.label}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: C.blue100, border: `1px solid ${C.blue500}33`, borderRadius: '20px', flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue500 }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: C.blue500, fontFamily: font.family }}>Admin</span>
          </div>
        </div>

        <main style={{ flex: 1, overflowY: 'auto', padding: isDesktop ? '0 8px 24px 8px' : '20px 16px' }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
