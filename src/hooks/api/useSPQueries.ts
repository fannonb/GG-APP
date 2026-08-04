import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { spService } from '@/api/services/sp.service'
import { useAuthStore } from '@/store/auth.store'

export function useSPDashboard() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.dashboard(spMode),
    queryFn: () => spService.getDashboard(spMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  })
}

export function useSPAppointments() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.appointments(spMode),
    queryFn: () => spService.getAppointments(spMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useSPAppointment(id: string | undefined) {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.appointment(id ?? ''),
    queryFn: () => spService.getAppointment(id!, spMode),
    enabled: !!id,
  })
}

export function useSPPatients() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.patients(spMode),
    queryFn: () => spService.getPatients(spMode),
  })
}

export function useSPPatient(id: string | undefined) {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.patient(id ?? ''),
    queryFn: () => spService.getPatient(id!, spMode),
    enabled: !!id,
  })
}

export function useSPInvoices() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.invoices(spMode),
    queryFn: () => spService.getInvoices(spMode),
  })
}

export function useSPInvoice(id: string | undefined) {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.invoice(id ?? ''),
    queryFn: () => spService.getInvoice(id!, spMode),
    enabled: !!id,
  })
}

export function useSPInvoiceAttachment(id: string | undefined, enabled = true) {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.invoiceAttachment(id ?? ''),
    queryFn: () => spService.getInvoiceAttachment(id!, spMode),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSPPayments() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.payments(spMode),
    queryFn: () => spService.getPayments(spMode),
  })
}

export function useSPNotifications() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.notifications(spMode),
    queryFn: () => spService.getNotifications(spMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  })
}

export function useSPProfile() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.profile(spMode),
    queryFn: () => spService.getProfile(spMode),
  })
}

export function useSPSettings() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.settings(spMode),
    queryFn: () => spService.getSettings(spMode),
  })
}

export function useSPSessions() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.sessions(spMode),
    queryFn: () => spService.getSessions(spMode),
  })
}

export function useSPPayoutAccounts() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.payoutAccounts(spMode),
    queryFn: () => spService.getPayoutAccounts(spMode),
  })
}

export function useSPPrescriptionRequests() {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.prescriptionRequests(spMode),
    queryFn: () => spService.getPrescriptionRequests(spMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useSPPrescriptionRequest(id: string | undefined) {
  const spMode = useAuthStore(s => s.spMode)
  return useQuery({
    queryKey: queryKeys.sp.prescriptionRequest(id ?? ''),
    queryFn: () => spService.getPrescriptionRequest(id!, spMode),
    enabled: !!id,
  })
}
