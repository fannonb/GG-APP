let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null

export function registerPWA(): void {
  if (!('serviceWorker' in navigator)) return
  if (import.meta.env.DEV) {
    registrationPromise = navigator.serviceWorker
      .getRegistrations()
      .then(async registrations => {
        await Promise.all(registrations.map(registration => registration.unregister()))
        if ('caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map(key => caches.delete(key)))
        }
        return null
      })
      .catch(error => {
        console.warn('[pwa] Development cleanup failed:', error)
        return null
      })
    return
  }

  registrationPromise = navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then(registration => {
      if (registration.waiting) {
        void registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      return registration
    })
    .catch(error => {
      console.warn('[pwa] Service worker registration failed:', error)
      return null
    })
}

export async function checkForAppUpdate(): Promise<void> {
  const registration = await registrationPromise
  await registration?.update()
}
