# Shared layouts

Full sources for root, portal, navigation, and authentication layout components follow. The authentication split shell is composed in each screen; its reusable desktop and compact brand regions are included here.

## App
- Source: `src/App.tsx`
- Description: Root UI composition: error boundary, connectivity banner, and application router.

```tsx
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import { OfflineBanner } from '@/components/OfflineBanner'
import { AppRouter } from '@/router/AppRouter'

export default function App() {
  return (
    <AppErrorBoundary>
      <OfflineBanner />
      <AppRouter />
    </AppErrorBoundary>
  )
}
```

## main
- Source: `src/main.tsx`
- Description: Browser entry shell: strict mode, BrowserRouter, and application providers.

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from '@/providers/AppProviders'
import App from './App'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)

declare global {
  interface Window {
    __GG_APP_BOOT__?: {
      mounted?: boolean
    }
  }
}

if (window.__GG_APP_BOOT__) {
  window.__GG_APP_BOOT__.mounted = true
}
```

## AppProviders
- Source: `src/providers/AppProviders.tsx`
- Description: Shared data/session provider shell used by the entire application.

```tsx
import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { queryClient } from '@/lib/query-client'
import { idbQueryPersister } from '@/lib/query-persister'
import { NewsProvider } from '@/providers/NewsProvider'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationsStore } from '@/store/notifications.store'
import { useUserStore } from '@/store/user.store'
import { queryKeys } from '@/api/query-keys'
import { patientService } from '@/api/services/patient.service'
import { spService } from '@/api/services/sp.service'
import { registerPWA } from '@/services/pwa'
import { isMockApi } from '@/api/config'
import { tokenStorage } from '@/lib/token-storage'
import { authService } from '@/api/services/auth.service'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

function SessionBootstrap() {
  const { loggedIn, userRole, setSession, logout } = useAuthStore()
  const isOnline = useOnlineStatus()

  useEffect(() => {
    void (async () => {
      const stored = tokenStorage.getSession()
      if (!stored) {
        logout()
        return
      }

      // Offline: keep the persisted session instead of treating an
      // unreachable refresh endpoint as an expired/invalid session.
      // The token refresh happens lazily once connectivity returns.
      if (!navigator.onLine) {
        setSession(stored.role)
        return
      }

      try {
        const session = await authService.refreshSession()
        if (session) {
          setSession(session.role)
          return
        }
      } catch {
        useUserStore.getState().reset()
        useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      }
      if (!isMockApi) {
        useUserStore.getState().reset()
        useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      }
      logout()
    })()
  }, [setSession, logout])

  useEffect(() => {
    // Skip hydration while offline — queries restored from IndexedDB
    // already carry the last known data.
    if (!loggedIn || !isOnline) return

    void (async () => {
      if (userRole === 'patient') {
        try {
          const { userMode } = useAuthStore.getState()
          const [profile, notifications] = await Promise.all([
            patientService.getProfile(userMode),
            patientService.getNotifications(userMode),
          ])
          useUserStore.setState({
            user: profile.user,
            beneficiaries: profile.beneficiaries,
          })
          queryClient.setQueryData(queryKeys.patient.profile(userMode), profile)
          useNotificationsStore.setState({ patientNotifs: notifications })
        } catch {
          useUserStore.getState().reset()
          useNotificationsStore.setState({ patientNotifs: [] })
        }
      }

      if (userRole === 'sp') {
        const { spMode } = useAuthStore.getState()
        const dashboard = await spService.getDashboard(spMode)
        useNotificationsStore.setState({ spNotifs: dashboard.notifications })
      }
    })()
  }, [loggedIn, userRole, isOnline])

  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerPWA()
  }, [])

  useEffect(() => {
    // Persist the query cache to IndexedDB so offline restarts still
    // render the last known data. Restores are merged as a background
    // subscription; mutations are intentionally not resumed.
    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister: idbQueryPersister,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      dehydrateOptions: {
        shouldDehydrateQuery: query => query.state.status === 'success',
      },
    })
    return unsubscribe
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <NewsProvider>
        <SessionBootstrap />
        {children}
      </NewsProvider>
    </QueryClientProvider>
  )
}
```

## AppLayout
- Source: `src/layouts/patient/AppLayout.tsx`
- Description: Patient portal shell coordinating responsive navigation and content.

```tsx
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ROUTES, LOGO } from '@/router/routes'
import { C, font, radius } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useNotificationsStore } from '@/store/notifications.store'
import { useUserStore } from '@/store/user.store'
import { NotificationPanel } from '@/components/NotificationPanel'
import { useLogoutMutation, usePatientNotifications, usePatientProfile } from '@/hooks/api'
import { AppSidebar } from './AppSidebar'
import { AppTopBar } from './AppTopBar'
import { PATIENT_NAV, PatientNavIcon, isPatientNavActive } from './patientNav'
import { useLocationStore } from '@/store/location.store'

interface AppLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  notifCount?: number
  back?: boolean
  backLabel?: string
}

const BOTTOM_NAV = [
  { id: 'dashboard',    label: 'Home',       path: ROUTES.DASHBOARD,     icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="9" y="1" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="1" y="9" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="9" y="9" width="6" height="6" rx="1.5" fill={a ? C.blue500 : C.textSub}/></svg> },
  { id: 'services',     label: 'Services',   path: ROUTES.FIND_SERVICE,      icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><line x1="11" y1="11" x2="14.5" y2="14.5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { id: 'credit',       label: 'Wallet',     path: ROUTES.CREDIT_WALLET,        icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="9" rx="2" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><path d="M1 7h14" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/></svg> },
  { id: 'invoices',     label: 'Invoices',   path: ROUTES.INVOICE_LIST,      icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="2" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><line x1="5.5" y1="5" x2="10.5" y2="5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/><line x1="5.5" y1="8" x2="10.5" y2="8" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { id: 'profile',      label: 'Profile',    path: ROUTES.PROFILE,       icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5"/><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg> },
]

export function AppLayout({ children, title, subtitle, back = false, backLabel }: AppLayoutProps) {
  const { isDesktop } = useResponsive()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const logoutMutation = useLogoutMutation()
  const { data: profile } = usePatientProfile()
  const { data: notifications } = usePatientNotifications()
  const { patientNotifs, openPanel } = useNotificationsStore()
  const unreadCount = patientNotifs.filter(n => !n.read).length

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

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg }}>
        <AppSidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppTopBar title={title} subtitle={subtitle} back={back} backLabel={backLabel} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
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
        position: 'sticky', top: 0, zIndex: 20,
        background: C.navy800,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        {back ? (
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        ) : (
          <button onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px', flexShrink: 0 }}>
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

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: font.family, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>}
        </div>

        <button onClick={openPanel} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '4px', flexShrink: 0 }} aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 4-1.5 5h14c-.7-1-1.5-2.5-1.5-5A5.5 5.5 0 009 2z" stroke="currentColor" strokeWidth="1.4"/><path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/></svg>
          {unreadCount > 0 && <span style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: C.error }} />}
        </button>

        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.85)',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

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
```

## AppTopBar
- Source: `src/layouts/patient/AppTopBar.tsx`
- Description: Patient desktop/tablet top application bar.

```tsx
import { useNavigate } from 'react-router-dom'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useNotificationsStore } from '@/store/notifications.store'
import { NotificationPanel } from '@/components/NotificationPanel'
import { FlagImg } from '@/components/FlagImg'
import { usePatientProfile } from '@/hooks/api'
import { useUserStore } from '@/store/user.store'
import { EMPTY_PATIENT, getPatientDisplayName, getPatientInitials } from '@/features/patient/patientAccount'
import { getCountryByCode } from '@/config/countries'
import { ROUTES } from '@/router/routes'

