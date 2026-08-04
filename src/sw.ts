/// <reference lib="webworker" />
// GG'APP service worker.
//
// `self.__WB_MANIFEST` is replaced at build time by vite-plugin-pwa
// (injectManifest strategy) with the full precache list of hashed build
// assets, so the app shell loads with zero network access after install.
//
// Buckets:
//   gg-app-shell-<rev>    precached app shell — rebuilt every deploy
//   gg-app-runtime-<rev>  runtime cache for fonts, images and same-origin API reads

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null } | string>
}

const VERSION = 'v5'
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

  // Same-origin API reads: network-first with cache fallback, so screens
  // can render the last known data when offline.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone()
            void caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy))
          }
          return response
        })
        .catch(() => caches.match(request).then(hit => hit ?? new Response('', { status: 504 }))),
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
  const target = event.notification.data?.url ?? '/'
  event.waitUntil(self.clients.openWindow(target))
})

export {}
