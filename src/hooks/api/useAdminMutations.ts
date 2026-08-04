import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { adminService } from '@/api/services/admin.service'
import type { AdminApplicationActionPayload } from '@/api/types'
import type { CreditApplicationActionPayload } from '@/types/credit.types'

function useAdminInvalidate() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.dashboard })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.applications })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.providers })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.creditApplications })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications })
  }

  return { queryClient, invalidate }
}

export function useApproveAdminApplicationMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminApplicationActionPayload }) =>
      adminService.approveApplication(id, payload),
    onSuccess: () => invalidate(),
  })
}

export function useRequestAdminApplicationInfoMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminApplicationActionPayload }) =>
      adminService.requestApplicationInfo(id, payload),
    onSuccess: () => invalidate(),
  })
}

export function useRejectAdminApplicationMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminApplicationActionPayload }) =>
      adminService.rejectApplication(id, payload),
    onSuccess: () => invalidate(),
  })
}

export function useSuspendAdminProviderMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: (id: string) => adminService.suspendProvider(id),
    onSuccess: () => invalidate(),
  })
}

export function useReactivateAdminProviderMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: (id: string) => adminService.reactivateProvider(id),
    onSuccess: () => invalidate(),
  })
}

export function useDeleteAdminProviderMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: (id: string) => adminService.deleteProvider(id),
    onSuccess: () => invalidate(),
  })
}

export function useSuspendAdminUserMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: (id: string) => adminService.suspendUser(id),
    onSuccess: () => invalidate(),
  })
}

export function useReactivateAdminUserMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: (id: string) => adminService.reactivateUser(id),
    onSuccess: () => invalidate(),
  })
}

export function useDeleteAdminUserMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => invalidate(),
  })
}

export function useApproveAdminCreditApplicationMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreditApplicationActionPayload }) =>
      adminService.approveCreditApplication(id, payload),
    onSuccess: () => invalidate(),
  })
}

export function useRejectAdminCreditApplicationMutation() {
  const { invalidate } = useAdminInvalidate()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreditApplicationActionPayload }) =>
      adminService.rejectCreditApplication(id, payload),
    onSuccess: () => invalidate(),
  })
}

export function useMarkAdminNotificationReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminService.markNotificationRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications })
    },
  })
}
