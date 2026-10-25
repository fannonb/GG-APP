/// <reference lib="webworker" />
// GG'APP service worker.
//
// `self.__WB_MANIFEST` is replaced at build time by vite-plugin-pwa
// (injectManifest strategy) with the full precache list of hashed build
// assets, so the app shell loads with zero network access after install.
//
// Buckets:
//   gg-app-shell-<rev>    precached app shell — rebuilt every deploy
//   gg-app-runtime-<rev>  runtime cache for fonts, images and static assets
//
// API responses are deliberately NOT cached here: offline reads are served by
// the ENCRYPTED react-query persist cache (query-persister.ts) instead. The
// service-worker cache would store PHI/c financial data unencrypted on disk
// and only ever purge on orderly logout — v6 dropped API caching entirely.

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>
}

const VERSION = 'v6'
const SHELL_CACHE = `gg-app-shell-${VERSION}`
const RUNTIME_CACHE = `gg-app-runtime-${VERSION}`
const CURRENT_CACHES = [SHELL_CACHE, RUNTIME_CACHE]
// Normalize to root-relative URLs so cache keys and lookups match
// same-origin request pathnames (workbox emits relative entries).
const PRECACHE_URLS = self.__WB_MANIFEST.map(entry => {
  const url = typeof entry === 'string' ? entry : entry.url
  return url.startsWith('/') || url.startsWith('http') ? url : `/${url}`
})

// Precached entries are immutable (hashed) and always present in the shell
// cache, so they are served straight from cache.
const precacheUrls = new Set(PRECACHE_URLS)
const isPrecached = (url: URL) => url.origin === self.location.origin && precacheUrls.has(url.pathname)

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => !CURRENT_CACHES.includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

async function cacheFallbackNetwork(request: Request, cacheName: string): Promise<Response> {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  // `basic` = same-origin; `opaque` = no-cors cross-origin (e.g. Google
  // Fonts CSS/woff2), which reports status 0 — cache both so they keep
  // working offline once seen.
  const cacheable =
    response && (response.type === 'opaque' || (response.status === 200 && response.type === 'basic'))
  if (cacheable) {
    const copy = response.clone()
    void caches.open(cacheName).then(cache => cache.put(request, copy))
  }
  return response
}

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  // SPA navigations: network-first so new deploys land immediately,
  // falling back to the precached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone()
          void caches.open(SHELL_CACHE).then(cache => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then(hit => hit ?? caches.match('/index.html')) as Promise<Response>),
    )
    return
  }

  if (!sameOrigin) {
    // Cross-origin GETs (Google Fonts, CDN images): cache-first so they
    // keep working offline once seen.
    event.respondWith(cacheFallbackNetwork(request, RUNTIME_CACHE).catch(() => new Response('', { status: 504 })))
    return
  }

  // Same-origin API calls: always the network, never the SW cache. Authenticated
  // responses can carry PHI and financial data; offline behaviour is provided
  // by the encrypted react-query IndexedDB persist layer instead.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({ message: 'You are offline. Reconnect to load this data.' }),
            { status: 504, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    )
    return
  }

  // Precached shell assets: immutable, served from cache.
  if (isPrecached(url)) {
    event.respondWith(caches.match(request).then(hit => hit ?? fetch(request)))
    return
  }

  // Any other same-origin static asset: cache-first.
  event.respondWith(cacheFallbackNetwork(request, RUNTIME_CACHE).catch(() => caches.match('/index.html') as Promise<Response>))
})

// The app posts this message on logout. v5-era service workers cached
// authenticated API responses in the runtime cache; v6 no longer does, but the
// handler stays so upgraded installs on old caches still scrub the legacy PHI
// copies (also driven by the activate cleanup below).
self.addEventListener('message', event => {
  if (event.data?.type !== 'CLEAR_RUNTIME_CACHE') return
  event.waitUntil(
    caches.delete(RUNTIME_CACHE).then(() => caches.open(RUNTIME_CACHE)),
  )
})

self.addEventListener('push', event => {
  const payload = event.data?.json?.() ?? {}
  const title = payload.title ?? "GG'APP"
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: '/icons.svg',
    badge: '/icons.svg',
    data: payload.data ?? {},
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = safeNotificationTarget(event.notification.data?.url)
  event.waitUntil(self.clients.openWindow(target))
})

/**
 * Push notifications carry a server-controlled `url`; only allow navigating to
 * a same-target relative path (or an exact same-origin URL). Anything else —
 * cross-origin addresses, exotic schemes, garbage — falls back to the app
 * root. The app's own router treats a leading `/` as an internal route.
 */
function safeNotificationTarget(raw: unknown): string {
  if (typeof raw === 'string') {
    if (raw.startsWith('/')) return raw
    try {
      const parsed = new URL(raw, self.location.origin)
      if (parsed.origin === self.location.origin) return parsed.pathname + parsed.search + parsed.hash
    } catch {
      // fall through to default
    }
  }
  return '/'
}

export {}
