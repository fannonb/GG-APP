import type { BeneficiaryRef } from './appointment.types'

export type InvoiceStatus = 'pending_auth' | 'authorized' | 'paid' | 'disputed' | 'rejected'

export type SPInvoiceStatus = 'paid' | 'cancelled' | 'pending'

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
  status: InvoiceStatus
  provider: InvoiceProvider
  date: string
  dueDate: string
  amount: number
  billedTo: InvoiceBilledTo
  serviceFor: InvoiceServiceFor
  services: InvoiceLineItem[]
}

export interface SPInvoice {
  id: string
  patient: string
  patientId: string
  phone: string
  email: string
  beneficiary?: BeneficiaryRef
  services: string[]
  issueDate: string
  amount: number
  status: SPInvoiceStatus
  submittedAt: string
  adminApprovedAt?: string
  paidAt?: string
  paymentRef?: string
  disputedAt?: string
  attachment: string
  diagnosis: string
  treatment: string
  followUp: string
  internalNote: string
  disputeReason?: string
  adminNote?: string
  rejectionReason?: string
}

export interface Payment {
  id: string
  patient: string
  amount: number
  date: string
  status: 'paid' | 'pending'
  ref: string
}
