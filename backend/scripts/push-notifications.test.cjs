const { test } = require('node:test')
const assert = require('node:assert/strict')
const { NotificationsService } = require('../dist/src/modules/notifications/notifications.service')

function service(prisma) {
  const instance = Object.create(NotificationsService.prototype)
  instance.prisma = prisma
  instance.logger = { warn() {} }
  instance.checkExpoReceipts = async () => {}
  return instance
}

const row = (id, body) => ({ id, userId: 'patient', title: 'Invoice ready', body, screen: `/app/invoices/${id}`, type: 'INVOICE', createdAt: new Date(), pushClaimedAt: null, pushProcessedAt: null })

function inbox(rows) {
  return {
    notification: {
      findMany: async () => rows.filter(item => !item.pushProcessedAt && !item.pushClaimedAt).map(item => ({ ...item })),
      updateMany: async ({ where, data }) => {
        if (!where.id) return { count: 0 }
        const item = rows.find(item => item.id === where.id)
        if (!item || item.pushProcessedAt || (where.OR && item.pushClaimedAt)) return { count: 0 }
        if (where.pushClaimedAt && item.pushClaimedAt !== where.pushClaimedAt) return { count: 0 }
        Object.assign(item, data)
        return { count: 1 }
      },
    },
  }
}

test('same-title notifications retain their own body, id and destination', async () => {
  const rows = [row('one', 'First invoice'), row('two', 'Second invoice')]
  const instance = service(inbox(rows))
  const sent = []
  instance.sendPushToUser = async (_, payload) => { sent.push(payload); return true }
  await instance.deliverPending()
  assert.deepEqual(sent.map(item => [item.body, item.data.notification.id, item.data.url]), [
    ['First invoice', 'one', '/app/invoices/one'], ['Second invoice', 'two', '/app/invoices/two'],
  ])
  assert.ok(rows.every(item => item.pushProcessedAt))
})

test('concurrent workers claim each pending notification once', async () => {
  const rows = [row('one', 'First invoice')]
  const prisma = inbox(rows)
  let deliveries = 0
  const workers = [service(prisma), service(prisma)]
  workers.forEach(instance => { instance.sendPushToUser = async () => { deliveries++; return true } })
  await Promise.all(workers.map(instance => instance.deliverPending()))
  assert.equal(deliveries, 1)
})

test('a failed delivery stays pending for retry after a worker restart', async () => {
  const rows = [row('one', 'First invoice')]
  const prisma = inbox(rows)
  const first = service(prisma)
  first.sendPushToUser = async () => false
  await first.deliverPending()
  assert.equal(rows[0].pushProcessedAt, null)
  // Simulate the lease becoming eligible again in the database.
  rows[0].pushClaimedAt = null
  const restarted = service(prisma)
  restarted.sendPushToUser = async () => true
  await restarted.deliverPending()
  assert.ok(rows[0].pushProcessedAt)
})

test('Expo batches over 100 devices map errors and receipt IDs to the correct device', async () => {
  const deleted = [], receipts = [], sizes = []
  const instance = service({
    pushDevice: { deleteMany: async args => deleted.push(args.where.id) },
    pushReceipt: { upsert: async args => receipts.push(args.create) },
  })
  instance.expo = {
    chunkPushNotifications: messages => [messages.slice(0, 100), messages.slice(100)],
    sendPushNotificationsAsync: async chunk => {
      sizes.push(chunk.length)
      assert.ok(chunk.every(message => message.channelId === 'ggapp-alerts'))
      return chunk.map(message => message.to === 'token-100'
        ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
        : { status: 'ok', id: `receipt-${message.to}` })
    },
  }
  const devices = Array.from({ length: 102 }, (_, i) => ({ id: `device-${i}`, address: `token-${i}` }))
  assert.equal(await instance.sendExpoPush(devices, { title: 'Hello' }), true)
  assert.deepEqual(sizes, [100, 2])
  assert.deepEqual(deleted, ['device-100'])
  assert.equal(receipts.find(item => item.id === 'receipt-token-101').deviceId, 'device-101')
})

test('FCM credential errors in delayed receipts are logged and stale devices are removed', async () => {
  const deleted = [], completed = [], warnings = []
  const instance = service({
    pushReceipt: {
      findMany: async () => [{ id: 'invalid', deviceId: 'phone-a' }, { id: 'gone', deviceId: 'phone-b' }],
      deleteMany: async args => { if (args.where.id) completed.push(args.where.id) },
    },
    pushDevice: { deleteMany: async args => deleted.push(args.where.id) },
  })
  delete instance.checkExpoReceipts
  instance.logger.warn = message => warnings.push(message)
  instance.expo = { getPushNotificationReceiptsAsync: async () => ({
    invalid: { status: 'error', details: { error: 'InvalidCredentials' } },
    gone: { status: 'error', details: { error: 'DeviceNotRegistered' } },
  }) }
  await instance.checkExpoReceipts()
  assert.deepEqual(deleted, ['phone-b'])
  assert.deepEqual(completed, ['invalid', 'gone'])
  assert.ok(warnings.some(message => message.includes('InvalidCredentials')))
})

test('invalid subscriptions are rejected before storing a device', async () => {
  const instance = service({})
  await assert.rejects(instance.subscribe('user', { provider: 'expo', token: 'invalid' }), /Invalid Expo/)
  await assert.rejects(instance.subscribe('user', { endpoint: 'https://fcm.googleapis.com/example' }), /keys/)
})
