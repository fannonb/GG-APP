import type { PrescriptionRequest } from '@/types/prescription.types'

let mockPrescriptionRequests: PrescriptionRequest[] = [
  {
    id: 'RX-2026-0001',
    providerId: 2,
    provider: 'LifeCare Pharmacy',
    patient: 'Sarah Johnson',
    patientPhone: '+263 77 123 4567',
    patientEmail: 'sarah@example.com',
    countryCode: 'ZW',
    status: 'submitted',
    fulfillmentMode: 'pickup',
    patientNotes: 'Need this filled today if possible.',
    attachment: {
      name: 'Prescription_May2026.pdf',
      type: 'pdf',
      size: '124 KB',
      mimeType: 'application/pdf',
      sizeBytes: 126976,
      storageKey: 'mock/prescription-may2026.pdf',
    },
    forSelf: true,
    for: 'Self',
    submittedAt: '2026-06-18T08:30:00.000Z',
  },
]

export function getMockPrescriptionRequests() {
  return mockPrescriptionRequests
}

export function addMockPrescriptionRequest(request: PrescriptionRequest) {
  mockPrescriptionRequests = [request, ...mockPrescriptionRequests]
  return request
}

export function updateMockPrescriptionRequest(
  id: string,
  patch: Partial<PrescriptionRequest>,
) {
  mockPrescriptionRequests = mockPrescriptionRequests.map(request =>
    request.id === id ? { ...request, ...patch } : request,
  )
  return mockPrescriptionRequests.find(request => request.id === id) ?? null
}

export function getMockPrescriptionRequest(id: string) {
  return mockPrescriptionRequests.find(request => request.id === id) ?? null
}

export function getMockPrescriptionRequestsForProvider(providerId: number) {
  return mockPrescriptionRequests.filter(request => request.providerId === providerId)
}

export function getMockPrescriptionRequestsForPatient(providerName = 'Sarah Johnson') {
  return mockPrescriptionRequests.filter(
    request => request.patient === providerName || request.for === 'Self',
  )
}
