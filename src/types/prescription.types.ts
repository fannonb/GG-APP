import type { AppointmentAttachmentPayload } from '@/api/types'

export type PrescriptionRequestStatus =
  | 'submitted'
  | 'quoted'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'fulfilled'
  | 'cancelled'
  | 'rejected'
  /** Sent to nearby pharmacies, but none within the widest search ring could fill it. */
  | 'expired'

export type PrescriptionFulfillmentMode = 'pickup' | 'delivery'

/** One nearby pharmacy's price for a prescription, as the patient sees it. */
export interface PrescriptionOffer {
  id: string
  providerId: number
  provider: string
  address?: string
  rating?: number
  logoUrl?: string
  distanceKm: number
  status: 'quoted' | 'selected'
  quotedItems?: PrescriptionQuotedItem[]
  quotedAmount?: number
  deliveryFee?: number
  pharmacyNotes?: string
  quotedAt?: string
}

export interface NearbyPharmaciesResult {
  /** The ring the request would go out in (2 or 6 km), or null when no pharmacy is close enough. */
  radiusKm: number | null
  count: number
  maxRadiusKm: number
}

export interface PrescriptionQuotedItem {
  name: string
  quantity?: string
  unitPrice: number
  availability?: string
  substitute?: string
}

export interface PrescriptionRequest {
  id: string
  providerId?: number
  provider?: string
  patient?: string
  patientPhone?: string
  patientEmail?: string
  countryCode?: string
  status: PrescriptionRequestStatus
  fulfillmentMode: PrescriptionFulfillmentMode
  deliveryAddress?: string
  patientNotes?: string
  pharmacyNotes?: string
  attachment: AppointmentAttachmentPayload & { dataUrl?: string }
  quotedItems?: PrescriptionQuotedItem[]
  quotedAmount?: number
  deliveryFee?: number
  quotedAt?: string
  quoteReviewedAt?: string
  acceptedAt?: string
  declinedAt?: string
  declineReason?: string
  readyAt?: string
  fulfilledAt?: string
  forSelf: boolean
  for: string
  submittedAt: string
  invoiceId?: string
  invoiceStatus?: string
  // ── Nearby search (patient view) ──
  searchLat?: number
  searchLng?: number
  searchRadiusKm?: number
  widenedAt?: string
  expiredAt?: string
  pharmaciesContacted?: number
  pharmaciesPending?: number
  pharmaciesDeclined?: number
  offers?: PrescriptionOffer[]
  // ── Nearby search (pharmacy view) ──
  /** True while this pharmacy is one of several asked; contact details stay hidden until chosen. */
  isNearbyRequest?: boolean
  /** How far the patient (or delivery pin) is from this pharmacy. */
  distanceKm?: number
  deliveryLat?: number
  deliveryLng?: number
}

export interface CreatePrescriptionRequestPayload {
  /** The delivery pin, or the patient's location for pickup. */
  searchLat: number
  searchLng: number
  forSelf: boolean
  beneficiaryId?: string
  sourceAppointmentId?: string
  fulfillmentMode?: PrescriptionFulfillmentMode
  deliveryAddress?: string
  patientNotes?: string
  attachment: AppointmentAttachmentPayload & { dataUrl?: string }
}

export interface QuotePrescriptionRequestPayload {
  items: PrescriptionQuotedItem[]
  amount: number
  deliveryFee?: number
  pharmacyNotes?: string
}

export interface RejectPrescriptionRequestPayload {
  reason: string
}
