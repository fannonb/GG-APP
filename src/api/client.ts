import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL, isMockApi } from '@/api/config'
import { tokenStorage } from '@/lib/token-storage'
import { ApiError } from '@/api/types'
import type { AuthSession } from '@/api/types'

let refreshPromise: Promise<AuthSession | null> | null = null

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (isMockApi) return config
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

async function refreshAccessToken(): Promise<AuthSession | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null

  try {
    const { data } = await axios.post<AuthSession>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
    )
    tokenStorage.setSession(data)
    return data
  } catch {
    tokenStorage.clear()
    return null
  }
}

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError<{ message?: string }>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    const status = error.response?.status

    if (status === 401 && original && !original._retry && !isMockApi) {
      original._retry = true
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const session = await refreshPromise
      if (session) {
        original.headers.Authorization = `Bearer ${session.accessToken}`
        return apiClient(original)
      }
    }

    const rawMessage = error.response?.data?.message
    const message = Array.isArray(rawMessage)
      ? rawMessage.join('. ')
      : (rawMessage ?? error.message ?? 'An unexpected error occurred')

    return Promise.reject(new ApiError(String(message), status ?? 500))
  },
)

export function getGoogleOAuthUrl(
  redirectUri: string,
  opts?: { state?: string; codeChallenge?: string },
): string | null {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) return null
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })
  if (opts?.state) params.set('state', opts.state)
  if (opts?.codeChallenge) {
    params.set('code_challenge', opts.codeChallenge)
    params.set('code_challenge_method', 'S256')
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
