import { isMockApi } from '@/api/config'
import { apiClient } from '@/api/client'
import { mockDelay } from '@/api/mock/delay'
import { isSessionCookieMode, setSessionCookieMode, tokenStorage } from '@/lib/token-storage'
import type {
  AuthSession,
  ForgotPasswordResponse,
  GoogleAuthPayload,
  GoogleAuthResult,
  LoginPayload,
  RegisterPatientPayload,
  RegisterPatientResponse,
  RegisterSPPayload,
  RegisterSPResponse,
  ResetPasswordResponse,
  SPApplicationStatusResponse,
  VerifyEmailResponse,
  ProviderSessionInfo,
} from '@/api/types'
import type { UserRole } from '@/types/user.types'

function buildMockSession(role: UserRole): AuthSession {
  return {
    accessToken: `mock-access-${role}-${Date.now()}`,
    refreshToken: `mock-refresh-${role}-${Date.now()}`,
    role,
    expiresAt: Date.now() + 60 * 60 * 1000,
  }
}

export const authService = {
  /** Persist a session returned by the API. When the backend used cookie mode
   * the refresh token is intentionally empty in the body — the httpOnly cookie
   * holds it, so only the mode marker is stored here. */
  persistSession(session: AuthSession): void {
    setSessionCookieMode(session.cookieSession === true)
    tokenStorage.setSession(session)
  },

  async login(payload: LoginPayload): Promise<AuthSession> {
    if (isMockApi) {
      await mockDelay(800)
      const session = buildMockSession(payload.role)
      tokenStorage.setSession(session)
      return session
    }

    const { data } = await apiClient.post<AuthSession>('/auth/login', payload, {
      headers:
        payload.role === 'admin' && payload.portalToken
          ? { 'X-Admin-Portal': payload.portalToken }
          : undefined,
    })
    this.persistSession(data)
    return data
  },

  async loginWithGoogle(payload: GoogleAuthPayload): Promise<GoogleAuthResult> {
    if (isMockApi) {
      await mockDelay(700)
      const session = buildMockSession('patient')
      tokenStorage.setSession(session)
      return { ...session, needsRegistration: false }
    }

    const { data } = await apiClient.post<GoogleAuthResult>('/auth/google', payload)
    if (!data.needsRegistration) {
      this.persistSession(data)
    }
    return data
  },

  async registerPatient(payload: RegisterPatientPayload): Promise<RegisterPatientResponse> {
    if (isMockApi) {
      await mockDelay(900)
      if (payload.googleIdToken) {
        const session = buildMockSession('patient')
        tokenStorage.setSession(session)
        return { message: 'Registration successful.', session }
      }
      return { message: 'Registration successful. Please verify your email.' }
    }

    const { data } = await apiClient.post<RegisterPatientResponse>('/auth/register/patient', payload)
    if (data.session) {
      this.persistSession(data.session)
    }
    return data
  },

  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    if (isMockApi) {
      await mockDelay(500)
      return { message: 'Email verified successfully. You can now sign in.' }
    }

    const { data } = await apiClient.post<VerifyEmailResponse>('/auth/verify-email', { token })
    return data
  },

  async registerSP(payload: RegisterSPPayload): Promise<RegisterSPResponse> {
    if (isMockApi) {
      await mockDelay(900)
      return {
        message: 'Application submitted. Awaiting admin approval.',
        applicationId: `mock-sp-app-${Date.now()}`,
        status: 'pending',
      }
    }

    const { data } = await apiClient.post<RegisterSPResponse>('/auth/register/sp', payload)
    return data
  },

  async getSPApplicationStatus(applicationId: string): Promise<SPApplicationStatusResponse> {
    if (isMockApi) {
      await mockDelay(400)
      return {
        applicationId,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        decidedAt: null,
        note: null,
      }
    }

    const { data } = await apiClient.get<SPApplicationStatusResponse>(
      `/auth/register/sp/${applicationId}/status`,
    )
    return data
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    if (isMockApi) {
      await mockDelay(700)
      return {
        message: 'If an account exists for that email, a reset link has been sent.',
        resetUrl: `${window.location.origin}/reset-password?token=mock-token`,
      }
    }

    const { data } = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(token: string, password: string): Promise<ResetPasswordResponse> {
    if (isMockApi) {
      await mockDelay(700)
      return { message: 'Password reset successfully. You can now sign in.' }
    }

    const { data } = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', { token, password })
    return data
  },

  async logout(): Promise<void> {
    const cookieMode = isSessionCookieMode()
    const accessToken = tokenStorage.getAccessToken()
    const refreshToken = tokenStorage.getRefreshToken()
    tokenStorage.clear()

    // Purge cached authenticated API responses from the service worker so
    // they can't be replayed by the next user of this device.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .getRegistration()
        .then(registration => registration?.active?.postMessage({ type: 'CLEAR_RUNTIME_CACHE' }))
        .catch(() => {
          /* logout must never fail on cache cleanup */
        })
    }

    // Cookie mode must always call the server so the httpOnly cookie is
    // cleared and the session revoked — the client cannot delete the cookie.
    if (isMockApi) return
    if (!cookieMode && !refreshToken && !accessToken) return

    try {
      await apiClient.post(
        '/auth/logout',
        cookieMode ? {} : { refreshToken },
        {
          headers: {
            // Logout is guarded server-side: it needs a live access token so a
            // stolen refresh token alone cannot destroy the session (audit L8).
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(cookieMode ? { 'X-Client': 'web' } : {}),
          },
        },
      )
    } catch {
      // Session cleared locally regardless
    }
  },

  async refreshSession(): Promise<AuthSession | null> {
    const stored = tokenStorage.getSession()
    if (!stored) return null
    const cookieMode = isSessionCookieMode()

    if (isMockApi) {
      if (stored.expiresAt > Date.now()) return stored
      const session = buildMockSession(stored.role)
      tokenStorage.setSession(session)
      return session
    }

    // In cookie mode the refresh token rides in the httpOnly cookie; the
    // access token in storage is short-lived and refreshed from it.
    const { data } = await apiClient.post<AuthSession>(
      '/auth/refresh',
      cookieMode ? {} : { refreshToken: stored.refreshToken },
      { headers: cookieMode ? { 'X-Client': 'web' } : undefined },
    )
    this.persistSession(data)
    return data
  },

  getStoredSession(): AuthSession | null {
    return tokenStorage.getSession()
  },

  async getSessions(): Promise<ProviderSessionInfo[]> {
    if (isMockApi) {
      await mockDelay(200)
      return [
        {
          id: 'mock-session-1',
          sessionId: 'mock-session-1',
          device: 'Chrome · Windows',
          location: 'Harare, ZW',
          ipAddress: '197.221.0.1',
          current: true,
          active: true,
          time: 'Active now',
          lastSeenAt: new Date().toISOString(),
        },
        {
          id: 'mock-session-2',
          sessionId: 'mock-session-2',
          device: 'Mobile App · Android',
          location: 'IP 197.221.0.2',
          current: false,
          active: false,
          time: new Date(Date.now() - 86_400_000).toISOString(),
          lastSeenAt: new Date(Date.now() - 86_400_000).toISOString(),
        },
      ]
    }

    const { data } = await apiClient.get<ProviderSessionInfo[]>('/auth/sessions')
    return data
  },

  async revokeSession(sessionId: string): Promise<{ message: string }> {
    if (isMockApi) {
      await mockDelay(200)
      return { message: 'Session revoked successfully.' }
    }
    const { data } = await apiClient.post<{ message: string }>(
      `/auth/sessions/${sessionId}/revoke`,
    )
    return data
  },

  async revokeAllSessions(): Promise<{ message: string }> {
    if (isMockApi) {
      await mockDelay(200)
      return { message: 'All sessions signed out.' }
    }
    const { data } = await apiClient.post<{ message: string }>('/auth/sessions/revoke-all')
    return data
  },
}
