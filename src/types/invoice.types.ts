import type { BeneficiaryRef } from './appointment.types'
import type { CountryCode } from '@/config/countries'

export type InvoiceStatus = 'pending_auth' | 'authorized' | 'paid' | 'rejected'

export type SPInvoiceStatus = 'paid' | 'pending' | 'authorized' | 'rejected'

export interface InvoiceAttachmentMetadata {
  originalName: string
  mimeType: string
  sizeBytes: number
  displaySize: string
  storageKey: string
  dataUrl?: string
}

export interface InvoiceLineItem {
  name: string
  amount: number
}

export interface InvoiceProvider {
  name: string
  license: string
  phone: string
  address: string
}

export interface InvoiceBilledTo {
  name: string
  nationalId: string
}

export interface InvoiceServiceFor {
  type: 'self' | 'beneficiary'
  name: string
  relation?: string
  age?: number
}

export interface PatientInvoice {
  id: string
  providerId?: number
  isPrescription?: boolean
  /** Present on prescription invoices: pickup | delivery */
  fulfillmentMode?: 'pickup' | 'delivery'
  /** True once the patient has opened/reviewed the pharmacy quote */
  prescriptionQuoteReviewed?: boolean
  reviewSubmitted?: boolean
  paymentRef?: string
  status: InvoiceStatus
  provider: InvoiceProvider
  date: string
  dueDate: string
  amount: number
  /** Amount paid from GG'APP allocation (set after authorization) */
  walletAmountPaid?: number
  /** Remainder to settle directly with the provider off-app */
  offAppAmountDue?: number
  billedTo: InvoiceBilledTo
  serviceFor: InvoiceServiceFor
  services: InvoiceLineItem[]
  attachmentUrl?: string
  attachmentFileName?: string
  hasAttachment?: boolean
  rejectionReason?: string
}

export interface PatientInvoiceAttachment {
  url: string
  fileName: string
  mimeType: string
  sizeBytes: number
  displaySize: string
}

export type InvoiceAttachment = PatientInvoiceAttachment

export interface SPInvoiceReview {
  id: string
  rating: number
  text: string
  patientName: string
  date: string
}

export interface SPInvoice {
  id: string
  appointmentId?: string
  isPrescription?: boolean
  patient: string
  patientId: string
  phone: string
  countryCode?: CountryCode
  email: string
  beneficiary?: BeneficiaryRef
  services: InvoiceLineItem[]
  issueDate: string
  amount: number
  walletAmountPaid?: number
  offAppAmountDue?: number
  status: SPInvoiceStatus
  submittedAt: string
  adminApprovedAt?: string
  paidAt?: string
  paymentRef?: string
  attachment: string
  attachmentBlobUrl?: string
  attachmentMetadata?: InvoiceAttachmentMetadata
  diagnosis: string
  treatment: string
  followUp: string
  internalNote: string
  rejectionReason?: string
  patientReview?: SPInvoiceReview
}

export interface Payment {
  id: string
  patient: string
  amount: number
  date: string
  status: 'paid' | 'pending' | 'authorized'
  ref: string
  invoiceId?: string
  isPrescription?: boolean
}
