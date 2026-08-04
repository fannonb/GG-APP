export interface AuthenticatedUser {
  sub: string
  email: string
  role: 'patient' | 'sp' | 'admin'
}
