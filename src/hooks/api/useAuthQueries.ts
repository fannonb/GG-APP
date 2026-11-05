import { useQuery } from '@tanstack/react-query'
import { authService } from '@/api/services/auth.service'

export function useSPApplicationStatus(applicationId: string | undefined, applicationToken?: string) {
  return useQuery({
    queryKey: ['auth', 'sp-application-status', applicationId] as const,
    queryFn: () => authService.getSPApplicationStatus(applicationId!, applicationToken),
    enabled: !!applicationId && !!applicationToken,
    gcTime: 0,
    retry: false,
    refetchInterval: query =>
      !query.state.error && (query.state.data?.status === 'pending' || query.state.data?.status === 'info_requested')
        ? 10000
        : false,
  })
}
