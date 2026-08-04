import { create } from 'zustand'
import { MOCK_SP } from '@/mock/sp.mock'

interface SPProfileStore {
  status: 'open' | 'closed'
  address: string
  phone: string
  country: string
  establishedYear: number
  lat: number
  lng: number

  setStatus: (s: 'open' | 'closed') => void
  setAddress: (a: string) => void
  setPhone: (p: string) => void
  setCountry: (c: string) => void
  setEstablishedYear: (y: number) => void
  setLocation: (lat: number, lng: number) => void
  saveAll: (fields: Partial<Pick<SPProfileStore, 'status' | 'address' | 'phone' | 'country' | 'establishedYear' | 'lat' | 'lng'>>) => void
}

export const useSPProfileStore = create<SPProfileStore>(set => ({
  status: 'open',
  address: '14 Samora Machel Ave, Harare',
  phone: MOCK_SP.phone,
  country: MOCK_SP.country,
  establishedYear: 2009,
  lat: -17.8260,
  lng: 31.0530,

  setStatus: s => set({ status: s }),
  setAddress: a => set({ address: a }),
  setPhone: p => set({ phone: p }),
  setCountry: c => set({ country: c }),
  setEstablishedYear: y => set({ establishedYear: y }),
  setLocation: (lat, lng) => set({ lat, lng }),
  saveAll: fields => set(fields),
}))

/** The provider ID in MOCK_PROVIDERS that corresponds to the demo SP account. */
export const DEMO_SP_PROVIDER_ID = 1
