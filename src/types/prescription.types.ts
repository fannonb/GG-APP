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

export type PrescriptionFulfillmentMode = 'pickup' | 'delivery'

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
}

export interface CreatePrescriptionRequestPayload {
  providerId: number
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
