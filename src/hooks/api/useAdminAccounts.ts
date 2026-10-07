import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { adminAccountsService, type AccountKind, type UpdatePatientPayload, type UpdateProviderPayload } from '@/api/services/admin-accounts.service'

function useRefreshAccounts() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.users })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.providers })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'account-history'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'credit-activity'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'email-changes'] })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.notifications })
  }
}

export function useAccountHistory(kind: AccountKind, id: string | null) {
  return useQuery({
    queryKey: ['admin', 'account-history', kind, id],
    queryFn: () => adminAccountsService.history(kind, id!),
    enabled: !!id,
  })
}

export function usePatientCreditActivity(id: string | null) {
  return useQuery({
    queryKey: ['admin', 'credit-activity', id],
    queryFn: () => adminAccountsService.creditActivity(id!),
    enabled: !!id,
  })
}

export function useEmailChangeRequests(status: string) {
  return useQuery({
    queryKey: ['admin', 'email-changes', status],
    queryFn: () => adminAccountsService.emailChanges(status),
    refetchInterval: 60_000,
  })
}

/** Every admin account action, each refreshing the lists and history on success. */
export function useAdminAccountActions() {
  const refresh = useRefreshAccounts()
  const opts = { onSuccess: refresh }
  return {
    updatePatient: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: UpdatePatientPayload }) => adminAccountsService.updatePatient(id, payload), ...opts }),
    setCreditLimit: useMutation({ mutationFn: ({ id, limit, reason }: { id: string; limit: number; reason: string }) => adminAccountsService.setCreditLimit(id, limit, reason), ...opts }),
    updateProvider: useMutation({ mutationFn: ({ id, payload }: { id: string; payload: UpdateProviderPayload }) => adminAccountsService.updateProvider(id, payload), ...opts }),
    suspend: useMutation({ mutationFn: ({ kind, id, reason }: { kind: AccountKind; id: string; reason: string }) => adminAccountsService.suspend(kind, id, reason), ...opts }),
    reactivate: useMutation({ mutationFn: ({ kind, id }: { kind: AccountKind; id: string }) => adminAccountsService.reactivate(kind, id), ...opts }),
    signOutAll: useMutation({ mutationFn: ({ kind, id }: { kind: AccountKind; id: string }) => adminAccountsService.signOutAll(kind, id), ...opts }),
    sendPasswordReset: useMutation({ mutationFn: ({ kind, id }: { kind: AccountKind; id: string }) => adminAccountsService.sendPasswordReset(kind, id), ...opts }),
    resendVerification: useMutation({ mutationFn: (id: string) => adminAccountsService.resendVerification(id), ...opts }),
    decideEmailChange: useMutation({ mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) => adminAccountsService.decideEmailChange(id, approve, note), ...opts }),
  }
}
