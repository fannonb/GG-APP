// Local database only. Uses a unique synthetic provider and removes it in finally.
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { PrismaClient } = require('@prisma/client')
const { ProviderImportService } = require('../dist/src/modules/admin/provider-import/provider-import.service')
const { ProviderCredentialsService } = require('../dist/src/common/services/provider-credentials.service')
const { AdminService } = require('../dist/src/modules/admin/admin.service')
const { AuthService } = require('../dist/src/modules/auth/auth.service')
const { SpService } = require('../dist/src/modules/sp/sp.service')

process.loadEnvFile()
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) throw new Error('Smoke test only runs against localhost')
const prisma = new PrismaClient()
const email = `onboarding-smoke-${randomUUID()}@example.test`
let applicationId, testUserId

async function main() {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  assert.ok(adminUser, 'A local admin is needed')
  const imports = new ProviderImportService(prisma)
  const csv = 'practiceName,email,phone,country,serviceTypes,address,latitude,longitude\nSmoke Clinic,' + email + ',+254700000000,KE,Clinic,Test Road,-1.23456,36.12345'
  assert.equal((await imports.run(adminUser.id, csv)).valid, true)
  assert.equal((await imports.run(adminUser.id, csv, true)).imported, 1)
  const app = await prisma.providerApplication.findFirstOrThrow({ where: { email } })
  applicationId = app.id; testUserId = app.userId
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: app.userId } })).status, 'SUSPENDED')
  const credentials = new ProviderCredentialsService({})
  const admin = new AdminService(prisma, {}, {}, {}, credentials)
  await assert.rejects(admin.rejectApplication(adminUser.id, app.id, '   '), /note|reason/i)
  await assert.rejects(admin.requestInfo(adminUser.id, app.id), /note|information/i)
  await admin.approveApplication(adminUser.id, app.id)
  assert.equal((await prisma.providerApplication.findUniqueOrThrow({ where: { id: app.id } })).decisionNote, null)
  assert.equal((await prisma.provider.findFirstOrThrow({ where: { applicationId: app.id } })).lifecycleStatus, 'SUSPENDED')
  assert.ok((await admin.getApplications()).some(a => a.id === app.id && a.importedAt && a.status === 'approved'))
  let token
  const auth = Object.create(AuthService.prototype)
  auth.prisma = prisma
  auth.mailService = { isEnabled: true, sendAccountNotice: async (_, notice) => { token = new URL('https://example.test' + notice.cta.path).searchParams.get('token'); return true } }
  await auth.inviteImportedProvider(adminUser.id, app.id)
  await auth.activateImportedProvider(token, 'SyntheticPassword123!')
  await assert.rejects(auth.activateImportedProvider(token, 'SyntheticPassword123!'), /invalid|expired/)
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: app.userId } })).status, 'ACTIVE')
  assert.equal((await prisma.provider.findFirstOrThrow({ where: { applicationId: app.id } })).lifecycleStatus, 'ACTIVE')
  const sp = Object.create(SpService.prototype)
  sp.prisma = prisma; sp.providerCredentials = credentials
  const { allowedCredentialKinds } = require('../dist/src/common/constants/credentials')
  const kind = [...allowedCredentialKinds('KE', ['Clinic'])][0]
  const updated = await sp.updateLicences(app.userId, { credentials: [{ kind, number: 'TEST-123' }], businessRegNumber: 'TEST-BUSINESS' })
  assert.equal(updated.credentials[0].number, 'TEST-123')
  assert.equal(updated.credentials[0].status, 'SUBMITTED')
  console.log('PASS: local import → review → approval → invitation → activation → add licence; email delivery stubbed')
}

main().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(async () => {
  // The unique synthetic email is the cleanup boundary, including partial failures.
  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    const apps = await prisma.providerApplication.findMany({ where: { userId: user.id } })
    const ids = apps.map(a => a.id)
    await prisma.auditLog.deleteMany({ where: { OR: [{ actorUserId: user.id }, { entityId: { in: ids } }] } })
    await prisma.provider.deleteMany({ where: { authUserId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
  }
  await prisma.$disconnect()
})
