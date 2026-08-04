import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { getAdminLedgerAccess, ledgerService } from '@/api/services/ledger.service'
import type { SetupLedgerPinPayload, UnlockLedgerPayload } from '@/types/ledger.types'

// -----------------------------------------------------------------------------
// Patient side
// -----------------------------------------------------------------------------

export function useLedgerStatus() {
  return useQuery({
    queryKey: queryKeys.patient.ledgerStatus,
    queryFn: () => ledgerService.getStatus(),
  })
}

export function useOwnLedger(beneficiaryId?: string) {
  return useQuery({
    queryKey: [...queryKeys.patient.ledger, beneficiaryId ?? 'all'] as const,
    queryFn: () => ledgerService.getOwnLedger(beneficiaryId),
  })
}

export function useLedgerAccessLog() {
  return useQuery({
    queryKey: queryKeys.patient.ledgerAccess,
    queryFn: () => ledgerService.getAccessLog(),
  })
}

function useLedgerInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.ledgerStatus })
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.ledgerAccess })
    void queryClient.invalidateQueries({ queryKey: queryKeys.patient.ledger })
  }
}

export function useSetupLedgerPinMutation() {
  const invalidate = useLedgerInvalidate()
  return useMutation({
    mutationFn: (payload: SetupLedgerPinPayload) => ledgerService.setupPin(payload),
    onSuccess: invalidate,
  })
}

export function useRevokeLedgerPinMutation() {
  const invalidate = useLedgerInvalidate()
  return useMutation({
    mutationFn: () => ledgerService.revokePin(),
    onSuccess: invalidate,
  })
}

export function useRevokeLedgerGrantMutation() {
  const invalidate = useLedgerInvalidate()
  return useMutation({
    mutationFn: (grantId: string) => ledgerService.revokeGrant(grantId),
    onSuccess: invalidate,
  })
}

// -----------------------------------------------------------------------------
// Service provider side
// -----------------------------------------------------------------------------

export function useUnlockLedgerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UnlockLedgerPayload) => ledgerService.unlock(payload),
    onSuccess: result => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sp.ledger(result.patientId) })
    },
  })
}

export function useSPPatientLedger(patientId: string | undefined, beneficiaryId?: string) {
  return useQuery({
    queryKey: [...queryKeys.sp.ledger(patientId ?? ''), beneficiaryId ?? 'all'] as const,
    queryFn: () => ledgerService.getLedger(patientId!, beneficiaryId),
    enabled: !!patientId,
    retry: false,
  })
}

// -----------------------------------------------------------------------------
// Admin
// -----------------------------------------------------------------------------

export function useAdminLedgerAccess(limit = 50) {
  return useQuery({
    queryKey: queryKeys.admin.ledgerAccess(limit),
    queryFn: () => getAdminLedgerAccess({ limit }),
  })
}
