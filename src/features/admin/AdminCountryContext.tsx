import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export type AdminCountryFilter = 'all' | 'Zimbabwe' | 'Kenya' | 'Zambia'

interface AdminCountryContextValue {
  country: AdminCountryFilter
  setCountry: (c: AdminCountryFilter) => void
}

const AdminCountryContext = createContext<AdminCountryContextValue>({
  country: 'all',
  setCountry: () => {},
})

export function AdminCountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<AdminCountryFilter>('all')
  return (
    <AdminCountryContext.Provider value={{ country, setCountry }}>
      {children}
    </AdminCountryContext.Provider>
  )
}

export const useAdminCountry = () => useContext(AdminCountryContext)
