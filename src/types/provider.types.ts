export type ProviderCategory = 'doctor' | 'pharmacy' | 'laboratory' | 'radiology' | 'hospital' | 'clinic' | 'specialist'

export type ProviderStatus = 'open' | 'closed'

export interface Provider {
  id: number
  name: string
  category: ProviderCategory
  rating: number
  reviews: number
  distance: string
  status: ProviderStatus
  services: string[]
  hours: string
  phone: string
  address: string
  license?: string
}

export interface BookingSlot {
  date: string
  time: string
  available: boolean
}
