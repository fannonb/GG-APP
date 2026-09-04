import { useQuery } from '@tanstack/react-query'
import { adminIntelligenceService } from '@/api/services/admin-intelligence.service'

export function useAdminDiseaseBurden() {
  return useQuery({
    queryKey: ['admin', 'intelligence', 'disease-burden'],
    queryFn: () => adminIntelligenceService.getDiseaseBurden(),
  })
}

export function useAdminDemographics() {
  return useQuery({
    queryKey: ['admin', 'intelligence', 'demographics'],
    queryFn: () => adminIntelligenceService.getDemographics(),
  })
}

export function useAdminFinancialHighlights() {
  return useQuery({
    queryKey: ['admin', 'intelligence', 'financial-highlights'],
    queryFn: () => adminIntelligenceService.getFinancialHighlights(),
  })
}

export function useAdminConsumerHealth() {
  return useQuery({
    queryKey: ['admin', 'intelligence', 'consumer-health'],
    queryFn: () => adminIntelligenceService.getConsumerHealth(),
  })
}
