import { create } from 'zustand'
import type { ProviderReview } from '@/types/provider.types'
import { MOCK_REVIEWS } from '@/mock/patient.mock'
import { generateRef } from '@/utils/refgen'

interface ReviewsStore {
  reviews: ProviderReview[]
  reviewedInvoiceIds: string[]
  submitReview: (review: Omit<ProviderReview, 'id' | 'date'>, invoiceId?: string) => ProviderReview
  getReviews: (providerId: number) => ProviderReview[]
  hasReviewedInvoice: (invoiceId: string) => boolean
}

export const useReviewsStore = create<ReviewsStore>((set, get) => ({
  reviews: [...MOCK_REVIEWS],
  reviewedInvoiceIds: [],

  submitReview: (review, invoiceId) => {
    const created: ProviderReview = {
      ...review,
      id: generateRef('REV'),
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    }

    set(state => ({
      reviews: [created, ...state.reviews],
      reviewedInvoiceIds: invoiceId
        ? [...state.reviewedInvoiceIds, invoiceId]
        : state.reviewedInvoiceIds,
    }))

    return created
  },

  getReviews: providerId => get().reviews.filter(r => r.providerId === providerId),

  hasReviewedInvoice: invoiceId => get().reviewedInvoiceIds.includes(invoiceId),
}))
