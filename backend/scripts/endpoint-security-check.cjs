// Isolated HTTP security checks against compiled application controllers.
// Uses synthetic records and in-memory Redis; never connects to a real database.
// Run: npm run build && node scripts/endpoint-security-check.cjs
require('reflect-metadata')
const fs = require('node:fs')
const path = require('node:path')
const { Test } = require('@nestjs/testing')
const { ValidationPipe, RequestMethod } = require('@nestjs/common')
const { APP_GUARD } = require('@nestjs/core')
const { ThrottlerModule, ThrottlerGuard } = require('@nestjs/throttler')
const { ConfigService } = require('@nestjs/config')
const { JwtService } = require('@nestjs/jwt')
const load = p => require('../dist/src/' + p)
const { JwtStrategy } = load('modules/auth/strategies/jwt.strategy')
const { RedisService } = load('redis/redis.service')
const { AuthService } = load('modules/auth/auth.service')
const { AccountRequestsService } = load('modules/auth/account-requests.service')
const { NotificationsService } = load('modules/notifications/notifications.service')
const { AdminPayoutsService } = load('modules/admin/admin-payouts.service')
const controllers = [
  ['modules/auth/auth.controller', 'AuthController'],
  ['modules/patient/patient.controller', 'PatientController'],
  ['modules/admin/admin.controller', 'AdminController'],
  ['modules/sp/sp.controller', 'SpController'],
  ['modules/ledger/patient-ledger.controller', 'PatientLedgerController'],
  ['modules/ledger/sp-ledger.controller', 'SpLedgerController'],
  ['modules/notifications/notifications.controller', 'NotificationsController'],
  ['modules/feedback/feedback.controller', 'FeedbackController'],
  ['modules/providers/providers.controller', 'ProvidersController'],
].map(([file, name]) => load(file)[name])
const secret = 'isolated-security-test-only-not-a-real-secret-2026'
const config = new ConfigService({ auth: { accessSecret: secret, cookieMode: false, refreshTtl: '30d' } })
const state = new Map()
const redis = { get: async key => state.get(key) ?? null, set: async (key, value) => state.set(key, value) }
const now = new Date('2026-10-26T00:00:00Z')
const syntheticPrisma = {
  user: { findUnique: async ({ where }) => where.email === 'applicant@example.invalid' ? { id: 'synthetic-user', email: where.email, role: 'SP', status: 'ACTIVE', passwordHash: require('bcryptjs').hashSync('SyntheticPassword123', 4) } : null },
  providerApplication: { findFirst: async ({ where }) => where.id === 'synthetic-application' && where.userId === 'synthetic-user' ? ({ id: 'synthetic-application', status: 'PENDING', decisionNote: 'SYNTHETIC PRIVATE REVIEW NOTE', submittedAt: now, decidedAt: null }) : null },
  providerApplicationMessage: { findMany: async () => [{ id: 'synthetic-message', author: 'ADMIN', kind: 'info', body: 'SYNTHETIC PRIVATE MESSAGE', createdAt: now }] },
  pushDevice: { upsert: async args => { storedPush = args.create; return args.create } },
}
let storedPush
const stub = () => new Proxy({}, { get: (_obj, prop) => {
  if (['then', 'onModuleInit', 'onApplicationBootstrap', 'onModuleDestroy', 'beforeApplicationShutdown', 'onApplicationShutdown'].includes(prop)) return undefined
  return async () => ({ accessToken: 'synthetic', refreshToken: 'synthetic' })
} })
// Explicit object, so the real status implementation and mapper run unchanged.
const actualStatus = Object.create(AuthService.prototype)
actualStatus.prisma = syntheticPrisma
actualStatus.redis = redis
actualStatus.configService = config
const authService = { getProviderApplicationStatus: (id, userId) => actualStatus.getProviderApplicationStatus(id, userId), getProviderApplicationAccess: (id, dto) => actualStatus.getProviderApplicationAccess(id, dto), login: async () => ({ accessToken: 'synthetic', refreshToken: 'synthetic' }) }
const accountService = new AccountRequestsService(syntheticPrisma, {})
const notificationsService = new NotificationsService(syntheticPrisma, config)
const tokens = new Map([[ConfigService, config], [RedisService, redis], [AuthService, authService], [AccountRequestsService, accountService], [NotificationsService, notificationsService]])
for (const controller of controllers) {
  for (const dep of Reflect.getMetadata('self:paramtypes', controller) ?? []) {
    if (!tokens.has(dep.param)) tokens.set(dep.param, stub())
  }
}
const checks = []
const record = (name, pass, detail) => checks.push({ name, pass, detail })
const jwt = new JwtService({ secret })
const issue = (role = 'patient', options = {}) => jwt.sign({ sub: 'synthetic-user', email: 'test@example.invalid', role, jti: 'synthetic-session' }, { expiresIn: '5m', ...options })

