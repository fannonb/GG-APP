import { isMockApi } from '@/api/config'
import { apiClient } from '@/api/client'
import { mockDelay } from '@/api/mock/delay'
import { ApiError } from '@/api/types'
import {
  MOCK_LEDGER_ACCESS_LOG,
  MOCK_LEDGER_ENTRIES,
  MOCK_LEDGER_STATUS,
} from '@/mock/ledger.mock'
import type {
  AdminLedgerAccessEvent,
  LedgerAccessLogResponse,
  LedgerResponse,
  LedgerStatusResponse,
  SetupLedgerPinPayload,
  ResetLedgerPinPayload,
  UnlockLedgerPayload,
  UnlockLedgerResponse,
} from '@/types/ledger.types'

function filterEntries(entries: typeof MOCK_LEDGER_ENTRIES, beneficiaryId?: string) {
  if (!beneficiaryId) return entries
  if (beneficiaryId === 'self') {
    return entries.filter(entry => {
      if (!entry.beneficiaryName) return true
      const bName = entry.beneficiaryName.toLowerCase()
      return bName === 'self' || bName === 'me'
    })
  }
  return entries.filter(entry => {
    if (!entry.beneficiaryName) return false
    const bName = entry.beneficiaryName.toLowerCase()
    const target = beneficiaryId.toLowerCase()
    return bName.includes(target) || target.includes(bName)
  })
}


let mockPatientPin = '1234'
const mockUnlockedPatients = new Set<string>()

export const ledgerService = {
  async setupPin(payload: SetupLedgerPinPayload): Promise<{ configured: boolean; message: string }> {
    if (isMockApi) {
      await mockDelay(400)
      if (payload.pin !== payload.confirmPin) {
        throw new Error('PIN confirmation does not match')
      }
      mockPatientPin = payload.pin
      mockUnlockedPatients.clear()
      MOCK_LEDGER_STATUS.hasPin = true
      return { configured: true, message: 'Ledger PIN created successfully.' }
    }
    const { data } = await apiClient.post('/patient/ledger/pin', payload)
    return data
  },

  async resetPin(payload: ResetLedgerPinPayload): Promise<{ configured: boolean; message: string }> {
    if (isMockApi) {
      await mockDelay(400)
      if (!payload.password.trim()) {
        throw new Error('Account password is required')
      }
      if (payload.pin !== payload.confirmPin) {
        throw new Error('PIN confirmation does not match')
      }
      mockPatientPin = payload.pin
      mockUnlockedPatients.clear()
      MOCK_LEDGER_STATUS.hasPin = true
      MOCK_LEDGER_STATUS.pinExpired = false
      return { configured: true, message: 'Ledger PIN reset. Existing provider access has been revoked.' }
    }
    const { data } = await apiClient.post('/patient/ledger/pin/reset', payload)
    return data
  },

  async revokePin(): Promise<{ configured: boolean; message: string }> {
    if (isMockApi) {
      await mockDelay(300)
      mockPatientPin = ''
      mockUnlockedPatients.clear()
      MOCK_LEDGER_STATUS.hasPin = false
      return { configured: false, message: 'Ledger PIN revoked. All provider access has been removed.' }
    }
    const { data } = await apiClient.delete('/patient/ledger/pin')
    return data
  },

  async getStatus(): Promise<LedgerStatusResponse> {
    if (isMockApi) {
      await mockDelay(200)
      return MOCK_LEDGER_STATUS
    }
    const { data } = await apiClient.get<LedgerStatusResponse>('/patient/ledger/status')
    return data
  },

  async getOwnLedger(beneficiaryId?: string): Promise<LedgerResponse> {
    if (isMockApi) {
      await mockDelay(300)
      return {
        patient: {
          id: 'patient-1',
          name: 'Rutendo Moyo',
          beneficiaries: [{ id: 'ben-1', name: 'Tino M', relation: 'Son' }],
        },
        grant: null,
        filter: beneficiaryId
          ? { beneficiaryId, scope: 'beneficiary' }
          : { beneficiaryId: null, scope: 'all' },
        entries: filterEntries(MOCK_LEDGER_ENTRIES, beneficiaryId),
      }
    }
    const { data } = await apiClient.get<LedgerResponse>('/patient/ledger', {
      params: beneficiaryId ? { beneficiaryId } : undefined,
    })
    return data
  },

  async getAccessLog(): Promise<LedgerAccessLogResponse> {
    if (isMockApi) {
      await mockDelay(200)
      return MOCK_LEDGER_ACCESS_LOG
    }
    const { data } = await apiClient.get<LedgerAccessLogResponse>('/patient/ledger/access')
    return data
  },

  async revokeGrant(grantId: string): Promise<{ revoked: boolean }> {
    if (isMockApi) {
      await mockDelay(300)
      return { revoked: true }
    }
    const { data } = await apiClient.patch(`/patient/ledger/grants/${grantId}/revoke`)
    return data
  },

  async unlock(payload: UnlockLedgerPayload): Promise<UnlockLedgerResponse> {
    if (isMockApi) {
      await mockDelay(500)
      if (!mockPatientPin || payload.pin !== mockPatientPin) {
        throw new Error(
          'Unable to unlock the ledger. Check the Ledger PIN, then try again.',
        )
      }
      const pId = payload.patientId ?? 'patient-1'
      mockUnlockedPatients.add(pId)
      return {
        grantId: `grant-${Date.now()}`,
        patientId: pId,
        patientName: 'Rutendo Moyo',
        unlockedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    }
    const { data } = await apiClient.post<UnlockLedgerResponse>('/sp/ledger/unlock', payload)
    return data
  },

  async getLedger(patientId: string, beneficiaryId?: string): Promise<LedgerResponse> {
    if (isMockApi) {
      await mockDelay(300)
      if (!mockUnlockedPatients.has(patientId)) {
        throw new ApiError(
          'You need the patient\'s ledger PIN to view their treatment history. Ask the patient to share it, then unlock the ledger.',
          403,
        )
      }
      return {
        patient: {
          id: patientId,
          name: 'Rutendo Moyo',
          dob: new Date('1990-04-12').toISOString(),
          beneficiaries: [{ id: 'ben-1', name: 'Tino M', relation: 'Son' }],
        },
        grant: {
          id: 'grant-1',
          unlockedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 21).toISOString(),
        },
        filter: beneficiaryId
          ? { beneficiaryId, scope: 'beneficiary' }
          : { beneficiaryId: null, scope: 'all' },
        entries: filterEntries(MOCK_LEDGER_ENTRIES, beneficiaryId),
      }
    }
    const { data } = await apiClient.get<LedgerResponse>(`/sp/ledger/${patientId}`, {
      params: beneficiaryId ? { beneficiaryId } : undefined,
    })
    return data
  },
}