interface AppTopBarProps {
  title: string
  subtitle?: string
  notifCount?: number
  back?: boolean
  backLabel?: string
}

export function AppTopBar({ title, subtitle, back = false, backLabel = 'Back' }: AppTopBarProps) {
  const navigate = useNavigate()
  const { patientNotifs, openPanel } = useNotificationsStore()
  const unreadCount = patientNotifs.filter(n => !n.read).length
  const storedUser = useUserStore(s => s.user)
  const { data: profile } = usePatientProfile()
  const user = profile?.user ?? storedUser ?? EMPTY_PATIENT
  const displayName = getPatientDisplayName(user)
  const countryName =
    getCountryByCode(user.countryCode)?.name ??
    user.country ??
    user.residenceCountry ??
    '—'

  return (
    <>
      <div style={{
        background: '#fff',
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: shadow.sm,
      }}>
        {back && (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textSub,
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: font.family,
              padding: '6px 12px 6px 8px',
              borderRadius: '8px',
              transition: 'background 0.13s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {backLabel}
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, fontFamily: font.family, letterSpacing: '-0.03em' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family, marginTop: '2px' }}>
              {subtitle}
            </div>
          )}
        </div>

        <button
          onClick={openPanel}
          style={{
            position: 'relative',
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: C.textSub,
            transition: 'all 0.13s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.blue100; e.currentTarget.style.color = C.blue500 }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.textSub }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 4-1.5 5h14c-.7-1-1.5-2.5-1.5-5A5.5 5.5 0 009 2z" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -4, right: -4,
              background: C.error,
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: font.family,
              width: 18, height: 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate(ROUTES.PROFILE)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            borderRadius: radius.md,
            border: `1px solid ${C.border}`,
            background: C.bg,
            cursor: 'pointer',
            flexShrink: 0,
            maxWidth: '280px',
            transition: 'background 0.13s, border-color 0.13s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.blue100
            e.currentTarget.style.borderColor = `${C.blue500}44`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = C.bg
            e.currentTarget.style.borderColor = C.border
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.blue500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: font.family }}>
              {getPatientInitials(user)}
            </span>
          </div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: C.text,
              fontFamily: font.family,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayName}
            </div>
            <div style={{
              fontSize: '11px',
              color: C.textSub,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: font.family,
              marginTop: '2px',
            }}>
              <FlagImg code={user.countryCode} size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{countryName}</span>
            </div>
          </div>
        </button>
      </div>

      <NotificationPanel role="patient" />
    </>
  )
}
```

## AppSidebar
- Source: `src/layouts/patient/AppSidebar.tsx`
- Description: Patient desktop sidebar navigation.

```tsx
import { NavLink, useLocation } from 'react-router-dom'
import { LOGO } from '@/router/routes'
import { C, font, radius } from '@/design-system/tokens'
import { useLogoutMutation } from '@/hooks/api'
import { PATIENT_NAV, PatientNavIcon, isPatientNavActive } from './patientNav'

