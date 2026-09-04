import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, LOGO } from '@/router/routes'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useNotificationsStore } from '@/store/notifications.store'
import { useUserStore } from '@/store/user.store'
import { NotificationPanel } from '@/components/NotificationPanel'
import { useLogoutMutation, usePatientNotifications, usePatientProfile, useProviders } from '@/hooks/api'
import { AppSidebar } from './AppSidebar'
import { AppTopBar } from './AppTopBar'
import { PATIENT_NAV, PatientNavIcon, isPatientNavActive } from './patientNav'
import { useLocationStore } from '@/store/location.store'

interface AppLayoutProps {
  children: ReactNode
  title: string
  status?: string
  /** @deprecated Prefer `status` for actionable counts. Ignored in the top bar. */
  subtitle?: string
  notifCount?: number
  back?: boolean
  backLabel?: string
}

const SEARCHABLE_CATEGORIES = [
  { id: 'doctor', label: 'Doctor', path: '/app/services/doctor' },
  { id: 'pharmacy', label: 'Pharmacy', path: '/app/services/pharmacy' },
  { id: 'laboratory', label: 'Laboratory', path: '/app/services/laboratory' },
  { id: 'radiology', label: 'Radiology', path: '/app/services/radiology' },
  { id: 'hospital', label: 'Hospital', path: '/app/services/hospital' },
  { id: 'clinic', label: 'Clinic', path: '/app/services/clinic' },
]

const SEARCHABLE_PAGES = [
  { label: 'Appointments', keywords: ['appointment', 'appointments', 'booking', 'bookings', 'schedule'], path: ROUTES.APPOINTMENTS },
  { label: 'Healthcare Credit', keywords: ['credit', 'wallet', 'balance', 'loan', 'limit'], path: ROUTES.CREDIT_WALLET },
  { label: 'Invoices & Claims', keywords: ['invoice', 'invoices', 'bill', 'bills'], path: ROUTES.INVOICE_LIST },
  { label: 'Transactions', keywords: ['transaction', 'transactions', 'payment', 'payments'], path: ROUTES.TRANSACTIONS },
  { label: 'Profile & Settings', keywords: ['profile', 'setting', 'settings', 'account', 'password'], path: ROUTES.PROFILE },
  { label: 'Find a Service', keywords: ['find', 'service', 'services', 'provider'], path: ROUTES.FIND_SERVICE },
]

