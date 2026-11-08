import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adsService,
  type AdminAdPayload,
  type AdminAdUpdatePayload,
} from '@/api/services/ads.service'
import { useAuthStore } from '@/store/auth.store'
import type { AdBanner } from '@/types/admin.types'

const ADMIN_ADS_KEY = ['admin', 'ads'] as const

export function useAdminAds() {
  return useQuery({
    queryKey: ADMIN_ADS_KEY,
    queryFn: () => adsService.list(),
  })
}

export function useCreateAdMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminAdPayload) => adsService.create(payload),
    onSuccess: created => {
      // Show the new banner straight away so the editor can keep it selected.
      queryClient.setQueryData<AdBanner[]>(ADMIN_ADS_KEY, list => [
        created,
        ...(list ?? []).filter(ad => ad.id !== created.id),
      ])
      void queryClient.invalidateQueries({ queryKey: ADMIN_ADS_KEY })
    },
  })
}

export function useUpdateAdMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminAdUpdatePayload }) =>
      adsService.update(id, payload),
    onSuccess: updated => {
      queryClient.setQueryData<AdBanner[]>(ADMIN_ADS_KEY, list =>
        list?.map(ad => (ad.id === updated.id ? updated : ad)),
      )
      void queryClient.invalidateQueries({ queryKey: ADMIN_ADS_KEY })
    },
  })
}

export function useDeleteAdMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adsService.remove(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<AdBanner[]>(ADMIN_ADS_KEY, list => list?.filter(ad => ad.id !== id))
      void queryClient.invalidateQueries({ queryKey: ADMIN_ADS_KEY })
    },
  })
}

/** Ads the signed-in patient may see on the dashboard. The server filters them; cached for 5 minutes. */
export function usePatientAds() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: ['patient', 'ads', userMode] as const,
    queryFn: () => adsService.getPatientAds(),
    staleTime: 5 * 60 * 1000,
  })
}
