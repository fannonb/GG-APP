import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isMockApi } from '@/api/config'
import type { AdBanner } from '@/types/admin.types'
import { MOCK_AD_BANNERS } from '@/mock/admin.mock'

interface AdsStore {
  banners: AdBanner[]
  version: number
  updateBanner: (banner: AdBanner) => void
  addBanner:    (banner: AdBanner) => void
  deleteBanner: (id: string) => void
}

const MOCK_BANNER_IDS = new Set(MOCK_AD_BANNERS.map(banner => banner.id))

function getInitialBanners(): AdBanner[] {
  return isMockApi ? [...MOCK_AD_BANNERS] : []
}

function sanitizeBanners(banners: unknown): AdBanner[] {
  if (!Array.isArray(banners)) {
    return getInitialBanners()
  }

  if (isMockApi) {
    return banners as AdBanner[]
  }

  return (banners as AdBanner[]).filter(banner => !MOCK_BANNER_IDS.has(banner.id))
}

export const useAdsStore = create<AdsStore>()(
  persist(
    (set) => ({
      banners: getInitialBanners(),
      version: 0,

      updateBanner: banner =>
        set(s => ({
          version: s.version + 1,
          banners: s.banners.map(b =>
            b.id === banner.id ? { ...banner, updatedAt: new Date().toISOString() } : b
          ),
        })),

      addBanner: banner =>
        set(s => ({
          version: s.version + 1,
          banners: [banner, ...s.banners],
        })),

      deleteBanner: id =>
        set(s => ({
          version: s.version + 1,
          banners: s.banners.filter(b => b.id !== id),
        })),
    }),
    {
      name: 'gg-ads-store',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AdsStore>

        return {
          ...currentState,
          ...persisted,
          banners: sanitizeBanners(persisted.banners),
          version: persisted.version ?? currentState.version,
        }
      },
    }
  )
)
