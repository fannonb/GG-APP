import { apiClient } from '@/api/client'
import { isMockApi } from '@/api/config'
import { mockDelay } from '@/api/mock/delay'
import { buildMockMetrics } from '@/mock/admin-metrics.mock'
import type { MetricsByPage, MetricsCountry, MetricsPage, MetricsRange } from '@/types/admin-metrics.types'

export const adminMetricsService = {
  async get<P extends MetricsPage>(page: P, country: MetricsCountry | 'all', range: MetricsRange): Promise<MetricsByPage[P]> {
    if (isMockApi) {
      await mockDelay(200)
      return buildMockMetrics(page, country, range)
    }
    const { data } = await apiClient.get<MetricsByPage[P]>(`/admin/metrics/${page}`, { params: { country, range } })
    return data
  },
}
