import { usePatientAds } from '@/hooks/api/useAds'
import type { AdBanner } from '@/types/admin.types'

/** What the dashboard carousel needs for one slide. */
export type DashboardAd = Pick<AdBanner, 'id' | 'ctaUrl' | 'desktopImageUrl' | 'mobileImageUrl'>

/**
 * Built-in GG'APP house ad, shown in the dashboard ad slot when no real banner is eligible.
 * Its ctaUrl is an app route, so the carousel navigates in-app for it instead of opening a new tab.
 */
export const SAMPLE_AD: AdBanner = {
  id: 'sample-ad',
  advertiserName: "GG'APP",
  ctaUrl: '/app/services',
  desktopImageUrl: '/ads/sample-ad.svg',
  mobileImageUrl: '',
  status: 'active',
  frequency: 'always',
  startDate: '2000-01-01',
  expiresAt: '2999-12-31',
  countries: [],
  impressions: 0,
  clicks: 0,
  updatedAt: '1970-01-01T00:00:00.000Z',
}

const SAMPLE_ADS: DashboardAd[] = [SAMPLE_AD]

/**
 * Ads for the dashboard ad slot: the patient's eligible banners from the server (newest first),
 * or [SAMPLE_AD] while loading, on error, or when there are none.
 * Never returns an empty list, so the slot always has content.
 */
export function useDashboardAds(): DashboardAd[] {
  const { data } = usePatientAds()
  return data && data.length > 0 ? data : SAMPLE_ADS
}
