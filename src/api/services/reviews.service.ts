import { isMockApi } from '@/api/config'
import { apiClient } from '@/api/client'
import { mockDelay } from '@/api/mock/delay'
import type { SubmitReviewPayload } from '@/api/types'
import type { ProviderReview } from '@/types/provider.types'
import { MOCK_PROVIDERS } from '@/mock/patient.mock'
import { useReviewsStore } from '@/store/reviews.store'
import { useUserStore } from '@/store/user.store'
import { getPatientDisplayName } from '@/features/patient/patientAccount'

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
}

function resolveMockProviderId(providerId: number, providerName?: string) {
  if (providerId > 0) return providerId
  if (!providerName) return 1
  return MOCK_PROVIDERS.find(p => p.name === providerName)?.id ?? 1
}

export const reviewsService = {
  async getByProvider(providerId: number): Promise<ProviderReview[]> {
    if (isMockApi) {
      await mockDelay(200)
      return useReviewsStore.getState().getReviews(providerId)
    }

    const { data } = await apiClient.get<ProviderReview[]>(`/providers/${providerId}/reviews`)
    return data
  },

  async submit(payload: SubmitReviewPayload): Promise<ProviderReview> {
    if (isMockApi) {
      await mockDelay(300)
      const user = useUserStore.getState().user
      const providerId = resolveMockProviderId(payload.providerId, payload.providerName)
      const review = useReviewsStore.getState().submitReview({
        providerId,
        name: getPatientDisplayName(user),
        rating: payload.rating,
        text: payload.text?.trim() || RATING_LABELS[payload.rating] || 'No comment',
      }, payload.invoiceId)
      return review
    }

    const { data } = await apiClient.post<ProviderReview>('/patient/reviews', {
      providerId: payload.providerId,
      invoiceId: payload.invoiceId,
      rating: payload.rating,
      text: payload.text,
    })
    return data
  },
}
