import { isMockApi } from '@/api/config'
import { apiClient } from '@/api/client'
import { mockDelay } from '@/api/mock/delay'
import { tokenStorage } from '@/lib/token-storage'
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
    tokenStorage.setSession(data)
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
      tokenStorage.setSession(data)
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
      tokenStorage.setSession(data.session)
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
    const refreshToken = tokenStorage.getRefreshToken()
    tokenStorage.clear()

    if (isMockApi || !refreshToken) return

    try {
      await apiClient.post('/auth/logout', { refreshToken })
    } catch {
      // Session cleared locally regardless
    }
  },

  async refreshSession(): Promise<AuthSession | null> {
    const stored = tokenStorage.getSession()
    if (!stored) return null

    if (isMockApi) {
      if (stored.expiresAt > Date.now()) return stored
      const session = buildMockSession(stored.role)
      tokenStorage.setSession(session)
      return session
    }

    const { data } = await apiClient.post<AuthSession>('/auth/refresh', {
      refreshToken: stored.refreshToken,
    })
    tokenStorage.setSession(data)
    return data
  },

  getStoredSession(): AuthSession | null {
    return tokenStorage.getSession()
  },
}
