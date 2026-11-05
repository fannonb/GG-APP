const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseProviderCsv, PROVIDER_CSV_HEADERS } = require('../dist/src/modules/admin/provider-import/csv')
const { coordinatesFromMapsUrl, coordinatePair, resolveMapsCoordinates } = require('../dist/src/common/utils/provider-location')
const { ProviderImportService } = require('../dist/src/modules/admin/provider-import/provider-import.service')
const { ProviderCredentialsService } = require('../dist/src/common/services/provider-credentials.service')
const { AuthService } = require('../dist/src/modules/auth/auth.service')
const { AdminService } = require('../dist/src/modules/admin/admin.service')
const { createHash } = require('node:crypto')

const record = { practiceName: 'Test Clinic', email: 'clinic@example.test', phone: '+254700000001', country: 'KE', serviceTypes: 'Clinic', address: 'Test Road', latitude: '-1.23456', longitude: '36.12345' }

test('rejection and information requests need a note before changing any records', async () => {
  const admin = Object.create(AdminService.prototype)
  // No persistence configured: validation must fail before any write is attempted.
  await assert.rejects(admin.rejectApplication('admin', 'app1'), /reason/i)
  await assert.rejects(admin.rejectApplication('admin', 'app1', '  '), /reason/i)
  await assert.rejects(admin.requestInfo('admin', 'app1', ''), /information/i)
})
const csv = (records) => PROVIDER_CSV_HEADERS.join(',') + '\r\n' + records.map(r => PROVIDER_CSV_HEADERS.map(h => '"' + (r[h] ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n')

test('CSV preserves quoted commas, quotes, newlines, BOM and empty optional fields', () => {
  const row = { ...record, practiceName: 'Test, "Clinic"', address: 'First line\nSecond line' }
  assert.deepEqual(parseProviderCsv('\uFEFF' + csv([row]))[0].practiceName, row.practiceName)
  assert.equal(parseProviderCsv(csv([row]))[0].address, row.address)
  assert.throws(() => parseProviderCsv(csv([row]) + '"'), /quote/i)
  assert.throws(() => parseProviderCsv('email,email\na,b'), /Duplicate/)
  assert.throws(() => parseProviderCsv(csv(Array(201).fill(row))), /200/)
})

test('location uses place pin instead of camera centre and validates coordinates', () => {
  assert.deepEqual(coordinatesFromMapsUrl('https://www.google.com/maps/place/Clinic/@0,0,12z/data=!3d-1.2!4d36.8'), { lat: -1.2, lng: 36.8 })
  assert.deepEqual(coordinatesFromMapsUrl('https://www.google.com/maps/search/?api=1&query=-1.2%2C36.8'), { lat: -1.2, lng: 36.8 })
  assert.equal(coordinatesFromMapsUrl('https://www.google.com/maps/@-1.2,36.8,12z'), null)
  assert.throws(() => coordinatePair('91', '36'), /Coordinates/)
  assert.throws(() => coordinatePair('', ''), /both/)
  assert.throws(() => coordinatesFromMapsUrl('https://www.google.com.evil.test/maps?q=1,2'), /HTTPS/)
})

test('short link redirects cannot request private or non-Google hosts', async () => {
  const original = global.fetch; let calls = 0
  global.fetch = async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }) }
  try { await assert.rejects(resolveMapsCoordinates('https://maps.app.goo.gl/test'), /HTTPS/); assert.equal(calls, 1) }
  finally { global.fetch = original }
})

test('licence-free registration and partial licence details are accepted', async () => {
  const service = new ProviderCredentialsService({})
  const blank = await service.prepareForRegistration({ country: 'Kenya', serviceTypes: ['Clinic'] })
  assert.equal(blank.licenseNumber, ''); assert.deepEqual(blank.items, [])
  const { allowedCredentialKinds } = require('../dist/src/common/constants/credentials')
  const kind = [...allowedCredentialKinds('KE', ['Clinic'])][0]
  const partial = await service.prepareForRegistration({ country: 'Kenya', serviceTypes: ['Clinic'], credentials: [{ kind, number: 'TEST-123' }] })
  assert.equal(partial.items.length, 1)
})

