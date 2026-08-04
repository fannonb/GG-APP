import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { adminService } from '@/api/services/admin.service'

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.admin.dashboard,
    queryFn: () => adminService.getDashboard(),
  })
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: queryKeys.admin.analytics,
    queryFn: () => adminService.getAnalytics(),
  })
}

export function useAdminApplications() {
  return useQuery({
    queryKey: queryKeys.admin.applications,
    queryFn: () => adminService.getApplications(),
  })
}

export function useAdminCreditApplications() {
  return useQuery({
    queryKey: queryKeys.admin.creditApplications,
    queryFn: () => adminService.getCreditApplications(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useAdminApplication(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'application', id] as const,
    queryFn: () => adminService.getApplication(id!),
    enabled: !!id,
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.admin.users,
    queryFn: () => adminService.getUsers(),
  })
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.user(id ?? ''),
    queryFn: () => adminService.getUser(id!),
    enabled: !!id,
  })
}

export function useAdminProviders() {
  return useQuery({
    queryKey: queryKeys.admin.providers,
    queryFn: () => adminService.getProviders(),
  })
}

export function useAdminProvider(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.provider(id ?? ''),
    queryFn: () => adminService.getProvider(id!),
    enabled: !!id,
  })
}

export function useAdminPayments(params: {
  page: number
  limit: number
  search: string
  country: string
}) {
  return useQuery({
    queryKey: queryKeys.admin.payments(params),
    queryFn: () => adminService.getPayments({
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      country: params.country === 'all' ? undefined : params.country,
    }),
    placeholderData: previousData => previousData,
  })
}

export function useAdminNotifications() {
  return useQuery({
    queryKey: queryKeys.admin.notifications,
    queryFn: () => adminService.getNotifications(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useAdminActivity(country: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.admin.activity(country, limit),
    queryFn: () => adminService.getRecentActivity(country, limit),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}