export function AppSidebar() {
  const { pathname } = useLocation()
  const logoutMutation = useLogoutMutation()

  return (
    <div style={{
      width: 210,
      minHeight: '100vh',
      background: C.navy800,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      boxShadow: '4px 0 24px rgba(13,30,66,0.14)',
    }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={LOGO} alt="GG'APP" style={{ width: 102, height: 102, objectFit: 'contain' }} />
      </div>

      <nav style={{ padding: '8px 10px', flex: 1 }}>
        {PATIENT_NAV.map(item => {
          const active = isPatientNavActive(pathname, item)
          return (
            <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: radius.sm,
                marginBottom: '2px',
                background: active ? 'rgba(74,173,223,0.15)' : 'transparent',
                color: active ? C.blue500 : 'rgba(255,255,255,0.90)',
                fontSize: '14px',
                fontWeight: active ? 700 : 500,
                fontFamily: font.family,
                cursor: 'pointer',
                transition: 'all 0.14s ease',
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
          onClick={() => logoutMutation.mutate()}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: radius.sm, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.38)', fontSize: '13px', fontWeight: 500, fontFamily: font.family, cursor: 'pointer', transition: 'color 0.14s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.38)')}
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
  )
}
```

## MobileSheet
- Source: `src/layouts/patient/MobileSheet.tsx`
- Description: Patient mobile overlay/sheet navigation.

```tsx
import type { ReactNode } from 'react'
import { C, font, radius, shadow } from '@/design-system/tokens'

interface MobileSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  fullHeight?: boolean
}

export function MobileSheet({ isOpen, onClose, title, children, fullHeight = false }: MobileSheetProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(8,21,40,0.55)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 50,
        background: '#fff',
        borderRadius: `${radius.xl} ${radius.xl} 0 0`,
        boxShadow: shadow.xl,
        maxHeight: fullHeight ? '92vh' : '70vh',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUp 0.22s ease',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: radius.full, background: C.border }} />
        </div>

        {title && (
          <div style={{
            padding: '8px 20px 14px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: C.text, fontFamily: font.family }}>
              {title}
            </span>
            <button
              onClick={onClose}
              style={{ background: C.bg, border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSub }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {children}
        </div>
      </div>

      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </>
  )
}
```

## patientNav
- Source: `src/layouts/patient/patientNav.tsx`
- Description: Shared patient navigation definitions and icon renderers.

```tsx
import type { ReactElement } from 'react'
import { ROUTES, route } from '@/router/routes'
import { C } from '@/design-system/tokens'

export interface PatientNavItem {
  id: string
  label: string
  path: string
  matchPaths?: string[]
}

export const PATIENT_NAV: PatientNavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',      path: ROUTES.DASHBOARD },
  { id: 'services',     label: 'Find Service',   path: ROUTES.FIND_SERVICE, matchPaths: [ROUTES.FIND_SERVICE, ROUTES.BOOKING] },
  { id: 'appointments', label: 'Appointments',   path: ROUTES.APPOINTMENTS },
  { id: 'prescriptions', label: 'Prescriptions', path: route.providerList('pharmacy'), matchPaths: [route.providerList('pharmacy'), ROUTES.PRESCRIPTION_REQUESTS] },
  { id: 'credit',       label: 'Wallet',         path: ROUTES.CREDIT_WALLET },
  { id: 'invoices',     label: 'Invoices',       path: ROUTES.INVOICE_LIST },
  { id: 'transactions', label: 'Transactions',   path: ROUTES.TRANSACTIONS },
  { id: 'ledger',       label: 'Health Ledger',  path: ROUTES.LEDGER },
  { id: 'profile',      label: 'My Profile',     path: ROUTES.PROFILE },
]

export function isPatientNavActive(pathname: string, item: PatientNavItem) {
  if (item.matchPaths) return item.matchPaths.some(p => pathname.startsWith(p))
  return pathname.startsWith(item.path)
}

export function PatientNavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? C.blue500 : 'currentColor'
  const op = active ? 1 : 0.6

  const icons: Record<string, ReactElement> = {
    dashboard: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill={col} opacity={op}/>
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill={col} opacity={op}/>
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill={col} opacity={op}/>
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill={col} opacity={op}/>
      </svg>
    ),
    services: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke={col} strokeWidth="1.5" opacity={op}/>
        <line x1="11" y1="11" x2="14.5" y2="14.5" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity={op}/>
      </svg>
    ),
    appointments: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2.5" width="14" height="12" rx="2" stroke={col} strokeWidth="1.4" opacity={op}/>
        <path d="M1 6.5h14M5 1v3M11 1v3" stroke={col} strokeWidth="1.3" strokeLinecap="round" opacity={op}/>
        <circle cx="8" cy="10.5" r="1.4" fill={col} opacity={op}/>
      </svg>
    ),
    prescriptions: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="2" width="10" height="12" rx="2" stroke={col} strokeWidth="1.4" opacity={op}/>
        <line x1="8" y1="5" x2="8" y2="11" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity={op}/>
        <line x1="5" y1="8" x2="11" y2="8" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity={op}/>
      </svg>
    ),
    credit: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="4" width="14" height="9" rx="2" stroke={col} strokeWidth="1.5" opacity={op}/>
        <path d="M1 7h14" stroke={col} strokeWidth="1.5" opacity={op}/>
        <circle cx="11.5" cy="10.5" r="1.5" fill={col} opacity={op}/>
      </svg>
    ),
    invoices: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="1" width="10" height="14" rx="2" stroke={col} strokeWidth="1.5" opacity={op}/>
        <line x1="5.5" y1="5" x2="10.5" y2="5" stroke={col} strokeWidth="1.3" strokeLinecap="round" opacity={op}/>
        <line x1="5.5" y1="8" x2="10.5" y2="8" stroke={col} strokeWidth="1.3" strokeLinecap="round" opacity={op}/>
        <line x1="5.5" y1="11" x2="8.5" y2="11" stroke={col} strokeWidth="1.3" strokeLinecap="round" opacity={op}/>
      </svg>
    ),
    transactions: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 5h12M2 8h8M2 11h5" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity={op}/>
        <path d="M12 10l2 2-2 2" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={op}/>
      </svg>
    ),
    profile: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5.5" r="3" stroke={col} strokeWidth="1.5" opacity={op}/>
        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={col} strokeWidth="1.5" strokeLinecap="round" opacity={op}/>
      </svg>
    ),
    ledger: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1.5" width="12" height="13" rx="2" stroke={col} strokeWidth="1.4" opacity={op}/>
        <path d="M8 5v4M6 7h4" stroke={col} strokeWidth="1.4" strokeLinecap="round" opacity={op}/>
        <path d="M5 11.5h6" stroke={col} strokeWidth="1.3" strokeLinecap="round" opacity={op}/>
      </svg>
    ),
  }
  return icons[id] ?? null
}
```

## SPLayout
- Source: `src/layouts/sp/SPLayout.tsx`
- Description: Service-provider portal responsive shell.

```tsx
import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, font, shadow } from '@/design-system/tokens'
import { useResponsive } from '@/hooks/useResponsive'
import { useNotificationsStore } from '@/store/notifications.store'
import { useLogoutMutation, useSPNotifications } from '@/hooks/api'
import { NotificationPanel } from '@/components/NotificationPanel'
import { SPSidebar } from './SPSidebar'
import { SPTopBar } from './SPTopBar'
import { SPBottomNav } from './SPBottomNav'

interface SPLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  notifCount?: number
  back?: boolean
}

export function SPLayout({ children, title, subtitle, back = false }: SPLayoutProps) {
  const { isDesktop } = useResponsive()
  const navigate = useNavigate()
  const logoutMutation = useLogoutMutation()
  const { data: notifications } = useSPNotifications()
  const { spNotifs, openPanel } = useNotificationsStore()
  const unreadCount = spNotifs.filter(n => !n.read).length

  useEffect(() => {
    if (notifications) {
      useNotificationsStore.setState({ spNotifs: notifications })
    }
  }, [notifications])

  const handleSignOut = () => {
    logoutMutation.mutate()
  }

  const topBar = (dark = false) => (
    <div style={{
      background: dark ? C.navy800 : '#fff',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : C.border}`,
      padding: dark ? '12px 16px' : '16px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      boxShadow: shadow.sm,
    }}>
      {back && (
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: dark ? 'rgba(255,255,255,0.8)' : C.textSub, padding: '4px', flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: dark ? '15px' : '18px', fontWeight: 800, color: dark ? '#fff' : C.text, fontFamily: font.family, letterSpacing: '-0.03em' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: '12px', color: dark ? 'rgba(255,255,255,0.6)' : C.textSub, fontFamily: font.family, marginTop: '1px' }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Notification bell */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={openPanel}
          style={{
            background: dark ? 'rgba(255,255,255,0.08)' : C.bg,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : C.border}`,
            borderRadius: '10px', width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: dark ? 'rgba(255,255,255,0.8)' : C.textSub,
            transition: 'all 0.13s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.15)' : C.blue100; e.currentTarget.style.color = dark ? '#fff' : C.blue500 }}
          onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : C.bg; e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.8)' : C.textSub }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 4-1.5 5h14c-.7-1-1.5-2.5-1.5-5A5.5 5.5 0 009 2z" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </button>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            width: unreadCount > 9 ? 'auto' : 18,
            height: 18, minWidth: 18,
            padding: unreadCount > 9 ? '0 4px' : '0',
            borderRadius: '9px',
            background: C.error, color: '#fff',
            fontSize: '10px', fontWeight: 700, fontFamily: font.family,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Sign Out (Mobile only) */}
      {!isDesktop && (
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px', width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.8)',
            transition: 'all 0.13s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg }}>
        <SPSidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <SPTopBar title={title} subtitle={subtitle} back={back} />
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: C.bg }}>
      {topBar(true)}
      <main style={{ flex: 1, padding: '16px', paddingBottom: '72px' }}>
        {children}
      </main>
      <SPBottomNav />
      <NotificationPanel role="sp" />
    </div>
  )
}
```

## SPTopBar
- Source: `src/layouts/sp/SPTopBar.tsx`
- Description: Service-provider top application bar.

```tsx
import { useNavigate } from 'react-router-dom'
import { C, font, radius, shadow } from '@/design-system/tokens'
import { useNotificationsStore } from '@/store/notifications.store'
import { NotificationPanel } from '@/components/NotificationPanel'
import { FlagImg } from '@/components/FlagImg'
import { useSPProfile } from '@/hooks/api'
import { getCountryByName } from '@/config/countries'
import { ROUTES } from '@/router/routes'

