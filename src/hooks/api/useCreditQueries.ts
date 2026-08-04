import { useQuery } from '@tanstack/react-query'
import { isMockApi } from '@/api/config'
import { queryKeys } from '@/api/query-keys'
import { creditService, syncCreditToUserStore } from '@/api/services/credit.service'

const creditMode = isMockApi ? 'mock' : 'live'

export function useCreditStatus() {
  return useQuery({
    queryKey: queryKeys.patient.credit(creditMode),
    queryFn: async () => {
      const status = await creditService.getStatus()
      syncCreditToUserStore(status)
      return status
    },
  })
}
