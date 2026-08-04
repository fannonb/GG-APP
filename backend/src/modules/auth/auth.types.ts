export interface AuthSessionResponse {
  accessToken: string
  refreshToken: string
  role: 'patient' | 'sp' | 'admin'
  expiresAt: number
}

export interface ForgotPasswordResponse {
  message: string
  resetUrl?: string
}
