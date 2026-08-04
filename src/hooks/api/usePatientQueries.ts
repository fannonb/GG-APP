import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { patientService } from '@/api/services/patient.service'
import { providersService } from '@/api/services/providers.service'
import { reviewsService } from '@/api/services/reviews.service'
import { invoicesService } from '@/api/services/invoices.service'
import { isMockApi } from '@/api/config'
import { MOCK_INVOICE } from '@/mock/patient.mock'
import { useAuthStore } from '@/store/auth.store'
import { useUserStore } from '@/store/user.store'

export function usePatientProfile() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.profile(userMode),
    queryFn: () => patientService.getProfile(userMode),
    staleTime: 0,
    refetchOnMount: 'always',
    initialData: isMockApi ? () => patientService.getProfileMock(userMode) : undefined,
  })
}

export function usePatientDashboard() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.dashboard(userMode),
    queryFn: () => patientService.getDashboard(userMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    initialData: isMockApi ? () => patientService.getDashboardMock(userMode) : undefined,
  })
}

export function usePatientAppointments() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.appointments(userMode),
    queryFn: () => patientService.getAppointments(userMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    initialData: isMockApi ? () => patientService.getAppointmentsMock(userMode) : undefined,
  })
}

export function usePatientTransactions() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.transactions(userMode),
    queryFn: () => patientService.getTransactions(userMode),
  })
}

export function usePatientNotifications() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.notifications(userMode),
    queryFn: () => patientService.getNotifications(userMode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  })
}

export function useHealthNews() {
  return useQuery({
    queryKey: queryKeys.patient.news,
    queryFn: () => patientService.getNews(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    initialData: isMockApi ? () => patientService.getNewsMock() : undefined,
  })
}

export function usePatientNews() {
  return useHealthNews()
}

export function usePatientPrescriptionRequests() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.prescriptionRequests(userMode),
    queryFn: () => patientService.getPrescriptionRequests(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useProviders() {
  const countryCode = useUserStore(s => s.user.countryCode)
  return useQuery({
    queryKey: queryKeys.patient.providers(countryCode),
    queryFn: () => providersService.getAll(countryCode),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useProvidersByCategory(category: string) {
  const countryCode = useUserStore(s => s.user.countryCode)
  return useQuery({
    queryKey: queryKeys.patient.providersByCategory(category, countryCode),
    queryFn: () => providersService.getByCategory(category, countryCode),
    enabled: !!category,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
}

export function useProvider(id: number | string | undefined) {
  return useQuery({
    queryKey: queryKeys.patient.provider(id ?? ''),
    queryFn: () => providersService.getById(id!),
    enabled: id !== undefined && id !== '',
  })
}

export function useProviderReviews(providerId: number | string | undefined) {
  const numericId = providerId !== undefined && providerId !== '' ? Number(providerId) : undefined

  return useQuery({
    queryKey: queryKeys.patient.providerReviews(providerId ?? ''),
    queryFn: () => reviewsService.getByProvider(numericId!),
    enabled: numericId !== undefined && !Number.isNaN(numericId),
  })
}

export function usePatientInvoice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.patient.invoice(id ?? ''),
    queryFn: () => invoicesService.getPatientInvoice(id!),
    enabled: !!id,
    initialData: isMockApi
      ? () => (id && id === MOCK_INVOICE.id ? MOCK_INVOICE : undefined)
      : undefined,
  })
}

export function usePatientInvoiceAttachment(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.patient.invoiceAttachment(id ?? ''),
    queryFn: () => invoicesService.getPatientInvoiceAttachment(id!),
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePatientInvoices() {
  const userMode = useAuthStore(s => s.userMode)
  return useQuery({
    queryKey: queryKeys.patient.invoices(userMode),
    queryFn: () => invoicesService.getPatientInvoices(),
  })
}
