import type { UserRole } from '@/types/user.types'

const ACCESS_KEY = 'gg_access_token'
const REFRESH_KEY = 'gg_refresh_token'
const ROLE_KEY = 'gg_user_role'
const EXPIRES_KEY = 'gg_token_expires'
const COOKIE_MODE_KEY = 'gg_cookie_mode'

export interface StoredSession {
  accessToken: string
  refreshToken: string
  role: UserRole
  expiresAt: number
}

/**
 * When the backend runs in cookie mode (`SESSION_COOKIE_MODE=true`) the web
 * client receives the refresh token in an httpOnly cookie and never persists
 * it here — page-visible storage (readable by any XSS) only ever holds the
 * short-lived access token and a non-sensitive mode marker.
 */
export function setSessionCookieMode(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(COOKIE_MODE_KEY, '1')
  } else {
    localStorage.removeItem(COOKIE_MODE_KEY)
  }
}

export function isSessionCookieMode(): boolean {
  return localStorage.getItem(COOKIE_MODE_KEY) === '1'
}

export const tokenStorage = {
  getSession(): StoredSession | null {
    const accessToken = localStorage.getItem(ACCESS_KEY)
    const refreshToken = localStorage.getItem(REFRESH_KEY) ?? ''
    const role = localStorage.getItem(ROLE_KEY) as UserRole | null
    const expiresRaw = localStorage.getItem(EXPIRES_KEY)
    // In cookie mode the refresh token legitimately lives only in the cookie.
    if (!accessToken || !role) return null
    return {
      accessToken,
      refreshToken,
      role,
      expiresAt: expiresRaw ? Number(expiresRaw) : 0,
    }
  },

  setSession(session: StoredSession): void {
    localStorage.setItem(ACCESS_KEY, session.accessToken)
    // In cookie mode the refresh token lives only in the httpOnly cookie;
    // never mirror a body-returned token into page-visible storage.
    localStorage.setItem(REFRESH_KEY, isSessionCookieMode() ? '' : session.refreshToken)
    localStorage.setItem(ROLE_KEY, session.role)
    localStorage.setItem(EXPIRES_KEY, String(session.expiresAt))
  },

  clear(): void {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(EXPIRES_KEY)
    localStorage.removeItem(COOKIE_MODE_KEY)
  },

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
}