async function main() {
  const module = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
    controllers,
    providers: [...tokens].map(([provide, useValue]) => ({ provide, useValue })).concat([JwtStrategy, { provide: APP_GUARD, useClass: ThrottlerGuard }]),
  }).compile()
  // Disable initialization hook only: no real notification subscriptions exist.
  notificationsService.onModuleInit = () => {}
  const app = module.createNestApplication({ logger: false })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
  await app.listen(0, '127.0.0.1')
  const base = await app.getUrl()
  async function request(route, method = 'GET', token, body, headers = {}) {
    const response = await fetch(base + '/api/v1' + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    return { status: response.status, data: await response.json().catch(() => null) }
  }
  try {
    let count = 0
    for (const controller of controllers) {
      const prefix = Reflect.getMetadata('path', controller)
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = controller.prototype[name]
        if (typeof handler !== 'function' || !Reflect.hasMetadata('method', handler)) continue
        const isPublic = Reflect.getMetadata('isPublic', handler) ?? Reflect.getMetadata('isPublic', controller)
        const guards = Reflect.getMetadata('__guards__', handler) ?? Reflect.getMetadata('__guards__', controller) ?? []
        if (isPublic || !guards.length) continue
        const method = RequestMethod[Reflect.getMetadata('method', handler)]
        const suffix = Reflect.getMetadata('path', handler)
        const route = ('/' + prefix + '/' + suffix).replace(/\/+/g, '/').replace(/\/$/, '').replace(/:[^/]+/g, 'synthetic-id')
        for (const [label, token] of [['missing token', undefined], ['malformed token', 'not-a-jwt']]) {
          const response = await request(route, method, token)
          record(`${method} ${route}: ${label}`, response.status === 401, { status: response.status })
        }
        const roles = Reflect.getMetadata('roles', handler) ?? Reflect.getMetadata('roles', controller)
        if (roles?.length) {
          const wrongRole = ['patient', 'sp', 'admin'].find(role => !roles.includes(role.toUpperCase()))
          if (wrongRole) {
            const response = await request(route, method, issue(wrongRole))
            record(`${method} ${route}: reject ${wrongRole} role`, response.status === 403, { status: response.status })
          }
        }
        count++
      }
    }
    for (const [label, token] of [['valid token', issue()], ['expired token', issue('patient', { expiresIn: -1 })], ['wrong signing key', new JwtService({ secret: 'wrong-secret' }).sign({ sub: 'synthetic-user', role: 'admin' })]]) {
      const response = await request('/patient/profile', 'GET', token)
      record(label, response.status === (label === 'valid token' ? 200 : 401), { status: response.status })
    }
    state.set('session-revoked:synthetic-session', '1')
    record('revoked session denied', (await request('/patient/profile', 'GET', issue())).status === 401)
    state.clear()
    const dto = await request('/patient/profile', 'PATCH', issue(), { role: 'admin', creditLimit: 999999 })
    record('reject undeclared profile fields', dto.status === 400, { status: dto.status })
    const badPin = await request('/patient/invoices/synthetic-id/authorize', 'POST', issue(), { pin: 'abcd', step: 99 })
    record('reject invalid payment PIN and step', badPin.status === 400, { status: badPin.status })
    for (const [route, marker] of [['/auth/register/sp/synthetic-application/messages', 'SYNTHETIC PRIVATE MESSAGE'], ['/auth/register/sp/synthetic-application/status', 'SYNTHETIC PRIVATE REVIEW NOTE']]) {
      const response = await request(route)
      record('private application data requires authentication: ' + route, response.status === 401 || response.status === 403, { status: response.status, syntheticPrivateDataReturned: JSON.stringify(response.data).includes(marker) })
    }
    const push = await request('/notifications/push/subscribe', 'POST', issue(), { endpoint: 'https://127.0.0.1:9443/internal', keys: { p256dh: 'synthetic-key', auth: 'synthetic-auth' } })
    record('push subscription rejects loopback destination', push.status === 400 || push.data?.success === false, { status: push.status, success: push.data?.success, syntheticDestinationStored: storedPush?.address === 'https://127.0.0.1:9443/internal' })
    // Stub the outbound library: demonstrate destination reaches sender without network traffic.
    const webpush = require('web-push')
    const originalSend = webpush.sendNotification
    let forwarded
    webpush.sendNotification = async subscription => { forwarded = subscription.endpoint }
    try {
      notificationsService.vapidConfigured = true
      await notificationsService.sendWebPush('synthetic-device', 'https://127.0.0.1:9443/internal', {}, { title: 'synthetic' })
      record('push sender blocks loopback before transport', forwarded === undefined)
    } finally { webpush.sendNotification = originalSend }
    const key = require('node:crypto').createECDH('prime256v1')
    key.generateKeys()
    const validKeys = { p256dh: key.getPublicKey().toString('base64url'), auth: require('node:crypto').randomBytes(16).toString('base64url') }
    for (const endpoint of ['https://fcm.googleapis.com/fcm/send/synthetic', 'https://updates.push.services.mozilla.com/wpush/v2/synthetic', 'https://web.push.apple.com/synthetic', 'https://wns.notify.windows.com/synthetic']) {
      const good = await request('/notifications/push/subscribe', 'POST', issue(), { endpoint, keys: validKeys })
      record('valid browser push subscription: ' + new URL(endpoint).host, good.status === 201 && good.data?.success === true)
    }
    const { validatePushDestination } = load('modules/notifications/push-destination')
    for (const endpoint of ['http://fcm.googleapis.com/x', 'https://fcm.googleapis.com.evil.invalid/x', 'https://evil.invalid@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'https://[::1]/x', 'https://169.254.169.254/x', 'https://127.1/x', 'https://fcm.googleapis.com/x#fragment']) {
      let rejected = false
      try { validatePushDestination(endpoint) } catch (error) { rejected = error.getStatus?.() === 400 }
      record('reject unsafe push destination: ' + endpoint, rejected)
    }
    const access = await request('/auth/register/sp/synthetic-application/access', 'POST', undefined, { email: 'applicant@example.invalid', password: 'SyntheticPassword123' })
    record('pending applicant can authenticate without portal access', access.status === 201 && typeof access.data?.accessToken === 'string')
    for (const suffix of ['status', 'messages']) {
      const own = await request('/auth/register/sp/synthetic-application/' + suffix, 'GET', undefined, undefined, { 'X-Application-Token': access.data.accessToken })
      record('scoped access can read own ' + suffix, own.status === 200)
      const other = await request('/auth/register/sp/other-application/' + suffix, 'GET', undefined, undefined, { 'X-Application-Token': access.data.accessToken })
      record('scoped access cannot read another application ' + suffix, other.status === 401)
    }
    record('application token cannot access full API', (await request('/auth/sessions', 'GET', access.data.accessToken)).status === 401)
    const wrong = await request('/auth/register/sp/other-application/access', 'POST', undefined, { email: 'applicant@example.invalid', password: 'SyntheticPassword123' })
    record('credentials cannot authorize another application', wrong.status === 401)
    const incorrect = await request('/auth/register/sp/synthetic-application/access', 'POST', undefined, { email: 'applicant@example.invalid', password: 'WrongPassword123' })
    record('wrong applicant password rejected', incorrect.status === 401)
    const { applicationAccessKey } = load('modules/auth/application-access.guard')
    state.set(applicationAccessKey(access.data.accessToken), JSON.stringify({ applicationId: 'synthetic-application', userId: 'synthetic-user', expiresAt: Date.now() - 1 }))
    record('expired application token denied', (await request('/auth/register/sp/synthetic-application/status', 'GET', undefined, undefined, { 'X-Application-Token': access.data.accessToken })).status === 401)
    for (const [name, invoke] of [['status', () => actualStatus.getProviderApplicationStatus('synthetic-application', 'other-user')], ['messages', () => accountService.applicationThread('synthetic-application', 'other-user')]]) {
      let rejected = false
      try { await invoke() } catch (error) { rejected = [400, 404].includes(error.getStatus?.()) }
      record('service enforces application ownership: ' + name, rejected)
    }
    actualStatus.configService = new ConfigService({ app: { nodeEnv: 'production' } })
    actualStatus.mailService = { isEnabled: false }
    record('production mail outage never exposes reset credential', actualStatus.shouldExposeResetUrl() === false)
    for (const [name, invoke] of [['patient', () => actualStatus.registerPatient({})], ['provider', () => actualStatus.registerSp({})]]) {
      let rejected = false
      try { await invoke() } catch (error) { rejected = error.getStatus?.() === 503 }
      record('production mail outage cannot auto-verify ' + name + ' registration', rejected)
    }
    const refreshAsAccess = jwt.sign({ sub: 'synthetic-user', email: 'test@example.invalid', role: 'patient', typ: 'refresh' })
    record('refresh-purpose JWT rejected as access token', (await request('/patient/profile', 'GET', refreshAsAccess)).status === 401)
    const { AdminService } = load('modules/admin/admin.service')
    const analytics = Object.create(AdminService.prototype)
    analytics.prisma = {
      user: { findMany: async () => [] },
      invoice: { findMany: async () => [] },
      provider: { findMany: async ({ include }) => [{ id: 1, name: 'Synthetic clinic', category: 'CLINIC', categories: ['CLINIC'], country: 'KE', authUser: null, appointments: [], invoices: [], application: null, payoutAccounts: include.payoutAccounts ? [] : undefined, joinedAt: now, rating: 0, hoursJson: null, hours: '', lifecycleStatus: 'ACTIVE', status: 'OPEN' }] },
    }
    const analyticsResult = await analytics.getAnalytics()
    record('admin analytics loads provider relations required by its mapper', analyticsResult.topProviders.length === 1 && analyticsResult.topProviders[0].payoutAccount === null)
    let limitedAt = null
    for (let i = 1; i <= 11; i++) {
      const response = await request('/auth/login', 'POST', undefined, {})
      if (response.status === 429) { limitedAt = i; break }
    }
    record('login throttled by attempt 11', limitedAt !== null && limitedAt <= 11, { limitedAt })
    const payouts = Object.create(AdminPayoutsService.prototype)
    process.env.FINANCE_PARTNER_WEBHOOK_SECRET_SECURITYTEST = 'synthetic-webhook-secret'
    for (const signature of [undefined, 'invalid']) {
      let denied = false
      try { payouts.verifySignature('securitytest', Buffer.from('{}'), signature) } catch (error) { denied = error.getStatus?.() === 401 }
      record('webhook rejects ' + (signature ? 'invalid' : 'missing') + ' signature', denied)
    }
    delete process.env.FINANCE_PARTNER_WEBHOOK_SECRET_SECURITYTEST
    const result = { generatedAt: new Date().toISOString(), scope: 'Isolated HTTP server using real compiled controllers, JWT strategy, guards and DTO validation; synthetic service data; no real DB, Redis, or outbound push.', protectedRoutesChecked: count, passed: checks.filter(c => c.pass).length, failed: checks.filter(c => !c.pass).length, checks }
    fs.writeFileSync(path.join(__dirname, 'security-hardening-results.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify({ protectedRoutesChecked: count, passed: result.passed, failed: result.failed, failures: checks.filter(c => !c.pass) }, null, 2))
    process.exitCode = result.failed ? 1 : 0
  } finally { await app.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
