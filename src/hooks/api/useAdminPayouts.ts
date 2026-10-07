import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminPayoutsService, type PayoutTab } from '@/api/services/admin-payouts.service'

export function usePayoutList(params: { tab: PayoutTab; country: string; range: string; q: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['admin', 'payouts', 'list', params],
    queryFn: () => adminPayoutsService.list(params),
    placeholderData: keepPreviousData,
  })
}

export function usePayoutSummary(country: string, range: string) {
  return useQuery({ queryKey: ['admin', 'payouts', 'summary', country, range], queryFn: () => adminPayoutsService.summary(country, range) })
}

export function useOwedByProvider(country: string, enabled: boolean) {
  return useQuery({ queryKey: ['admin', 'payouts', 'by-provider', country], queryFn: () => adminPayoutsService.byProvider(country), enabled })
}

export function usePayoutDetail(id: string | null) {
  return useQuery({ queryKey: ['admin', 'payouts', 'detail', id], queryFn: () => adminPayoutsService.detail(id!), enabled: !!id })
}

export function useRecordPayout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminPayoutsService.record,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'metrics'] })
    },
  })
}
