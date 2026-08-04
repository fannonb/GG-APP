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