interface SPTopBarProps {
  title: string
  subtitle?: string
  back?: boolean
  backLabel?: string
}

function getProviderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'SP'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export function SPTopBar({ title, subtitle, back = false, backLabel = 'Back' }: SPTopBarProps) {
  const navigate = useNavigate()
  const { spNotifs, openPanel } = useNotificationsStore()
  const unreadCount = spNotifs.filter(n => !n.read).length
  const { data: profile } = useSPProfile()

  const providerName = profile?.name ?? 'Provider'
  const countryConfig = getCountryByName(profile?.country ?? '')
  const countryName = countryConfig?.name ?? profile?.country ?? '—'
  const countryCode = countryConfig?.code
  const providerLogoUrl = profile?.logoUrl
  const providerInitials = getProviderInitials(providerName)

  return (
    <>
      <div style={{
        background: '#fff',
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: shadow.sm,
      }}>
        {back && (
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.textSub,
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: font.family,
              padding: '6px 12px 6px 8px',
              borderRadius: '8px',
              transition: 'background 0.13s',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {backLabel}
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, fontFamily: font.family, letterSpacing: '-0.03em' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '13px', color: C.textSub, fontFamily: font.family, marginTop: '2px' }}>
              {subtitle}
            </div>
          )}
        </div>

        <button
          onClick={openPanel}
          style={{
            position: 'relative',
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: C.textSub,
            transition: 'all 0.13s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.blue100; e.currentTarget.style.color = C.blue500 }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.textSub }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2a5.5 5.5 0 00-5.5 5.5c0 2.5-.8 4-1.5 5h14c-.7-1-1.5-2.5-1.5-5A5.5 5.5 0 009 2z" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -4, right: -4,
              background: C.error,
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: font.family,
              width: 18, height: 18,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate(ROUTES.SP_SETTINGS)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
            borderRadius: radius.md,
            border: `1px solid ${C.border}`,
            background: C.bg,
            cursor: 'pointer',
            flexShrink: 0,
            maxWidth: '280px',
            transition: 'background 0.13s, border-color 0.13s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.blue100
            e.currentTarget.style.borderColor = `${C.blue500}44`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = C.bg
            e.currentTarget.style.borderColor = C.border
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: C.blue500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {providerLogoUrl ? (
              <img src={providerLogoUrl} alt={providerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: font.family }}>
                {providerInitials}
              </span>
            )}
          </div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 700,
              color: C.text,
              fontFamily: font.family,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {providerName}
            </div>
            <div style={{
              fontSize: '11px',
              color: C.textSub,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontFamily: font.family,
              marginTop: '2px',
            }}>
              {countryCode && <FlagImg code={countryCode} size={14} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{countryName}</span>
            </div>
          </div>
        </button>
      </div>

      <NotificationPanel role="sp" />
    </>
  )
}
```

## SPSidebar
- Source: `src/layouts/sp/SPSidebar.tsx`
- Description: Service-provider desktop sidebar.

```tsx
import type { ReactElement } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useLogoutMutation, useSPProfile } from '@/hooks/api'
import { C, font, radius } from '@/design-system/tokens'
import { LOGO, ROUTES } from '@/router/routes'

interface NavItem {
  id: string
  label: string
  path: string
  matchPaths?: string[]
}

const SP_NAV: NavItem[] = [
  { id: 'sp-dashboard', label: 'Dashboard', path: ROUTES.SP_DASHBOARD },
  { id: 'sp-appointments', label: 'Appointments', path: ROUTES.SP_APPOINTMENTS },
  { id: 'sp-prescriptions', label: 'Prescriptions', path: ROUTES.SP_PRESCRIPTIONS, matchPaths: ['/sp/prescriptions'] },
  { id: 'sp-patients', label: 'Patient Ledger', path: ROUTES.SP_PATIENTS },
  { id: 'sp-invoice', label: 'Invoices', path: ROUTES.SP_INVOICES },
  { id: 'sp-payments', label: 'Payments', path: ROUTES.SP_PAYMENTS },
  { id: 'sp-settings', label: 'Settings', path: ROUTES.SP_SETTINGS },
]

function SPNavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? C.blue500 : 'currentColor'
  const icons: Record<string, ReactElement> = {
    'sp-dashboard': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill={col} /><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill={col} /><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col} /><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col} /></svg>,
    'sp-appointments': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke={col} strokeWidth="1.3" /><path d="M1 6h13" stroke={col} strokeWidth="1.3" /><line x1="5" y1="1" x2="5" y2="4" stroke={col} strokeWidth="1.3" strokeLinecap="round" /><line x1="10" y1="1" x2="10" y2="4" stroke={col} strokeWidth="1.3" strokeLinecap="round" /><circle cx="7.5" cy="9.5" r="1.5" fill={col} /></svg>,
    'sp-prescriptions': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="2" stroke={col} strokeWidth="1.3"/><line x1="7.5" y1="4.5" x2="7.5" y2="10.5" stroke={col} strokeWidth="1.4" strokeLinecap="round"/><line x1="4.5" y1="7.5" x2="10.5" y2="7.5" stroke={col} strokeWidth="1.4" strokeLinecap="round"/></svg>,
    'sp-patients': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="5.5" cy="4.5" r="2.5" stroke={col} strokeWidth="1.3" /><path d="M1 13c0-2.5 2-4.5 4.5-4.5S10 10.5 10 13" stroke={col} strokeWidth="1.3" strokeLinecap="round" /><circle cx="11.5" cy="5" r="1.8" stroke={col} strokeWidth="1.3" /><path d="M12 8.5c1.4.3 2.5 1.5 2.5 3" stroke={col} strokeWidth="1.3" strokeLinecap="round" /></svg>,
    'sp-invoice': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2" y="1" width="11" height="13" rx="1.5" stroke={col} strokeWidth="1.3" /><path d="M5 5h5M5 8h5M5 11h3" stroke={col} strokeWidth="1.1" strokeLinecap="round" /></svg>,
    'sp-payments': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3.5" width="13" height="8" rx="1.5" stroke={col} strokeWidth="1.3" /><path d="M1 6.5h13" stroke={col} strokeWidth="1.3" /><circle cx="11" cy="9.5" r="1.3" fill={col} /></svg>,
    'sp-settings': <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke={col} strokeWidth="1.3" /><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.9 2.9l1.1 1.1M11 11l1.1 1.1M2.9 12.1l1.1-1.1M11 4l1.1-1.1" stroke={col} strokeWidth="1.3" strokeLinecap="round" /></svg>,
  }
  return icons[id] ?? null
}

