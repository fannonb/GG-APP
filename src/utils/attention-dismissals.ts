import { isValidElement, useSyncExternalStore, type ReactNode } from 'react'
import { useAuthStore } from '@/store/auth.store'

/**
 * Per-browser dismissals for "Needs your attention" items.
 *
 * Each item gets its own localStorage key, namespaced by role and item id.
 * The stored value is a signature of the item's visible text, so a dismissed
 * item comes back when its situation changes (new amount, new invoice, new count).
 * If localStorage is unavailable, dismissals are kept in memory for this page session.
 */

const KEY_PREFIX = 'ggapp.dismissedAttention'

export interface DismissibleAttentionItem {
  id: string
  title: string
  meta?: string
  detail: ReactNode
}

const sessionFallback = new Map<string, string>()
const listeners = new Set<() => void>()
let revision = 0

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

function signatureOf(item: DismissibleAttentionItem): string {
  const text = [item.title, item.meta ?? '', textOf(item.detail)].join('|')
  // FNV-1a: short and stable, and changes whenever the visible text changes.
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function storageKey(scope: string, id: string): string {
  return `${KEY_PREFIX}.${scope}.${id}`
}

function readDismissal(key: string): string | null {
  try {
    const stored = window.localStorage.getItem(key)
    if (stored !== null) return stored
  } catch {
    // Storage blocked or unavailable: fall through to the in-memory copy.
  }
  return sessionFallback.get(key) ?? null
}

function writeDismissal(key: string, signature: string): void {
  sessionFallback.set(key, signature)
  try {
    window.localStorage.setItem(key, signature)
  } catch {
    // Storage blocked or full: the in-memory copy still hides the item until reload.
  }
}

function isAttentionDismissed(scope: string, item: DismissibleAttentionItem): boolean {
  return readDismissal(storageKey(scope, item.id)) === signatureOf(item)
}

function dismissAttentionItem(scope: string, item: DismissibleAttentionItem): void {
  writeDismissal(storageKey(scope, item.id), signatureOf(item))
  revision += 1
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getRevision(): number {
  return revision
}

/**
 * Dismissal state for the signed-in role. Call at the top of a component, before any early return.
 * `visible` drops items this browser has dismissed; `dismiss` persists one.
 * Subscribes the caller, so every dashboard using it re-renders when any dismissal changes.
 */
export function useAttentionDismissals() {
  const scope = useAuthStore(s => s.userRole) ?? 'guest'
  useSyncExternalStore(subscribe, getRevision)
  return {
    filterVisible: <T extends DismissibleAttentionItem>(items: T[]): T[] =>
      items.filter(item => !isAttentionDismissed(scope, item)),
    dismiss: (item: DismissibleAttentionItem): void => dismissAttentionItem(scope, item),
  }
}