const BOTTOM_NAV = [
  { id: 'dashboard',    label: 'Home',         path: ROUTES.DASHBOARD,     icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="9" y="1" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="1" y="9" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="9" y="9" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/></svg> },
  { id: 'services',     label: 'Services',     path: ROUTES.FIND_SERVICE,  icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><line x1="11" y1="11" x2="14.5" y2="14.5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id: 'appointments', label: 'Appointments', path: ROUTES.APPOINTMENTS,  icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="1" y="2.5" width="14" height="12" rx="2" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.4"/><path d="M1 6.5h14M5 1v3M11 1v3" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="10.5" r="1.4" fill={a ? C.blue500 : C.textSub}/></svg> },
  { id: 'invoices',     label: 'Invoices',     path: ROUTES.INVOICE_LIST,  icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="2" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><line x1="5.5" y1="5" x2="10.5" y2="5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/><line x1="5.5" y1="8" x2="10.5" y2="8" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { id: 'profile',      label: 'Profile',      path: ROUTES.PROFILE,       icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg> },
]

export function AppLayout({ children, title, status, back = false, backLabel }: AppLayoutProps) {
  const { isDesktop } = useResponsive()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileSearchQuery, setMobileSearchQuery] = useState('')
  const navigate = useNavigate()
  const logoutMutation = useLogoutMutation()
  const { data: profile } = usePatientProfile()
  const { data: notifications } = usePatientNotifications()
  const { data: providers = [] } = useProviders()
  const { patientNotifs, openPanel } = useNotificationsStore()
  const unreadCount = patientNotifs.filter(n => !n.read).length

  const mobileTrimmed = mobileSearchQuery.trim().toLowerCase()

  const mobileMatchedCategories = useMemo(() => {
    if (!mobileTrimmed) return []
    return SEARCHABLE_CATEGORIES.filter(c =>
      c.label.toLowerCase().includes(mobileTrimmed) ||
      c.id.includes(mobileTrimmed)
    )
  }, [mobileTrimmed])

  const mobileMatchedProviders = useMemo(() => {
    if (!mobileTrimmed) return []
    return providers.filter(p => {
      const blob = [p.name, p.category, ...(p.categories ?? []), p.address, ...(p.services ?? [])].join(' ').toLowerCase()
      return blob.includes(mobileTrimmed)
    }).slice(0, 4)
  }, [mobileTrimmed, providers])

  const mobileMatchedPages = useMemo(() => {
    if (!mobileTrimmed) return []
    return SEARCHABLE_PAGES.filter(p =>
      p.label.toLowerCase().includes(mobileTrimmed) ||
      p.keywords.some(k => k.includes(mobileTrimmed))
    ).slice(0, 2)
  }, [mobileTrimmed])

  useEffect(() => {
    if (!profile) return

    useUserStore.setState({
      user: profile.user,
      beneficiaries: profile.beneficiaries,
    })
  }, [profile])

  useEffect(() => {
    if (!notifications) return

    useNotificationsStore.setState({
      patientNotifs: notifications,
    })
  }, [notifications])

  useEffect(() => {
    useLocationStore.getState().requestLocation()
  }, [])

  const handleSignOut = () => {
    setMenuOpen(false)
    logoutMutation.mutate()
  }

  const handleMobileSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = mobileSearchQuery.trim()
    if (!q) return
    setMobileSearchOpen(false)
    navigate(`/app/services?q=${encodeURIComponent(q)}`)
  }

  const handleMobileSelect = (path: string) => {
    navigate(path)
    setMobileSearchOpen(false)
    setMobileSearchQuery('')
  }

  if (isDesktop) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#EEF4FB',
        padding: '16px 20px 16px 16px',
        gap: '20px',
        boxSizing: 'border-box',
      }}>
        <AppSidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <AppTopBar title={title} status={status} back={back} backLabel={backLabel} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '0 8px 24px 8px' }}>
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      {/* Mobile top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: C.navy800,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minHeight: '58px',
        boxSizing: 'border-box',
      }}>
        {mobileSearchOpen ? (
          /* Active Search Bar in Header */
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(false)
                setMobileSearchQuery('')
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.85)',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
              aria-label="Back"
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <form
              onSubmit={handleMobileSearchSubmit}
              style={{
                flex: 1,
                background: '#FFFFFF',
                borderRadius: '9999px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                autoFocus
                type="text"
                value={mobileSearchQuery}
                onChange={e => setMobileSearchQuery(e.target.value)}
                placeholder="Search services, providers..."
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
              {mobileSearchQuery && (
                <button
                  type="button"
                  onClick={() => setMobileSearchQuery('')}
                  style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </form>

            <button
              type="button"
              onClick={handleMobileSearchSubmit}
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
          /* Normal Header */
          <>
            {back ? (
              <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px', flexShrink: 0 }} aria-label={backLabel || "Back"}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ) : (
              <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px', flexShrink: 0 }} aria-label="Menu">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            )}

            {!back && (
              <img
                src={LOGO}
                alt="GG'APP"
                style={{ width: 30, height: 30, objectFit: 'contain', flexShrink: 0, borderRadius: 6 }}
              />
            )}

            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>{title}</div>
              {status && (
                <span style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: radius.full,
                  background: 'rgba(56,182,255,0.18)',
                  color: C.blue300,
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: font.family,
                }}>
                  {status}
                </span>
              )}
            </div>

            {/* Mobile Header Search Button */}
            <button
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search"
              title="Search"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.85)',
                flexShrink: 0,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* Notifications Bell */}
            <button onClick={openPanel} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px', flexShrink: 0 }} aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 4-1.5 5h14c-.7-1-1.5-2.5-1.5-5A5.5 5.5 0 009 2z" stroke="currentColor" strokeWidth="1.4"/><path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/></svg>
              {unreadCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: C.error }} />}
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.85)',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Mobile Search Autocomplete Panel Overlay */}
      {mobileSearchOpen && (
        <div
          onClick={() => setMobileSearchOpen(false)}
          style={{
            position: 'fixed',
            top: 58,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(9, 28, 68, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 25,
            padding: '10px 14px',
            boxSizing: 'border-box',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '12px',
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              boxShadow: '0 12px 36px rgba(9, 28, 68, 0.2)',
              fontFamily: font.family,
            }}
          >
            {mobileTrimmed.length === 0 ? (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: C.textSub, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Popular Categories
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {SEARCHABLE_CATEGORIES.slice(0, 6).map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleMobileSelect(cat.path)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: font.family,
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 700, color: C.navy800 }}>{cat.label}</span>
                      <span style={{ marginLeft: 'auto', color: C.blue500, fontSize: '12px' }}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {/* Categories */}
                {mobileMatchedCategories.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: C.textSub, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Categories
                    </div>
                    {mobileMatchedCategories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleMobileSelect(cat.path)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: '#F8FAFC',
                          border: 'none',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '4px',
                          fontFamily: font.family,
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.navy800 }}>{cat.label}</span>
                        <span style={{ fontSize: '11px', color: C.blue500, fontWeight: 700 }}>View →</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Providers */}
                {mobileMatchedProviders.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: C.textSub, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Providers
                    </div>
                    {mobileMatchedProviders.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleMobileSelect(`/app/services/provider/${p.id}`)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: '#F8FAFC',
                          border: 'none',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                          fontFamily: font.family,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: C.navy800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.category} · {p.address}</div>
                        </div>
                        <span style={{ fontSize: '11px', color: C.blue500, fontWeight: 700 }}>→</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Pages */}
                {mobileMatchedPages.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: C.textSub, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Pages
                    </div>
                    {mobileMatchedPages.map(page => (
                      <button
                        key={page.path}
                        type="button"
                        onClick={() => handleMobileSelect(page.path)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: '#F8FAFC',
                          border: 'none',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '4px',
                          fontFamily: font.family,
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.navy800 }}>{page.label}</span>
                        <span style={{ fontSize: '11px', color: C.blue500, fontWeight: 700 }}>Open →</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Search All Action */}
                <button
                  type="button"
                  onClick={handleMobileSearchSubmit}
                  style={{
                    width: '100%',
                    background: C.blue100,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    cursor: 'pointer',
                    color: C.blue500,
                    fontSize: '13px',
                    fontWeight: 700,
                    textAlign: 'center',
                    marginTop: '6px',
                    fontFamily: font.family,
                  }}
                >
                  Search full directory for &ldquo;{mobileSearchQuery}&rdquo; →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-out drawer — matches desktop sidebar nav */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(8,21,40,0.55)' }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 280, zIndex: 50, background: C.navy800, display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(13,30,66,0.2)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <img src={LOGO} alt="GG'APP" style={{ width: 72, height: 72, objectFit: 'contain' }} />
              <button
                onClick={() => setMenuOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: '6px' }}
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <nav style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
              {PATIENT_NAV.map(item => {
                const active = isPatientNavActive(pathname, item)
                return (
                  <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: radius.sm,
                      marginBottom: '2px',
                      background: active ? 'rgba(74,173,223,0.15)' : 'transparent',
                      color: active ? C.blue500 : 'rgba(255,255,255,0.90)',
                      fontSize: '14px',
                      fontWeight: active ? 700 : 500,
                      fontFamily: font.family,
                    }}>
                      <span style={{ flexShrink: 0 }}>
                        <PatientNavIcon id={item.id} active={active} />
                      </span>
                      {item.label}
                      {active && (
                        <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: C.blue500 }} />
                      )}
                    </div>
                  </NavLink>
                )
              })}
            </nav>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px 16px' }}>
              <button
                onClick={handleSignOut}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: radius.sm, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.38)', fontSize: '13px', fontWeight: 500, fontFamily: font.family, cursor: 'pointer' }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      <main style={{ flex: 1, padding: '16px', paddingBottom: '72px' }}>
        {children}
      </main>

      <NotificationPanel role="patient" />

      {/* Bottom tab bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: '#fff',
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        boxShadow: '0 -4px 16px rgba(13,30,66,0.08)',
      }}>
        {BOTTOM_NAV.map(item => (
          <NavLink key={item.id} to={item.path} style={{ flex: 1, textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 4px', color: isActive ? C.blue500 : C.textSub }}>
                {item.icon(isActive)}
                <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, fontFamily: font.family }}>{item.label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