export function SPSidebar() {
  const { pathname } = useLocation()
  const logoutMutation = useLogoutMutation()
  const { data: profile } = useSPProfile()

  const isPharmacyOnly = profile?.isPharmacyOnly ?? false
  const navItems = SP_NAV.filter(item => {
    if (item.id === 'sp-appointments') return !isPharmacyOnly
    return true
  })

  const isActive = (item: NavItem) => {
    if (item.matchPaths) return item.matchPaths.some(path => pathname.startsWith(path))
    return pathname.startsWith(item.path)
  }

  return (
    <div
      style={{
        width: 210,
        minHeight: '100vh',
        background: C.navy800,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        boxShadow: '4px 0 24px rgba(13,30,66,0.14)',
      }}
    >
      <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={LOGO} alt="GG'APP" style={{ width: 102, height: 102, objectFit: 'contain' }} />
      </div>

      <nav style={{ padding: '8px 10px', flex: 1 }}>
        {navItems.map(item => {
          const active = isActive(item)
          return (
            <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: radius.sm,
                  marginBottom: '2px',
                  background: active ? 'rgba(56, 182, 255, 0.15)' : 'transparent',
                  color: active ? C.blue500 : 'rgba(255,255,255,0.90)',
                  fontSize: '14px',
                  fontWeight: active ? 700 : 500,
                  fontFamily: font.family,
                }}
              >
                <span style={{ flexShrink: 0 }}>
                  <SPNavIcon id={item.id} active={active} />
                </span>
                {item.label}
              </div>
            </NavLink>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px 16px' }}>
        <button
          onClick={() => logoutMutation.mutate()}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px', borderRadius: radius.sm, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: '13px', fontWeight: 500, fontFamily: font.family, cursor: 'pointer' }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}
```

## SPBottomNav
- Source: `src/layouts/sp/SPBottomNav.tsx`
- Description: Service-provider mobile bottom navigation.

```tsx
import { NavLink } from 'react-router-dom'
import { C, font } from '@/design-system/tokens'

const SP_TABS = [
  { id: 'sp-dashboard',    label: 'Home',     path: '/sp/dashboard',    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill={a ? C.blue500 : C.textSub}/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill={a ? C.blue500 : C.textSub}/></svg> },
  { id: 'sp-appointments', label: 'Appts',    path: '/sp/appointments', icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><path d="M1 6h13" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><circle cx="7.5" cy="9.5" r="1.5" fill={a ? C.blue500 : C.textSub}/></svg> },
  { id: 'sp-patients',     label: 'Patients', path: '/sp/patients',     icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><circle cx="5.5" cy="4.5" r="2.5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><path d="M1 13c0-2.5 2-4.5 4.5-4.5S10 10.5 10 13" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/></svg> },
  { id: 'sp-invoice',      label: 'Invoices', path: '/sp/invoices',     icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><rect x="2" y="1" width="11" height="13" rx="1.5" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><path d="M5 5h5M5 8h5M5 11h3" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.1" strokeLinecap="round"/></svg> },
  { id: 'sp-settings',     label: 'Settings', path: '/sp/settings',     icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3"/><path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14" stroke={a ? C.blue500 : C.textSub} strokeWidth="1.3" strokeLinecap="round"/></svg> },
]

export function SPBottomNav() {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
      background: '#fff',
      borderTop: `1px solid ${C.border}`,
      display: 'flex',
      boxShadow: '0 -4px 16px rgba(13,30,66,0.08)',
    }}>
      {SP_TABS.map(tab => (
        <NavLink key={tab.id} to={tab.path} style={{ flex: 1, textDecoration: 'none' }}>
          {({ isActive }) => (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 4px', color: isActive ? C.blue500 : C.textSub }}>
              {tab.icon(isActive)}
              <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, fontFamily: font.family }}>{tab.label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </div>
  )
}
```

## AdminLayout
- Source: `src/layouts/admin/AdminLayout.tsx`
- Description: Administration portal shell.

```tsx
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
  subtitle?: string
  back?: boolean
}

export function AdminLayout({ children, title, subtitle, back = false }: AdminLayoutProps) {
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg }}>

      {isDesktop && <AdminSidebar pendingCreditCount={pendingCreditCount} />}

      {!isDesktop && drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(5,14,34,0.6)', backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50, width: 240, animation: 'slideInLeft 0.2s ease' }}>
            <AdminSidebar onClose={() => setDrawerOpen(false)} pendingCreditCount={pendingCreditCount} />
          </div>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: '#fff',
          borderBottom: `1px solid ${C.border}`,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: shadow.sm,
        }}>
          {!isDesktop && (
            <button onClick={() => setDrawerOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, padding: '4px', display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}

          {back && (
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textSub, padding: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, fontFamily: font.family, letterSpacing: '-0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
            {subtitle && !isMobile && <div style={{ fontSize: '12px', color: C.textSub, fontFamily: font.family }}>{subtitle}</div>}
          </div>

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              style={{
                position: 'relative',
                width: 36, height: 36,
                borderRadius: radius.sm,
                background: notifOpen ? C.blue100 : C.bg,
                border: `1.5px solid ${notifOpen ? C.blue500 + '66' : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { if (!notifOpen) { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.blue500 + '44' } }}
              onMouseLeave={e => { if (!notifOpen) { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border } }}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M9 2a5.5 5.5 0 00-5.5 5.5v3L2 12.5h14l-1.5-2V7.5A5.5 5.5 0 009 2z" stroke={notifOpen ? C.blue500 : C.textSub} strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M7.5 14.5a1.5 1.5 0 003 0" stroke={notifOpen ? C.blue500 : C.textSub} strokeWidth="1.4" strokeLinecap="round" />
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

        <main style={{ flex: 1, overflowY: 'auto', padding: isDesktop ? '28px' : '20px 16px' }}>
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
```

## AdminSidebar
- Source: `src/layouts/admin/AdminSidebar.tsx`
- Description: Administration sidebar navigation.

```tsx
import type { ReactElement } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ROUTES, LOGO } from '@/router/routes'
import { C, font, radius } from '@/design-system/tokens'
import { useLogoutMutation } from '@/hooks/api'

const DIVIDER = 'rgba(255,255,255,0.07)'

interface NavItem {
  id: string
  label: string
  path: string
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'admin-dashboard', label: 'Dashboard',       path: ROUTES.ADMIN_DASHBOARD },
  { id: 'admin-sp-apps',   label: 'SP Applications', path: ROUTES.ADMIN_APPLICATIONS },
  { id: 'admin-credit-apps', label: 'Credit Applications', path: ROUTES.ADMIN_CREDIT_APPLICATIONS },
]

const MANAGEMENT_NAV: NavItem[] = [
  { id: 'admin-users',     label: 'Users',     path: ROUTES.ADMIN_USERS },
  { id: 'admin-providers', label: 'Providers', path: ROUTES.ADMIN_PROVIDERS },
  { id: 'admin-payments',  label: 'Payments',  path: ROUTES.ADMIN_PAYMENTS },
  { id: 'admin-ledger',    label: 'Ledger Access', path: ROUTES.ADMIN_LEDGER_ACCESS },
  { id: 'admin-analytics', label: 'Analytics', path: ROUTES.ADMIN_ANALYTICS },
  { id: 'admin-news',      label: 'News',      path: ROUTES.ADMIN_NEWS },
  { id: 'admin-ads',       label: 'Ads',       path: ROUTES.ADMIN_ADS },
]

function AdminNavIcon({ id, active }: { id: string; active: boolean }) {
  const col = active ? C.blue500 : 'rgba(255,255,255,0.65)'
  const icons: Record<string, ReactElement> = {
    'admin-dashboard': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill={col}/>
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill={col}/>
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col}/>
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill={col}/>
      </svg>
    ),
    'admin-sp-apps': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="1.5" width="12" height="12" rx="2" stroke={col} strokeWidth="1.3"/>
        <path d="M5 7.5h5M7.5 5v5" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    'admin-credit-apps': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="2.5" width="12" height="10" rx="1.8" stroke={col} strokeWidth="1.3"/>
        <path d="M1.5 5.5h12" stroke={col} strokeWidth="1.1"/>
        <path d="M4 8.5h4" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    'admin-users': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="5" r="3" stroke={col} strokeWidth="1.3"/>
        <path d="M2 13c0-2.76 2.46-5 5.5-5s5.5 2.24 5.5 5" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    'admin-providers': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 13V6l5.5-4L13 6v7" stroke={col} strokeWidth="1.3" strokeLinejoin="round"/>
        <rect x="5.5" y="9" width="4" height="4" rx="0.5" stroke={col} strokeWidth="1.1"/>
      </svg>
    ),
    'admin-payments': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="3.5" width="12" height="8" rx="1.5" stroke={col} strokeWidth="1.3"/>
        <path d="M1.5 6.5h12" stroke={col} strokeWidth="1.1"/>
        <path d="M4 9.5h2M9 9.5h2" stroke={col} strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    'admin-ledger': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="2" y="1.5" width="11" height="12" rx="1.8" stroke={col} strokeWidth="1.3"/>
        <path d="M7.5 5v3M6 6.5h3" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M5 10.5h5" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    'admin-analytics': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 12l3.5-4 3 2.5 4.5-6" stroke={col} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="2" cy="12" r="1" fill={col}/>
        <circle cx="5.5" cy="8" r="1" fill={col}/>
        <circle cx="8.5" cy="10.5" r="1" fill={col}/>
        <circle cx="13" cy="4.5" r="1" fill={col}/>
      </svg>
    ),
    'admin-news': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1.5" y="2" width="12" height="11" rx="1.5" stroke={col} strokeWidth="1.3"/>
        <path d="M4 5.5h7M4 8h7M4 10.5h4" stroke={col} strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    'admin-ads': (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1.5 5.5h4.5l3.5-3v9l-3.5-3H1.5a1 1 0 01-1-1v-2a1 1 0 011-1z" stroke={col} strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M9.5 5.5a2.5 2.5 0 010 4" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M11.5 3.5a5 5 0 010 8" stroke={col} strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  }
  return icons[id] ?? null
}

function NavSection({ items, label, compact, pendingCreditCount = 0 }: { items: NavItem[]; label?: string; compact?: boolean; pendingCreditCount?: number }) {
  return (
    <div>
      {label && !compact && (
        <div style={{ padding: '8px 14px 4px', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: font.family }}>
          {label}
        </div>
      )}
      {items.map(item => (
        <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: radius.sm,
                marginBottom: '2px',
                background: isActive ? 'rgba(56,182,255,0.15)' : 'transparent',
                color: isActive ? C.blue500 : 'rgba(255,255,255,0.90)',
                fontSize: '14px',
                fontWeight: isActive ? 700 : 500,
                fontFamily: font.family,
                cursor: 'pointer',
                transition: 'all 0.14s ease',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ flexShrink: 0 }}><AdminNavIcon id={item.id} active={isActive} /></span>
              {item.label}
              {item.id === 'admin-credit-apps' && pendingCreditCount > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: radius.full,
                  background: '#7C3AED',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {pendingCreditCount > 9 ? '9+' : pendingCreditCount}
                </span>
              )}
              {isActive && item.id !== 'admin-credit-apps' && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: C.blue500 }} />}
              {isActive && item.id === 'admin-credit-apps' && pendingCreditCount === 0 && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: C.blue500 }} />}
            </div>
          )}
        </NavLink>
      ))}
    </div>
  )
}

interface AdminSidebarProps {
  onClose?: () => void
  pendingCreditCount?: number
}

export function AdminSidebar({ onClose, pendingCreditCount = 0 }: AdminSidebarProps) {
  const navigate = useNavigate()
  const logoutMutation = useLogoutMutation()

  const handleLogout = () => {
    logoutMutation.mutate()
    onClose?.()
  }

  return (
    <div style={{
      width: 210,
      height: '100%',
      minHeight: '100vh',
      background: C.navy800,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      boxShadow: '4px 0 24px rgba(13,30,66,0.14)',
    }}>
      {/* Logo — same treatment as patient/SP */}
      <div style={{
        padding: '12px 18px',
        borderBottom: `1px solid ${DIVIDER}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        position: 'relative',
      }}>
        <img src={LOGO} alt="GG'APP" style={{ width: 102, height: 102, objectFit: 'contain' }} />
        {!onClose && (
          <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: font.family }}>
            Admin Console
          </div>
        )}
        {onClose && (
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Sign out — visible in mobile header */}
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              title="Sign Out"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: radius.sm, cursor: 'pointer', color: 'rgba(255,255,255,0.55)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Close drawer */}
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: radius.sm, cursor: 'pointer', color: 'rgba(255,255,255,0.55)', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 10px', flex: 1, overflowY: 'auto' }}>
        <NavSection items={PRIMARY_NAV} label="Operations" compact={!!onClose} pendingCreditCount={pendingCreditCount} />
        <div style={{ height: 1, background: DIVIDER, margin: '10px 4px' }} />
        <NavSection items={MANAGEMENT_NAV} label="Management" compact={!!onClose} />
      </nav>

      {/* Footer: sign out + admin identity card */}
      <div style={{ borderTop: `1px solid ${DIVIDER}` }}>
        <div style={{ padding: '4px 10px 0' }}>
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '11px 14px',
              borderRadius: radius.sm, border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.38)',
              fontSize: '13px', fontWeight: 500,
              fontFamily: font.family, cursor: logoutMutation.isPending ? 'not-allowed' : 'pointer',
              transition: 'color 0.14s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.38)')}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M10 11l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            {logoutMutation.isPending ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>

        <div style={{ margin: '0 10px', height: '1px', background: DIVIDER }} />

        {/* Admin identity card */}
        <div style={{ padding: '8px 10px 16px' }}>
          <div
            onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: radius.sm, background: 'rgba(56,182,255,0.08)', cursor: 'pointer', transition: 'background 0.14s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,182,255,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(56,182,255,0.08)')}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.blue500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" fill="white"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: font.family }}>GG'APP Admin</div>
              {!onClose && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: font.family }}>Administrator</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

## AuthBrandPanel
- Source: `src/features/auth/components/AuthBrandPanel.tsx`
- Description: Desktop authentication brand/benefit panel shared by login and registration.

```tsx
import { C, font } from '@/design-system/tokens'
import { LOGO } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'
import type { ReactNode } from 'react'

type Tab = 'patient' | 'sp'

interface AuthBrandPanelProps {
  tab: Tab
}

const PROVIDER_GREEN = '#10B981'

interface Bullet {
  title: string
  body: string
  icon: (color: string) => ReactNode
}

interface BrandContent {
  headline: string
  sub: string
  bullets: Bullet[]
  accent: string
}

const CONTENT: Record<Tab, BrandContent> = {
  patient: {
    headline: 'Healthcare Access, Simplified.',
    sub: 'Get the care you need today. Pay later through our approved credit facility.',
    bullets: [
      { 
        title: 'Zero Upfront', 
        body: 'Credit covers visit', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><rect x="1" y="3.5" width="14" height="9" rx="1.5"/><path d="M1 6.5h14"/></svg> 
      },
      { 
        title: 'Vetted network', 
        body: '100% verified doctors', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><path d="M8 1L2 3v4.5C2 11.5 8 15 8 15s6-3.5 6-7.5V3l-6-2z"/><path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg> 
      },
      { 
        title: 'Secure PIN', 
        body: 'End-to-end safety', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><rect x="3" y="6" width="10" height="8" rx="2"/><path d="M5 6V4a3 3 0 016 0v2" strokeLinecap="round" strokeLinejoin="round"/></svg> 
      },
    ],
    accent: C.blue500,
  },
  sp: {
    headline: 'Grow Your Practice.',
    sub: 'Reach more patients and receive instant, guaranteed payments directly to your account.',
    bullets: [
      { 
        title: 'Instant Pay', 
        body: 'Guaranteed funds', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><path d="M8.5 1.5L2 9h5v5.5L14 7H9z" strokeLinejoin="round"/></svg> 
      },
      { 
        title: 'KYC Verified', 
        body: 'Pre-approved patients', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><circle cx="8" cy="8" r="6.5"/><path d="M5.5 8l1.5 1.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/></svg> 
      },
      { 
        title: 'Easy Admin', 
        body: 'Manage billing & calendar', 
        icon: (color: string) => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.8"><rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="9.5" y="1.5" width="5" height="5" rx="1"/><rect x="1.5" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/></svg> 
      },
    ],
    accent: PROVIDER_GREEN,
  },
}

export function AuthBrandPanel({ tab }: AuthBrandPanelProps) {
  const { isDesktop } = useResponsive()
  // Mobile/tablet use AuthCompactBrandHeader instead of this full side panel.
  if (!isDesktop) return null

  const c = CONTENT[tab]
  const panelWidth = '50%'
  const rgb = tab === 'patient' ? '56, 182, 255' : '16, 185, 129'

  return (
    <div style={{
      width: panelWidth,
      flexShrink: 0,
      margin: '0',
      borderRadius: '0',
      background: 'linear-gradient(135deg, #091C44 0%, #050E22 100%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px 36px',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '100vh',
      boxShadow: '0 20px 40px rgba(5, 14, 34, 0.3)',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
    }}>
      {/* CSS Keyframe Animation Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}} />

      {/* Decorative rings */}
      {[220, 380, 540].map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: r, height: r,
          borderRadius: '50%',
          border: `1px solid rgba(${rgb}, ${0.05 - i * 0.01})`,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          transition: 'all 0.3s ease',
        }} />
      ))}

      {/* Radial glow background */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-10%',
        width: '70%',
        height: '60%',
        background: `radial-gradient(circle, rgba(${rgb}, 0.12) 0%, rgba(${rgb}, 0) 70%)`,
        pointerEvents: 'none',
        filter: 'blur(30px)',
        transition: 'all 0.3s ease',
      }} />

      {/* Logo Container (Sizeable & Visible) */}
      <div style={{ 
        marginBottom: '24px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        <img src={LOGO} alt="GG'APP" width={110} height={110} style={{ objectFit: 'contain', display: 'block' }} />
      </div>

      {/* Content wrapper */}
      <div style={{ flex: 1, zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Headline & Subtitle */}
        <div>
          <div style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            marginBottom: '10px',
            fontFamily: font.family,
          }}>
            {c.headline}
          </div>
          <div style={{ 
            fontSize: '13.5px', 
            color: 'rgba(255,255,255,0.7)', 
            lineHeight: 1.5, 
            marginBottom: '24px', 
            fontFamily: font.family,
            fontWeight: 400,
          }}>
            {c.sub}
          </div>
        </div>

        {/* Hero Interactive Widget */}
        <div style={{
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          animation: 'float 5s ease-in-out infinite',
          fontFamily: font.family,
          transition: 'all 0.3s ease',
        }}>
          {tab === 'patient' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Health Credit Limit</span>
                <span style={{ fontSize: '10px', background: 'rgba(56, 182, 255, 0.15)', color: '#38B6FF', padding: '2px 8px', borderRadius: '20px', fontWeight: 700, border: '1px solid rgba(56, 182, 255, 0.3)' }}>Active</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>$1,200.00</span>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>available</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ width: '75%', height: '100%', background: 'linear-gradient(90deg, #38B6FF, #0091E6)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>
                <span>Used: $400.00</span>
                <span>Partner: CapiMed</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Practice Summary</span>
                <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: PROVIDER_GREEN, padding: '2px 8px', borderRadius: '20px', fontWeight: 700, border: `1px solid rgba(16, 185, 129, 0.3)` }}>Live</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>Instant</span>
                <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>disbursements</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  <span>Verified Patient Bookings</span>
                  <span style={{ fontWeight: 600, color: '#fff' }}>Speedy KYC verification</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  <span>Payment Status</span>
                  <span style={{ fontWeight: 700, color: PROVIDER_GREEN }}>Guaranteed 100%</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Features Columns Row */}
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'space-between',
          marginTop: '28px',
        }}>
          {c.bullets.map((b, i) => (
            <div key={i} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '6px',
              background: 'rgba(255,255,255,0.015)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '12px',
              padding: '12px 10px',
              boxSizing: 'border-box',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '6px',
                background: `${c.accent}12`,
                border: `1px solid ${c.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: c.accent,
                flexShrink: 0,
              }}>
                {b.icon(c.accent)}
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: font.family, marginBottom: '2px', lineHeight: 1.2 }}>
                  {b.title}
                </div>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, fontFamily: font.family }}>
                  {b.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer tag */}
        <div style={{ marginTop: '28px', fontSize: '10.5px', color: 'rgba(255,255,255,0.25)', fontFamily: font.family, zIndex: 1 }}>
          GG'APP · Gateway Global Healthcare Platform
        </div>
      </div>
    </div>
  )
}
```

## AuthCompactBrandHeader
- Source: `src/features/auth/components/AuthCompactBrandHeader.tsx`
- Description: Mobile/tablet authentication brand header shared by login and registration; active redesign target.

```tsx
import { C, font } from '@/design-system/tokens'
import { LOGO } from '@/router/routes'
import { useResponsive } from '@/hooks/useResponsive'

