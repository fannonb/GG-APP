import { mockDelay } from '@/api/mock/delay'
import {
  MOCK_CONSUMER_HEALTH,
  MOCK_DEMOGRAPHICS,
  MOCK_DISEASE_BURDEN,
  MOCK_FINANCIAL_HIGHLIGHTS,
} from '@/mock/admin-intelligence.mock'

export const adminIntelligenceService = {
  async getDiseaseBurden() {
    await mockDelay(250)
    return MOCK_DISEASE_BURDEN
  },

  async getDemographics() {
    await mockDelay(250)
    return MOCK_DEMOGRAPHICS
  },

  async getFinancialHighlights() {
    await mockDelay(250)
    return MOCK_FINANCIAL_HIGHLIGHTS
  },

  async getConsumerHealth() {
    await mockDelay(250)
    return MOCK_CONSUMER_HEALTH
  },
}
