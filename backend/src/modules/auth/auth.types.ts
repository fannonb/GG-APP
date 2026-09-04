export interface AuthSessionResponse {
  accessToken: string
  refreshToken: string
  role: 'patient' | 'sp' | 'admin'
  expiresAt: number
  /** Logical session id (same value as the access token's `jti`). Lets clients
   * identify their own session in the "active sessions" list. */
  sessionId?: string
  /** When true the server has placed the refresh token in a httpOnly cookie;
   * `refreshToken` in the body is intentionally empty for this client. */
  cookieSession?: boolean
}

export interface ForgotPasswordResponse {
  message: string
  resetUrl?: string
}
