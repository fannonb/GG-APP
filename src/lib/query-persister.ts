import { get, set, del } from 'idb-keyval'
import type { PersistedClient } from '@tanstack/react-query-persist-client'
import { useAuthStore } from '@/store/auth.store'

const STORAGE_KEY = 'gg-app-query-cache'
const CRYPTO_KEY_STORE = 'gg-app-query-cache-key'
const ROLES = ['patient', 'sp', 'admin', 'anon'] as const
const PERSIST_DEBOUNCE_MS = 2_000
const MAX_PERSIST_CHARS = 3_000_000

/**
 * Offline query cache (profile, invoices, ledger, notifications) is PHI and is
 * encrypted at rest with a device-level AES-256-GCM key, and stored under a
 * role-scoped key so one role's data can never be restored into another
 * role's session (audit M4). The key lives in the same origin storage, so this
 * protects data on disk / in backups rather than against same-origin XSS
 * (which is what the httpOnly refresh cookie in H1 addresses).
 *
 * Performance notes (fixes for UI freezes):
 * - Persistence is debounced: TanStack's persistQueryClient fires on EVERY
 *   cache event with no throttle, so encrypting synchronously on each event
 *   blocked the main thread for hundreds of ms with large caches.
 * - base64 conversion is chunked (char-by-char string concatenation is ~10x
 *   slower on multi-MB payloads).
 * - Binary attachment blobs (`dataUrl`) are stripped before persisting, so a
 *   cache full of invoice/medical attachments can never stall the app or sit
 *   on disk unencrypted.
 */

function scopeKey(role: string): string {
  return `${STORAGE_KEY}:${role}`
}

function currentRole(): string {
  return useAuthStore.getState().userRole ?? 'anon'
}

async function getCryptoKey(): Promise<CryptoKey> {
  const existing = await get<CryptoKey>(CRYPTO_KEY_STORE)
  if (existing) return existing
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
  await set(CRYPTO_KEY_STORE, key)
  return key
}

function bufferToBase64(bytes: Uint8Array): string {
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

function base64ToBuffer(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Recursively drops binary `data:` blobs (invoice attachments, uploaded
 * documents) from the dehydrated cache so they are never persisted. */
function stripBinaryBlobs(value: unknown, depth = 0): unknown {
  if (depth > 10 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    return value.map(item => stripBinaryBlobs(item, depth + 1))
  }
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value)) {
    if (key === 'dataUrl' && typeof val === 'string' && val.startsWith('data:')) continue
    out[key] = stripBinaryBlobs(val, depth + 1)
  }
  return out
}

async function encrypt(value: string): Promise<{ iv: string; data: string }> {
  const key = await getCryptoKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    Uint8Array.from(new TextEncoder().encode(value)),
  )
  return { iv: bufferToBase64(iv), data: bufferToBase64(new Uint8Array(ciphertext)) }
}

async function decrypt(payload: { iv: string; data: string }): Promise<string> {
  const key = await getCryptoKey()
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(payload.iv) },
    key,
    base64ToBuffer(payload.data),
  )
  return new TextDecoder().decode(plaintext)
}

async function persistNow(client: PersistedClient): Promise<void> {
  try {
    const safeClient = stripBinaryBlobs(client) as PersistedClient
    const json = JSON.stringify(safeClient)
    if (json.length > MAX_PERSIST_CHARS) {
      console.warn(
        `[query-persister] Skipping persist (${json.length} chars) — cache too large to write safely.`,
      )
      return
    }
    const payload = await encrypt(json)
    await set(scopeKey(currentRole()), payload)
  } catch (error) {
    console.warn('[query-persister] Failed to persist cache', error)
  }
}

// Debounce: TanStack calls persistClient on every query/mutation cache event
// (no built-in throttle in this version). Coalesce to one write every 2s and
// always persist the latest snapshot, so the main thread is never blocked on
// a synchronous encode/stringify per event.
let pendingTimer: ReturnType<typeof setTimeout> | null = null
let pendingClient: PersistedClient | null = null

function schedulePersist(client: PersistedClient): Promise<void> {
  pendingClient = client
  if (pendingTimer) return Promise.resolve()
  return new Promise(resolve => {
    pendingTimer = setTimeout(() => {
      pendingTimer = null
      const next = pendingClient
      pendingClient = null
      void persistNow(next!).finally(resolve)
    }, PERSIST_DEBOUNCE_MS)
  })
}

export const idbQueryPersister = {
  persistClient: schedulePersist,
  restoreClient: async (): Promise<PersistedClient | undefined> => {
    try {
      const payload = await get<{ iv: string; data: string }>(scopeKey(currentRole()))
      if (!payload) return undefined
      const json = await decrypt(payload)
      return JSON.parse(json) as PersistedClient
    } catch (error) {
      // Corrupt/undecryptable cache (e.g. key was cleared) — boot fresh rather
      // than crash or leak anything.
      console.warn('[query-persister] Failed to restore cached queries', error)
      return undefined
    }
  },
  removeClient: async (): Promise<void> => {
    // Cancel any pending debounced write so it can't resurrect the cache.
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      pendingTimer = null
      pendingClient = null
    }
    // Logout doesn't know which role wrote the cache, so purge every scope
    // plus the legacy unscoped key from before role-scoping shipped.
    for (const role of ROLES) {
      await del(scopeKey(role))
    }
    await del(STORAGE_KEY)
  },
}
