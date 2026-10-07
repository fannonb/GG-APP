import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { MetricsRange } from '@/types/admin-metrics.types'

export type AdminCountryFilter = 'all' | 'Zimbabwe' | 'Kenya' | 'Zambia'

interface AdminCountryContextValue {
  country: AdminCountryFilter
  setCountry: (c: AdminCountryFilter) => void
  /** Date range shared by the analytics pages. */
  range: MetricsRange
  setRange: (r: MetricsRange) => void
}

const AdminCountryContext = createContext<AdminCountryContextValue>({
  country: 'all',
  setCountry: () => {},
  range: '30d',
  setRange: () => {},
})

export function AdminCountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<AdminCountryFilter>('all')
  const [range, setRange] = useState<MetricsRange>('30d')
  return (
    <AdminCountryContext.Provider value={{ country, setCountry, range, setRange }}>
      {children}
    </AdminCountryContext.Provider>
  )
}

export const useAdminCountry = () => useContext(AdminCountryContext)