test('preview writes nothing, duplicates prevent entire commit, valid import stays locked', async () => {
  const saved = []; const users = []
  const tx = { user: { create: async ({ data }) => { users.push(data); return { id: 'user1' } } }, providerApplication: { create: async ({ data }) => { saved.push(data); return { id: 'app1' } } }, auditLog: { create: async () => ({}) } }
  let transactions = 0
  const service = new ProviderImportService({ user: { findUnique: async () => null }, $transaction: async fn => { transactions++; return fn(tx) } })
  assert.equal((await service.run('admin', csv([record]))).valid, true)
  assert.equal(transactions, 0)
  const duplicate = await service.run('admin', csv([record, record]), true)
  assert.equal(duplicate.imported, 0); assert.equal(transactions, 0)
  const imported = await service.run('admin', csv([record]), true)
  assert.equal(imported.imported, 1); assert.equal(users[0].status, 'SUSPENDED')
  assert.ok(saved[0].importedAt); assert.equal(saved[0].licenseNumber, '')
  const invalid = await service.run('admin', csv([{ ...record, latitude: '' }]), true)
  assert.equal(invalid.valid, false); assert.equal(transactions, 1)
})

test('invitation requires approved import and reports email failure without exposing token', async () => {
  const auth = Object.create(AuthService.prototype)
  let application = { importedAt: new Date(), status: 'PENDING' }
  const updates = []
  auth.prisma = { providerApplication: { findUnique: async () => application, update: async args => updates.push(args), updateMany: async args => updates.push(args) }, auditLog: { create: async () => ({}) } }
  auth.mailService = { isEnabled: true, sendAccountNotice: async () => false }
  await assert.rejects(auth.inviteImportedProvider('admin', 'app1'), /Approve/)
  application = { ...application, status: 'APPROVED', email: 'clinic@example.test', practiceName: 'Test' }
  await assert.rejects(auth.inviteImportedProvider('admin', 'app1'), /could not be sent/)
  assert.equal(updates.at(-1).data.activationTokenHash, null)
  auth.mailService.sendAccountNotice = async () => true
  const response = await auth.inviteImportedProvider('admin', 'app1')
  assert.deepEqual(Object.keys(response), ['message'])
})

test('activation enforces expiry and consumes token once atomically', async () => {
  const auth = Object.create(AuthService.prototype)
  const token = 'a'.repeat(64), digest = createHash('sha256').update(token).digest('hex')
  const application = { id: 'app1', userId: 'u1', importedAt: new Date(), status: 'APPROVED', activationTokenHash: digest, activationExpiresAt: new Date(Date.now() + 60000), activatedAt: null }
  let userData
  const tx = { providerApplication: { updateMany: async ({ where, data }) => {
    if (application.activationTokenHash !== where.activationTokenHash) return { count: 0 }
    Object.assign(application, data); return { count: 1 }
  } }, user: { update: async ({ data }) => { userData = data } }, provider: { updateMany: async () => ({ count: 1 }) }, auditLog: { create: async () => ({}) } }
  auth.prisma = { providerApplication: { findUnique: async () => application }, $transaction: async fn => fn(tx) }
  application.activationExpiresAt = new Date(Date.now() - 1)
  await assert.rejects(auth.activateImportedProvider(token, 'Password123!'), /expired/)
  application.activationExpiresAt = new Date(Date.now() + 60000)
  await auth.activateImportedProvider(token, 'Password123!')
  assert.equal(userData.status, 'ACTIVE'); assert.ok(userData.emailVerifiedAt)
  assert.equal(application.activationTokenHash, null)
  await assert.rejects(auth.activateImportedProvider(token, 'Password123!'), /invalid|expired/)
})
