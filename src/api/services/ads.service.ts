import { apiClient } from '@/api/client'
import { isMockApi } from '@/api/config'
import { mockDelay } from '@/api/mock/delay'
import { ApiError } from '@/api/types'
import { patientService } from '@/api/services/patient.service'
import { MOCK_AD_BANNERS } from '@/mock/admin.mock'
import type { AdBanner, AdBannerStatus, AdFrequency } from '@/types/admin.types'

/** Fields the admin editor sends when creating a banner. Image data URLs are sent only for a newly picked image. */
export interface AdminAdPayload {
  advertiserName: string
  ctaUrl: string
  status: AdBannerStatus
  frequency: AdFrequency
  startDate: string
  expiresAt: string
  countries: string[]
  desktopImageDataUrl?: string
  mobileImageDataUrl?: string
}

/** Edit payload: every field optional, plus explicit requests to clear an existing image. */
export interface AdminAdUpdatePayload extends Partial<AdminAdPayload> {
  removeDesktopImage?: boolean
  removeMobileImage?: boolean
}

/** A banner as a patient receives it. The server has already filtered it to what this patient may see. */
export interface PatientAd {
  id: string
  ctaUrl: string
  desktopImageUrl: string
  mobileImageUrl: string
  updatedAt: string
}

// Mock mode: admin edits live in memory only, starting from the mock fixtures.
let mockAds: AdBanner[] = [...MOCK_AD_BANNERS]

/** The rule the dashboard ad slot has always used, applied to mock banners. */
function isMockEligible(ad: AdBanner, today: string, countryName: string | undefined): boolean {
  if (ad.status !== 'active') return false
  if (ad.startDate > today || ad.expiresAt < today) return false
  if (ad.countries.length > 0 && countryName && !ad.countries.includes(countryName)) return false
  return !!(ad.desktopImageUrl || ad.mobileImageUrl)
}

export const adsService = {
  // ─── Admin ────────────────────────────────────────────────────────────────

  async list(): Promise<AdBanner[]> {
    if (isMockApi) {
      await mockDelay(200)
      return [...mockAds]
    }
    const { data } = await apiClient.get<AdBanner[]>('/admin/ads')
    return data
  },

  async create(payload: AdminAdPayload): Promise<AdBanner> {
    if (isMockApi) {
      await mockDelay(300)
      const now = new Date().toISOString()
      const banner: AdBanner = {
        id: `AD-${Date.now().toString(36).toUpperCase()}`,
        advertiserName: payload.advertiserName,
        ctaUrl: payload.ctaUrl,
        desktopImageUrl: payload.desktopImageDataUrl ?? '',
        mobileImageUrl: payload.mobileImageDataUrl ?? '',
        status: payload.status,
        frequency: payload.frequency,
        startDate: payload.startDate,
        expiresAt: payload.expiresAt,
        countries: payload.countries,
        impressions: 0,
        clicks: 0,
        updatedAt: now,
      }
      mockAds = [banner, ...mockAds]
      return banner
    }
    const { data } = await apiClient.post<AdBanner>('/admin/ads', payload)
    return data
  },

  async update(id: string, payload: AdminAdUpdatePayload): Promise<AdBanner> {
    if (isMockApi) {
      await mockDelay(300)
      const current = mockAds.find(ad => ad.id === id)
      if (!current) throw new ApiError('Banner not found', 404)
      const {
        removeDesktopImage,
        removeMobileImage,
        desktopImageDataUrl,
        mobileImageDataUrl,
        ...fields
      } = payload
      const updated: AdBanner = {
        ...current,
        ...fields,
        desktopImageUrl: desktopImageDataUrl ?? (removeDesktopImage ? '' : current.desktopImageUrl),
        mobileImageUrl: mobileImageDataUrl ?? (removeMobileImage ? '' : current.mobileImageUrl),
        updatedAt: new Date().toISOString(),
      }
      mockAds = mockAds.map(ad => (ad.id === id ? updated : ad))
      return updated
    }
    const { data } = await apiClient.patch<AdBanner>(`/admin/ads/${encodeURIComponent(id)}`, payload)
    return data
  },

  async remove(id: string): Promise<{ success: boolean }> {
    if (isMockApi) {
      await mockDelay(200)
      mockAds = mockAds.filter(ad => ad.id !== id)
      return { success: true }
    }
    const { data } = await apiClient.delete<{ success: boolean }>(`/admin/ads/${encodeURIComponent(id)}`)
    return data
  },

  // ─── Patient ──────────────────────────────────────────────────────────────

  async getPatientAds(): Promise<PatientAd[]> {
    if (isMockApi) {
      await mockDelay(200)
      const today = new Date().toISOString().split('T')[0]
      const countryName = patientService.getProfileMock().user.country
      return mockAds
        .filter(ad => isMockEligible(ad, today, countryName))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(({ id, ctaUrl, desktopImageUrl, mobileImageUrl, updatedAt }) => ({
          id,
          ctaUrl,
          desktopImageUrl,
          mobileImageUrl,
          updatedAt,
        }))
    }
    const { data } = await apiClient.get<PatientAd[]>('/patient/ads')
    return data
  },

  async recordImpression(id: string): Promise<{ success: boolean }> {
    if (isMockApi) return { success: true }
    const { data } = await apiClient.post<{ success: boolean }>(
      `/patient/ads/${encodeURIComponent(id)}/impression`,
    )
    return data
  },

  async recordClick(id: string): Promise<{ success: boolean }> {
    if (isMockApi) return { success: true }
    const { data } = await apiClient.post<{ success: boolean }>(
      `/patient/ads/${encodeURIComponent(id)}/click`,
    )
    return data
  },
}
