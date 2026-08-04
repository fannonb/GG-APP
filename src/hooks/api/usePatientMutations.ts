import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { patientService } from '@/api/services/patient.service'
import { reviewsService } from '@/api/services/reviews.service'
import type {
  CancelPatientAppointmentPayload,
  ChangePatientPasswordPayload,
  SubmitReviewPayload,
  UpdatePatientProfilePayload,
  UpsertBeneficiaryPayload,
} from '@/api/types'
import type { CreatePrescriptionRequestPayload } from '@/types/prescription.types'
import { useAuthStore } from '@/store/auth.store'
import { useUserStore } from '@/store/user.store'
import { useNotificationsStore } from '@/store/notifications.store'
import type { Notification } from '@/types/user.types'

export function useCancelPatientAppointmentMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: CancelPatientAppointmentPayload
    }) => patientService.cancelAppointment(id, payload, userMode),
    onSuccess: appointment => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.appointments(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.notifications(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.dashboard(useAuthStore.getState().spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.appointments(useAuthStore.getState().spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.notifications(useAuthStore.getState().spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.appointment(appointment.id),
      })
    },
  })
}

export function useConfirmRescheduledAppointmentMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (id: string) =>
      patientService.confirmRescheduledAppointment(id, userMode),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.appointments(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.notifications(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.dashboard(useAuthStore.getState().spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.appointments(useAuthStore.getState().spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.notifications(useAuthStore.getState().spMode),
      })
    },
  })
}

export function useUpdatePatientProfileMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (payload: UpdatePatientProfilePayload) =>
      patientService.updateProfile(payload, userMode),
    onSuccess: profile => {
      useUserStore.setState({
        user: profile.user,
        beneficiaries: profile.beneficiaries,
      })
      queryClient.setQueryData(queryKeys.patient.profile(userMode), profile)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.profile(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
    },
  })
}

export function useSetBeneficiariesEnabledMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (enabled: boolean) =>
      patientService.setBeneficiariesEnabled(enabled, userMode),
    onMutate: async enabled => {
      await queryClient.cancelQueries({ queryKey: queryKeys.patient.profile(userMode) })
      const previousProfile = queryClient.getQueryData(queryKeys.patient.profile(userMode))
      const previousUser = useUserStore.getState().user
      const previousBeneficiaries = useUserStore.getState().beneficiaries

      useUserStore.setState({
        user: { ...previousUser, beneficiariesEnabled: enabled },
      })

      queryClient.setQueryData(
        queryKeys.patient.profile(userMode),
        (current: { user: typeof previousUser; beneficiaries: typeof previousBeneficiaries } | undefined) =>
          current
            ? { ...current, user: { ...current.user, beneficiariesEnabled: enabled } }
            : current,
      )

      return { previousProfile, previousUser, previousBeneficiaries }
    },
    onError: (_error, _enabled, context) => {
      if (!context) return
      useUserStore.setState({
        user: context.previousUser,
        beneficiaries: context.previousBeneficiaries,
      })
      if (context.previousProfile) {
        queryClient.setQueryData(queryKeys.patient.profile(userMode), context.previousProfile)
      }
    },
    onSuccess: profile => {
      useUserStore.setState({
        user: profile.user,
        beneficiaries: profile.beneficiaries,
      })
      queryClient.setQueryData(queryKeys.patient.profile(userMode), profile)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.profile(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
    },
  })
}

export function useAddBeneficiaryMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (payload: UpsertBeneficiaryPayload) =>
      patientService.addBeneficiary(payload, userMode),
    onSuccess: profile => {
      useUserStore.setState({
        user: profile.user,
        beneficiaries: profile.beneficiaries,
      })
      queryClient.setQueryData(queryKeys.patient.profile(userMode), profile)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
    },
  })
}

export function useUpdateBeneficiaryMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (params: { id: string; payload: UpsertBeneficiaryPayload }) =>
      patientService.updateBeneficiary(params.id, params.payload, userMode),
    onSuccess: profile => {
      useUserStore.setState({
        user: profile.user,
        beneficiaries: profile.beneficiaries,
      })
      queryClient.setQueryData(queryKeys.patient.profile(userMode), profile)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
    },
  })
}

export function useDeleteBeneficiaryMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (id: string) => patientService.deleteBeneficiary(id, userMode),
    onSuccess: profile => {
      useUserStore.setState({
        user: profile.user,
        beneficiaries: profile.beneficiaries,
      })
      queryClient.setQueryData(queryKeys.patient.profile(userMode), profile)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.dashboard(userMode),
      })
    },
  })
}

export function useSubmitReviewMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (payload: SubmitReviewPayload) => reviewsService.submit(payload),
    onSuccess: review => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.providerReviews(review.providerId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.provider(review.providerId),
      })
      void queryClient.invalidateQueries({
        queryKey: ['patient', 'providers'],
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoices(userMode),
      })
    },
  })
}

export function useMarkPatientNotificationReadMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  const markReadLocally = (id: string) => {
    useNotificationsStore.getState().markRead(id, 'patient')
    queryClient.setQueryData<Notification[]>(
      queryKeys.patient.notifications(userMode),
      current => current?.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification,
      ) ?? current,
    )
  }

  return useMutation({
    mutationFn: (id: string) => patientService.markNotificationRead(id),
    onMutate: (id) => {
      const previous = queryClient.getQueryData<Notification[]>(
        queryKeys.patient.notifications(userMode),
      )
      markReadLocally(id)
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.patient.notifications(userMode), context.previous)
        useNotificationsStore.setState({ patientNotifs: context.previous })
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.profile(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: ['patient', 'credit'],
      })
    },
  })
}

export function useCreatePrescriptionRequestMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (payload: CreatePrescriptionRequestPayload) =>
      patientService.createPrescriptionRequest(payload),
    onSuccess: (request) => {
      queryClient.setQueryData(
        queryKeys.patient.prescriptionRequests(userMode),
        (current: import('@/types/prescription.types').PrescriptionRequest[] | undefined) =>
          [request, ...(current ?? [])],
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.prescriptionRequests(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.notifications(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.dashboard(useAuthStore.getState().spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.prescriptionRequests(useAuthStore.getState().spMode),
      })
    },
  })
}

export function useMarkPrescriptionQuoteReviewedMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (id: string) => patientService.markPrescriptionQuoteReviewed(id),
    onSuccess: (request) => {
      queryClient.setQueryData(
        queryKeys.patient.prescriptionRequests(userMode),
        (current: import('@/types/prescription.types').PrescriptionRequest[] | undefined) =>
          current?.map(item => (item.id === request.id ? request : item)) ?? current,
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.prescriptionRequests(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.invoices(userMode),
      })
    },
  })
}

export function useAcceptPrescriptionQuoteMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: (id: string) => patientService.acceptPrescriptionQuote(id),
    onSuccess: (request) => {
      queryClient.setQueryData(
        queryKeys.patient.prescriptionRequests(userMode),
        (current: import('@/types/prescription.types').PrescriptionRequest[] | undefined) =>
          current?.map(item => (item.id === request.id ? request : item)) ?? current,
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.prescriptionRequests(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.dashboard(useAuthStore.getState().spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.prescriptionRequests(useAuthStore.getState().spMode),
      })
    },
  })
}

export function useDeclinePrescriptionQuoteMutation() {
  const queryClient = useQueryClient()
  const userMode = useAuthStore(s => s.userMode)

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      patientService.declinePrescriptionQuote(id, reason),
    onSuccess: (request) => {
      queryClient.setQueryData(
        queryKeys.patient.prescriptionRequests(userMode),
        (current: import('@/types/prescription.types').PrescriptionRequest[] | undefined) =>
          current?.map(item => (item.id === request.id ? request : item)) ?? current,
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.patient.prescriptionRequests(userMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.dashboard(useAuthStore.getState().spMode),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.sp.prescriptionRequests(useAuthStore.getState().spMode),
      })
    },
  })
}

export function useChangePatientPasswordMutation() {
  return useMutation({
    mutationFn: (payload: ChangePatientPasswordPayload) =>
      patientService.changePassword(payload),
  })
}
