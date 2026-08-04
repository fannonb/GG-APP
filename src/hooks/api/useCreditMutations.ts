import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isMockApi } from '@/api/config'
import { queryKeys } from '@/api/query-keys'
import { creditService } from '@/api/services/credit.service'
import type { ApplyCreditPayload, IncreaseCreditPayload } from '@/types/credit.types'

const creditMode = isMockApi ? 'mock' : 'live'

export function useApplyCreditMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ApplyCreditPayload) => creditService.apply(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.credit(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.profile(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(creditMode) })
    },
  })
}

export function useIncreaseCreditMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: IncreaseCreditPayload) => creditService.increase(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.credit(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.profile(creditMode) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.patient.dashboard(creditMode) })
    },
  })
}
