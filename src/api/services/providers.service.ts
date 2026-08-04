import { isMockApi } from '@/api/config'
import { apiClient } from '@/api/client'
import { mockDelay } from '@/api/mock/delay'
import type { CountryCode } from '@/config/countries'
import { getCountryByCode, getCountryByName } from '@/config/countries'
import type { Provider } from '@/types/provider.types'
import { MOCK_PROVIDERS } from '@/mock/patient.mock'

function countryMatches(providerCountry: string | undefined, filter?: string) {
  if (!filter) return true
  const config =
    getCountryByCode(filter.toUpperCase()) ?? getCountryByName(filter)
  if (!config) return true
  const allowed = new Set([config.code, config.name].map(v => v.toLowerCase()))
  return !!providerCountry && allowed.has(providerCountry.toLowerCase())
}

export const providersService = {
  async getAll(country?: CountryCode | string): Promise<Provider[]> {
    if (isMockApi) {
      await mockDelay(250)
      return MOCK_PROVIDERS.filter(p => countryMatches(p.country, country))
    }
    const { data } = await apiClient.get<Provider[]>('/providers', {
      params: country ? { country } : undefined,
    })
    return data
  },

  async getByCategory(
    category: string,
    country?: CountryCode | string,
  ): Promise<Provider[]> {
    if (isMockApi) {
      await mockDelay(250)
      return MOCK_PROVIDERS.filter(
        p => p.category === category && countryMatches(p.country, country),
      )
    }
    const { data } = await apiClient.get<Provider[]>(`/providers/category/${category}`, {
      params: country ? { country } : undefined,
    })
    return data
  },

  async getById(id: number | string): Promise<Provider | null> {
    if (isMockApi) {
      await mockDelay(200)
      return MOCK_PROVIDERS.find(p => String(p.id) === String(id)) ?? null
    }
    const { data } = await apiClient.get<Provider>(`/providers/${id}`)
    return data
  },
}
