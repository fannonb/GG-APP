import { isMockApi } from '@/api/config'
import { apiClient } from '@/api/client'
import { mockDelay } from '@/api/mock/delay'
import type {
  ApplyCreditPayload,
  CreditApplication,
  CreditStatusResponse,
  IncreaseCreditPayload,
} from '@/types/credit.types'
import { useCreditStore } from '@/store/credit.store'
import { useUserStore } from '@/store/user.store'

export const creditService = {
  async getStatus(): Promise<CreditStatusResponse> {
    if (isMockApi) {
      await mockDelay(200)
      return useCreditStore.getState().getStatus()
    }

    const { data } = await apiClient.get<CreditStatusResponse>('/patient/credit/status')
    return data
  },

  async apply(payload: ApplyCreditPayload): Promise<CreditApplication> {
    if (isMockApi) {
      await mockDelay(400)
      return useCreditStore.getState().submitApplication(payload)
    }

    const { data } = await apiClient.post<CreditApplication>('/patient/credit/apply', payload)
    return data
  },

  async increase(payload: IncreaseCreditPayload): Promise<CreditApplication> {
    if (isMockApi) {
      await mockDelay(400)
      return useCreditStore.getState().submitIncrease(payload)
    }

    const { data } = await apiClient.post<CreditApplication>('/patient/credit/increase', payload)
    return data
  },
}

export function syncCreditToUserStore(status: CreditStatusResponse) {
  useUserStore.getState().updateUser({
    creditStatus: status.creditStatus,
    creditLimit: status.creditLimit,
    creditUsed: status.creditUsed,
    creditAvailable: status.creditAvailable,
    financePartnerId: status.financePartnerId as 'moneymart' | 'equity' | undefined,
    creditAccountRef: status.creditAccountRef,
  })
}
