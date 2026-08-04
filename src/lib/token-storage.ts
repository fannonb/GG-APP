import type { UserRole } from '@/types/user.types'

const ACCESS_KEY = 'gg_access_token'
const REFRESH_KEY = 'gg_refresh_token'
const ROLE_KEY = 'gg_user_role'
const EXPIRES_KEY = 'gg_token_expires'

export interface StoredSession {
  accessToken: string
  refreshToken: string
  role: UserRole
  expiresAt: number
}

export const tokenStorage = {
  getSession(): StoredSession | null {
    const accessToken = localStorage.getItem(ACCESS_KEY)
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    const role = localStorage.getItem(ROLE_KEY) as UserRole | null
    const expiresRaw = localStorage.getItem(EXPIRES_KEY)
    if (!accessToken || !refreshToken || !role) return null
    return {
      accessToken,
      refreshToken,
      role,
      expiresAt: expiresRaw ? Number(expiresRaw) : 0,
    }
  },

  setSession(session: StoredSession): void {
    localStorage.setItem(ACCESS_KEY, session.accessToken)
    localStorage.setItem(REFRESH_KEY, session.refreshToken)
    localStorage.setItem(ROLE_KEY, session.role)
    localStorage.setItem(EXPIRES_KEY, String(session.expiresAt))
  },

  clear(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(EXPIRES_KEY)
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
}