type Tab = 'patient' | 'sp'

interface AuthCompactBrandHeaderProps {
  tab: Tab
}

const COPY: Record<Tab, { tagline: string; accentRgb: string; accent: string }> = {
  patient: {
    tagline: 'Healthcare Access, Simplified.',
    accentRgb: '56, 182, 255',
    accent: C.blue500,
  },
  sp: {
    tagline: 'Grow Your Practice.',
    accentRgb: '16, 185, 129',
    accent: '#10B981',
  },
}

/**
 * Compact brand chrome for mobile/tablet auth screens.
 * Horizontal lockup replaces the old stacked logo + pill cluster.
 */
export function AuthCompactBrandHeader({ tab }: AuthCompactBrandHeaderProps) {
  const { isTablet } = useResponsive()
  const copy = COPY[tab]

  return (
    <header
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${C.navy800} 0%, ${C.navy900} 72%, #030915 100%)`,
        padding: isTablet ? '28px 32px 26px' : '24px 22px 22px',
        borderBottom: 'none',
      }}
    >
      {/* Soft accent glow — atmosphere without clutter */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: isTablet ? 320 : 260,
          height: isTablet ? 320 : 260,
          borderRadius: '50%',
          right: '-80px',
          top: '-110px',
          background: `radial-gradient(circle, rgba(${copy.accentRgb}, 0.22) 0%, rgba(${copy.accentRgb}, 0) 68%)`,
          pointerEvents: 'none',
          transition: 'background 0.35s ease',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          borderRadius: '50%',
          left: '-70px',
          bottom: '-90px',
          background: `radial-gradient(circle, rgba(${copy.accentRgb}, 0.1) 0%, transparent 70%)`,
          pointerEvents: 'none',
          transition: 'background 0.35s ease',
        }}
      />

      {/* Brand lockup */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: isTablet ? 18 : 14,
        }}
      >
        <img
          src={LOGO}
          alt=""
          width={isTablet ? 76 : 64}
          height={isTablet ? 76 : 64}
          style={{
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0,
            filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.3))',
          }}
        />
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              fontFamily: font.family,
              fontSize: isTablet ? 26 : 22,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              color: '#fff',
            }}
          >
            GG&apos;APP
          </div>
          <div
            style={{
              fontFamily: font.family,
              fontSize: isTablet ? 14.5 : 13.5,
              fontWeight: 500,
              letterSpacing: '-0.01em',
              lineHeight: 1.35,
              color: 'rgba(255,255,255,0.68)',
              transition: 'color 0.3s ease',
            }}
          >
            {copy.tagline}
          </div>
        </div>
      </div>

      {/* Accent rail — ties header to role without pill clutter */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 2,
          background: `linear-gradient(90deg, ${copy.accent} 0%, rgba(${copy.accentRgb}, 0.15) 55%, transparent 100%)`,
          transition: 'background 0.35s ease',
        }}
      />
    </header>
  )
}
```

## EntityTabBar
- Source: `src/features/auth/components/EntityTabBar.tsx`
- Description: Patient/provider role switcher shared by authentication pages.

```tsx
import { C, font, radius } from '@/design-system/tokens'

