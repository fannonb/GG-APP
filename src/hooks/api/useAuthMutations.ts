import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/api/services/auth.service'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationsStore } from '@/store/notifications.store'
import { useUserStore } from '@/store/user.store'
import { queryClient } from '@/lib/query-client'
import { PORTAL_HOME, ROUTES } from '@/router/routes'
import type { GoogleAuthPayload, GoogleAuthResult, LoginPayload, RegisterPatientPayload, RegisterSPPayload } from '@/api/types'
import { ApiError } from '@/api/types'
import { getGoogleOAuthUrl } from '@/api/client'
import { isMockApi } from '@/api/config'

export function useLoginMutation() {
  const navigate = useNavigate()
  const setSession = useAuthStore(s => s.setSession)

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: session => {
      setSession(session.role)
      navigate(PORTAL_HOME[session.role] ?? PORTAL_HOME.patient)
    },
  })
}

function useHandleGoogleAuthResult() {
  const navigate = useNavigate()
  const setSession = useAuthStore(s => s.setSession)

  return (result: GoogleAuthResult) => {
    if (result.needsRegistration) {
      navigate(`${ROUTES.REGISTER}?tab=patient`, {
        state: {
          googleProfile: {
            firstName: result.firstName,
            lastName: result.lastName,
            email: result.email,
            googleIdToken: result.googleIdToken,
          },
        },
      })
      return
    }
    setSession(result.role)
    navigate(PORTAL_HOME[result.role] ?? PORTAL_HOME.patient)
  }
}

export function useGoogleLoginMutation() {
  const handleResult = useHandleGoogleAuthResult()

  return useMutation({
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}${ROUTES.LOGIN}`
      if (isMockApi) {
        return authService.loginWithGoogle({ code: 'mock-code', redirectUri })
      }
      const url = getGoogleOAuthUrl(redirectUri)
      if (!url) throw new ApiError('Google sign-in is not configured', 400)
      window.location.href = url
      return null
    },
    onSuccess: result => {
      if (!result) return
      handleResult(result)
    },
  })
}

export function useGoogleCallbackMutation() {
  const handleResult = useHandleGoogleAuthResult()

  return useMutation({
    mutationFn: (payload: GoogleAuthPayload) => authService.loginWithGoogle(payload),
    onSuccess: handleResult,
  })
}

export function useRegisterPatientMutation() {
  return useMutation({
    mutationFn: (payload: RegisterPatientPayload) => authService.registerPatient(payload),
  })
}

export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
  })
}

export function useRegisterSPMutation() {
  return useMutation({
    mutationFn: (payload: RegisterSPPayload) => authService.registerSP(payload),
  })
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  })
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authService.resetPassword(token, password),
  })
}

export function useLogoutMutation() {
  const navigate = useNavigate()
  const logout = useAuthStore(s => s.logout)
  const resetUser = useUserStore(s => s.reset)

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      logout()
      resetUser()
      useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      queryClient.clear()
      navigate(ROUTES.LOGIN)
    },
  })
}
