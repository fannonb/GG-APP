import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/api/services/auth.service'
import { queryKeys } from '@/api/query-keys'
import { tokenStorage } from '@/lib/token-storage'
import { idbQueryPersister } from '@/lib/query-persister'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationsStore } from '@/store/notifications.store'
import { useUserStore } from '@/store/user.store'
import { ROUTES } from '@/router/routes'

/** Active sessions for the signed-in user (any role). */
export function useMySessions() {
  return useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: () => authService.getSessions(),
  })
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => authService.revokeSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions })
    },
  })
}

/** Signs out every device, including this one — full account logout. */
export function useRevokeAllSessionsMutation() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: () => authService.revokeAllSessions(),
    onSuccess: () => {
      tokenStorage.clear()
      useAuthStore.getState().logout()
      useUserStore.getState().reset()
      useNotificationsStore.setState({ patientNotifs: [], panelOpen: false })
      void idbQueryPersister.removeClient()
      navigate(ROUTES.LOGIN)
    },
  })
}
