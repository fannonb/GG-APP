import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { adminMetricsService } from '@/api/services/admin-metrics.service'
import { useAdminCountry } from '@/features/admin/AdminCountryContext'
import { toMetricsCountry } from '@/features/admin/metrics/metricsFormat'
import type { MetricsPage } from '@/types/admin-metrics.types'

/** Data for one analytics page, following the admin's country and range filters. */
export function useAdminMetrics<P extends MetricsPage>(page: P) {
  const { country, range } = useAdminCountry()
  const code = toMetricsCountry(country)
  return useQuery({
    queryKey: ['admin', 'metrics', page, code, range],
    queryFn: () => adminMetricsService.get(page, code, range),
    // Keep the old charts on screen while a new range loads, instead of flashing empty.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}
