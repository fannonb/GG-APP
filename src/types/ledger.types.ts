export interface LedgerProviderRef {
  id: number
  name: string
  category: string
}

export type LedgerEntry =
  | {
      kind: 'visit'
      id: string
      date: string
      provider: LedgerProviderRef
      beneficiaryName: string | null
      appointmentRef: string | null
      service: string | null
      diagnosis: string | null
      treatment: string | null
      followUp: string | null
      services: string[]
      vitals: Record<string, string>
    }
  | {
      kind: 'prescription'
      id: string
      date: string
      provider: LedgerProviderRef
      beneficiaryName: string | null
      reference: string
      fulfillmentMode: 'PICKUP' | 'DELIVERY'
      items: Array<{ name: string; quantity: string | null; unitPrice: number | null }>
      amount: number | null
    }

export interface LedgerGrant {
  id: string
  provider: LedgerProviderRef
  unlockedAt: string
  expiresAt: string
}

export interface LedgerStatusResponse {
  hasPin: boolean
  pinExpired?: boolean
  pinCreatedAt: string | null
  pinExpiresAt?: string | null
  activeGrants: LedgerGrant[]
}

export interface LedgerAccessGrantView extends LedgerGrant {
  status: 'active' | 'expired' | 'revoked'
}

export interface LedgerAccessEvent {
  id: string
  action:
    | 'PIN_CREATED'
    | 'PIN_ROTATED'
    | 'PIN_REVOKED'
    | 'UNLOCK_SUCCESS'
    | 'UNLOCK_FAILED'
    | 'LEDGER_VIEWED'
    | 'GRANT_REVOKED'
    | 'GRANT_EXPIRED'
  provider: LedgerProviderRef | null
  createdAt: string
}

export interface LedgerAccessLogResponse {
  grants: LedgerAccessGrantView[]
  events: LedgerAccessEvent[]
}

export interface LedgerResponse {
  patient: {
    id: string
    name: string
    dob?: string
    beneficiaries?: Array<{ id: string; name: string; relation: string }>
  }
  grant: { id: string; unlockedAt: string; expiresAt: string } | null
  filter?: { beneficiaryId: string | null; scope: 'all' | 'beneficiary' }
  entries: LedgerEntry[]
}

export interface SetupLedgerPinPayload {
  pin: string
  confirmPin: string
  currentPin?: string
  expiresInDays?: number
}

export interface ResetLedgerPinPayload {
  password: string
  pin: string
  confirmPin: string
  expiresInDays?: number
}

export interface AdminLedgerAccessEvent {
  id: string
  action:
    | 'PIN_CREATED'
    | 'PIN_ROTATED'
    | 'PIN_REVOKED'
    | 'UNLOCK_SUCCESS'
    | 'UNLOCK_FAILED'
    | 'LEDGER_VIEWED'
    | 'GRANT_REVOKED'
    | 'GRANT_EXPIRED'
  createdAt: string
  provider: LedgerProviderRef | null
  patient: { id: string; email: string; name: string }
  metadata?: unknown
}

export interface UnlockLedgerPayload {
  pin: string
  /** When set, unlock is scoped to this patient (preferred when opening from a patient record). */
  patientId?: string
}

export interface UnlockLedgerResponse {
  grantId: string
  patientId: string
  patientName: string
  unlockedAt: string
  expiresAt: string
}
