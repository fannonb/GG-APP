export interface AuthenticatedUser {
  sub: string
  email: string
  role: 'patient' | 'sp' | 'admin'
  /** Logical session identifier minted at login and attached to every access
   * token. Enables per-session revocation (see jwt.strategy.ts). Tokens issued
   * before this field was introduced will simply omit it. */
  jti?: string
}