export async function getAdminLedgerAccess(params?: {
  limit?: number
  patientUserId?: string
  providerId?: number
}): Promise<AdminLedgerAccessEvent[]> {
  if (isMockApi) {
    await mockDelay(250)
    return [
      {
        id: 'admin-ledger-1',
        action: 'UNLOCK_SUCCESS',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
        patient: { id: 'patient-1', email: 'rutendo@example.com', name: 'Rutendo Moyo' },
      },
      {
        id: 'admin-ledger-2',
        action: 'LEDGER_VIEWED',
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        provider: { id: 12, name: 'Avenues Clinic', category: 'clinic' },
        patient: { id: 'patient-1', email: 'rutendo@example.com', name: 'Rutendo Moyo' },
      },
      {
        id: 'admin-ledger-3',
        action: 'UNLOCK_FAILED',
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        provider: { id: 7, name: 'MedPlus Pharmacy', category: 'pharmacy' },
        patient: { id: 'patient-1', email: 'rutendo@example.com', name: 'Rutendo Moyo' },
      },
      {
        id: 'admin-ledger-4',
        action: 'GRANT_EXPIRED',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
        provider: { id: 7, name: 'MedPlus Pharmacy', category: 'pharmacy' },
        patient: { id: 'patient-2', email: 'tinashe@example.com', name: 'Tinashe Ncube' },
      },
    ]
  }
  const { data } = await apiClient.get<AdminLedgerAccessEvent[]>('/admin/ledger-access', { params })
  return data
}
