import type { LedgerEntry, LedgerAccessLogResponse, LedgerStatusResponse } from '@/types/ledger.types'

export const MOCK_LEDGER_ENTRIES: LedgerEntry[] = [
  {
    kind: 'visit',
    id: 'ledger-visit-1',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
    beneficiaryName: null,
    appointmentRef: 'APT-2026-0142',
    service: 'General Consultation',
    diagnosis: 'Acute upper respiratory infection',
    treatment: 'Prescribed Amoxicillin 500mg 3x daily for 7 days. Rest and hydration advised.',
    followUp: 'Review in 2 weeks if symptoms persist',
    services: ['Consultation', 'Rapid strep test'],
    vitals: { bp: '122/78', temp: '37.8°C', weight: '74kg', sats: '98%' },
  },
  {
    kind: 'prescription',
    id: 'ledger-rx-1',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    provider: { id: 7, name: 'MedPlus Pharmacy', category: 'pharmacy' },
    beneficiaryName: null,
    reference: 'RX-2026-0089',
    fulfillmentMode: 'PICKUP',
    items: [
      { name: 'Amoxicillin 500mg', quantity: '21 caps', unitPrice: 0.85 },
      { name: 'Paracetamol 500mg', quantity: '20 tabs', unitPrice: 0.1 },
    ],
    amount: 19.85,
  },
  {
    kind: 'visit',
    id: 'ledger-visit-2',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 41).toISOString(),
    provider: { id: 3, name: 'Dr. T. Moyo — Family Practice', category: 'doctor' },
    beneficiaryName: 'Tino M (Son)',
    appointmentRef: 'APT-2026-0097',
    service: 'Paediatric Review',
    diagnosis: 'Otitis media (left ear)',
    treatment: 'Amoxicillin suspension 250mg/5ml, 5ml twice daily for 10 days.',
    followUp: 'Return if fever persists beyond 48 hours',
    services: ['Consultation'],
    vitals: { temp: '38.4°C', weight: '19kg' },
  },
  {
    kind: 'visit',
    id: 'ledger-visit-3',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 96).toISOString(),
    provider: { id: 21, name: 'CityLab Diagnostics', category: 'laboratory' },
    beneficiaryName: null,
    appointmentRef: null,
    service: 'Laboratory Panel',
    diagnosis: null,
    treatment: null,
    followUp: 'Share results with primary physician',
    services: ['Full blood count', 'Malaria parasite test'],
    vitals: {},
  },
]

export const MOCK_LEDGER_STATUS: LedgerStatusResponse = {
  hasPin: true,
  pinCreatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
  pinExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 80).toISOString(),
  activeGrants: [
    {
      id: 'grant-1',
      provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
      unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 21).toISOString(),
    },
  ],
}

export const MOCK_LEDGER_ACCESS_LOG: LedgerAccessLogResponse = {
  grants: [
    {
      id: 'grant-1',
      provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
      unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 21).toISOString(),
      status: 'active',
    },
    {
      id: 'grant-2',
      provider: { id: 7, name: 'MedPlus Pharmacy', category: 'pharmacy' },
      unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
      expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      status: 'expired',
    },
  ],
  events: [
    {
      id: 'evt-1',
      action: 'LEDGER_VIEWED',
      provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 'evt-2',
      action: 'UNLOCK_SUCCESS',
      provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: 'evt-3',
      action: 'UNLOCK_FAILED',
      provider: { id: 7, name: 'MedPlus Pharmacy', category: 'pharmacy' },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 31).toISOString(),
    },
    {
      id: 'evt-4',
      action: 'PIN_CREATED',
      provider: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    },
  ],
}
