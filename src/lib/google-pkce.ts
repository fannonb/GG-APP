const PKCE_STORAGE_PREFIX = 'gg_pkce_'

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * Creates a PKCE S256 verifier/challenge pair plus a CSRF state value for the
 * web Google OAuth flow. The verifier is kept in sessionStorage keyed by the
 * state value and consumed when Google redirects back.
 */
export async function createGooglePkcePair(): Promise<{
  verifier: string
  challenge: string
  state: string
}> {
  const state = randomState()
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const verifier = base64UrlEncode(array)

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  const challenge = base64UrlEncode(new Uint8Array(digest))

  sessionStorage.setItem(`${PKCE_STORAGE_PREFIX}${state}`, verifier)
  return { verifier, challenge, state }
}

/** Reads and removes the PKCE verifier for the given OAuth state. */
export function consumeGooglePkceVerifier(state: string | null): string | undefined {
  if (!state) return undefined
  const key = `${PKCE_STORAGE_PREFIX}${state}`
  const verifier = sessionStorage.getItem(key) ?? undefined
  sessionStorage.removeItem(key)
  return verifier
}
