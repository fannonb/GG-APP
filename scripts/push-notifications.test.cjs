const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function browser({ subscribed = true, keyFailure = false, rejected = false, unsubscribeFailure = false } = {}) {
  const calls = [], storage = new Map()
  const subscription = { endpoint: 'https://fcm.googleapis.com/test', toJSON: () => ({ endpoint: subscription.endpoint }), unsubscribe: async () => { subscribed = false; calls.push('browser-unsubscribe'); return true } }
  const registration = { pushManager: {
    getSubscription: async () => subscribed ? subscription : null,
    subscribe: async () => { subscribed = true; return subscription },
  } }
  const apiClient = {
    get: async () => { calls.push('key'); if (keyFailure) { keyFailure = false; throw new Error('Offline') }; return { data: { publicKey: 'a2V5' } } },
    post: async url => { calls.push(url); if (url.endsWith('unsubscribe') && unsubscribeFailure) throw new Error('Offline'); return { data: { success: !rejected } } },
  }
  const filename = path.resolve(__dirname, '../src/services/push-notifications.ts')
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8').replaceAll('import.meta.env.DEV', 'false'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, {
    exports: module.exports, module,
    require: name => name === '@/api/client' ? { apiClient } : { VAPID_PUBLIC_KEY: '', isMockApi: false },
    navigator: { serviceWorker: { ready: Promise.resolve(registration) } },
    window: { PushManager: {}, Notification: {}, dispatchEvent() {} },
    Notification: { permission: 'granted' },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    atob, Event, console,
    setTimeout: (...args) => { const timer = setTimeout(...args); timer.unref(); return timer },
  })
  return { ...module.exports, calls, storage }
}

test('browser permission without a subscription does not appear enabled', async () => {
  assert.equal(await browser({ subscribed: false }).isPushEnabled(), false)
  assert.equal(await browser().isPushEnabled(), true)
})

test('turning notifications off prevents silent sign-in sync from enabling them again', async () => {
  const app = browser()
  await app.unsubscribeFromPushNotifications()
  await app.syncPushSubscription()
  assert.equal(await app.isPushEnabled(), false)
  assert.equal(app.calls.includes('/notifications/push/subscribe'), false)
  await app.subscribeToPushNotifications()
  assert.equal(await app.isPushEnabled(), true)
})

test('a failed public-key fetch can be retried without reloading the page', async () => {
  const app = browser({ keyFailure: true })
  assert.equal(await app.subscribeToPushNotifications(), null)
  assert.ok(await app.subscribeToPushNotifications())
  assert.equal(app.calls.filter(call => call === 'key').length, 2)
})

test('failed API cleanup still stops alerts on the browser', async () => {
  const app = browser({ unsubscribeFailure: true })
  await app.unsubscribeFromPushNotifications()
  assert.equal(await app.isPushEnabled(), false)
  assert.equal(app.calls[0], 'browser-unsubscribe')
})

test('logout removes the subscription without changing the notification preference', async () => {
  const app = browser()
  await app.unsubscribeFromPushNotifications({ disable: false })
  assert.equal(app.storage.has('gg-push-disabled'), false)
  await app.syncPushSubscription()
  assert.equal(await app.isPushEnabled(), true)
})

test('API rejection cannot be reported as a successful browser registration', async () => {
  await assert.rejects(browser({ rejected: true }).subscribeToPushNotifications(), /rejected/)
})

test('notification clicks stay on the app origin, including slash and backslash tricks', async () => {
  const handlers = {}, opened = []
  const source = fs.readFileSync(path.resolve(__dirname, '../src/sw.ts'), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(code, { exports: {}, URL, Set, self: {
    __WB_MANIFEST: [], location: { origin: 'https://app.example' },
    addEventListener: (event, callback) => { handlers[event] = callback },
    clients: { openWindow: async target => opened.push(target) },
  } })
  for (const url of ['/app/invoices/one', '//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)']) {
    let pending
    handlers.notificationclick({ notification: { close() {}, data: { url } }, waitUntil: task => { pending = task } })
    await pending
  }
  assert.deepEqual(opened, ['/app/invoices/one', '/', '/', '/', '/'])
})