type Tab = 'patient' | 'sp'

interface EntityTabBarProps {
  tab: Tab
  setTab: (t: Tab) => void
}

export function EntityTabBar({ tab, setTab }: EntityTabBarProps) {
  return (
    <div style={{
      display: 'flex',
      background: C.bg,
      borderRadius: radius.sm,
      padding: '4px',
      marginBottom: '28px',
      border: `1px solid ${C.border}`,
      position: 'relative',
    }}>
      {/* Sliding background pill */}
      <div style={{
        position: 'absolute',
        top: '4px',
        bottom: '4px',
        left: '4px',
        width: 'calc(50% - 4px)',
        background: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(9, 28, 68, 0.08)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: `translateX(${tab === 'patient' ? '0' : '100%'})`,
        zIndex: 0,
      }} />

      {(['patient', 'sp'] as Tab[]).map(t => (
        <button
          key={t}
          onClick={() => setTab(t)}
          style={{
            flex: 1,
            padding: '9px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: tab === t ? C.text : C.textSub,
            fontSize: '13px',
            fontWeight: tab === t ? 700 : 500,
            fontFamily: font.family,
            cursor: 'pointer',
            transition: 'color 0.2s ease',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {t === 'patient' ? 'Patient' : 'Service Provider'}
        </button>
      ))}
    </div>
  )
}
```
