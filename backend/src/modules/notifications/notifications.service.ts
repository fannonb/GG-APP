import { BadRequestException, Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PushChannel } from '@prisma/client'
import webpush from 'web-push'
import { Expo, type ExpoPushMessage } from 'expo-server-sdk'
import { PrismaService } from '../../prisma/prisma.service'
import type { PushSubscribeDto } from './dto/push-subscribe.dto'
import { validatePushDestination, validatePushKeys } from './push-destination'

export interface PushPayload {
  title: string
  body?: string
  data?: Record<string, unknown>
}

const PUSH_TTL_MS = 60 * 60 * 1000
const CLAIM_LEASE_MS = 10 * 60 * 1000
const RECEIPT_DELAY_MS = 15 * 60 * 1000

/**
 * Push delivery for the PWA (Web Push / VAPID) and the mobile app (Expo push
 * tokens -> FCM/APNs). Every browser and phone a user registers is stored as a
 * PushDevice, so a user receives on all of them.
 *
 * Committed notifications are polled using persisted delivery state, including
 * nested writes and createMany. Failed attempts survive API restarts.
 * Delivery is best-effort: failures are logged, and devices that are gone
 * (Web Push 404/410, Expo DeviceNotRegistered) are removed.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name)
  private readonly expo: Expo
  private readonly vapidConfigured: boolean
  private readonly vapidPublicKey: string
  private timer?: ReturnType<typeof setInterval>
  private pending?: Promise<void>

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) configService: ConfigService,
  ) {
    this.vapidPublicKey = configService.get<string>('notifications.vapidPublicKey') ?? ''
    const vapidPrivateKey = configService.get<string>('notifications.vapidPrivateKey') ?? ''
    const vapidSubject = configService.get<string>('notifications.vapidSubject') ?? ''

    this.vapidConfigured = Boolean(this.vapidPublicKey && vapidPrivateKey && vapidSubject)
    if (this.vapidConfigured) {
      webpush.setVapidDetails(vapidSubject, this.vapidPublicKey, vapidPrivateKey)
      this.logger.log('Web Push (VAPID) delivery enabled.')
    } else {
      this.logger.warn('Web Push is NOT configured (VAPID keys missing); web devices will be stored but not delivered to.')
    }

    const expoAccessToken = configService.get<string>('notifications.expoAccessToken') ?? ''
    this.expo = new Expo({ accessToken: expoAccessToken || undefined })
  }

  onModuleInit() {
    const tick = () => {
      if (this.pending) return
      this.pending = this.deliverPending().catch(error => {
        this.logger.warn(`Push worker failed: ${(error as Error).message}`)
      }).finally(() => { this.pending = undefined })
    }
    this.timer = setInterval(tick, 5000)
    this.timer.unref()
    tick()
  }

  async onModuleDestroy() {
    clearInterval(this.timer)
    await this.pending
  }

  /** The VAPID public key browsers need to subscribe; empty when Web Push is off. */
  getWebPushPublicKey() {
    return { publicKey: this.vapidConfigured ? this.vapidPublicKey : '' }
  }

  async subscribe(userId: string, subscription: PushSubscribeDto, userAgent?: string) {
    const isExpo = subscription.provider === 'expo' || (!!subscription.token && !subscription.endpoint)
    const address = isExpo ? subscription.token : subscription.endpoint

    if (!address) {
      throw new BadRequestException(isExpo ? 'Expo push token is required' : 'Web push endpoint is required')
    }
    if (isExpo && !Expo.isExpoPushToken(address)) {
      throw new BadRequestException('Invalid Expo push token')
    }
    if (!isExpo && (!subscription.keys?.p256dh || !subscription.keys?.auth)) {
      throw new BadRequestException('Web push subscription keys are required')
    }

    if (!isExpo) {
      validatePushDestination(address)
      validatePushKeys(subscription.keys)
    }

    const data = {
      userId,
      channel: isExpo ? PushChannel.EXPO : PushChannel.WEB,
      keys: isExpo ? undefined : { p256dh: subscription.keys!.p256dh, auth: subscription.keys!.auth },
      userAgent: userAgent?.slice(0, 512) ?? null,
      lastSeenAt: new Date(),
    }
    // Upsert on the device address: re-registering is harmless, and a device
    // that was signed in to another account moves to whoever is using it now.
    await this.prisma.pushDevice.upsert({
      where: { address },
      create: { address, ...data },
      update: data,
    })
    return { success: true }
  }

  async unsubscribe(userId: string, target: { endpoint?: string; token?: string }) {
    const addresses = [target.endpoint, target.token].filter((a): a is string => !!a)
    if (addresses.length === 0) {
      return { success: false, message: 'No push subscription given' }
    }
    const { count } = await this.prisma.pushDevice.deleteMany({
      where: { userId, address: { in: addresses } },
    })
    return count > 0 ? { success: true } : { success: false, message: 'No matching push subscription found' }
  }

  /**
   * Fans a notification out to every device the user has registered.
   * Never throws: callers must not fail business logic when push fails.
   */
  async sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
    try {
      const devices = await this.prisma.pushDevice.findMany({ where: { userId } })
      if (devices.length === 0) return true
      const results = await Promise.all([
        ...devices
          .filter(d => d.channel === PushChannel.WEB)
          .map(d => this.sendWebPush(d.id, d.address, d.keys, payload)),
        this.sendExpoPush(devices.filter(d => d.channel === PushChannel.EXPO), payload),
      ])
      return results.every(Boolean)
    } catch (error) {
      this.logger.warn(`Push delivery failed for user ${userId}: ${(error as Error).message}`)
      return false
    }
  }

  private async deliverPending() {
    await this.checkExpoReceipts()
    const cutoff = new Date(Date.now() - PUSH_TTL_MS)
    await this.prisma.notification.updateMany({
      where: { pushProcessedAt: null, createdAt: { lt: cutoff } },
      data: { pushProcessedAt: new Date() },
    })
    const claimable = () => ({
      pushProcessedAt: null,
      OR: [{ pushClaimedAt: null }, { pushClaimedAt: { lt: new Date(Date.now() - CLAIM_LEASE_MS) } }],
    })
    const rows = await this.prisma.notification.findMany({
      where: { ...claimable(), createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'asc' }, take: 25,
    })
    for (const saved of rows) {
      try {
        const claimedAt = new Date()
        // Conditional update keeps separate API instances from claiming a row together.
        const claimed = await this.prisma.notification.updateMany({
          where: { id: saved.id, ...claimable() }, data: { pushClaimedAt: claimedAt },
        })
        if (!claimed.count) continue
        const delivered = await this.sendPushToUser(saved.userId, {
          title: saved.title,
          body: saved.body,
          data: {
            // Web: the service worker opens this path when the notification is tapped.
            url: saved.screen.startsWith('/') ? saved.screen : '/',
            // Mobile: the same shape as GET /patient/notifications, used for routing.
            notification: {
              id: saved.id,
              type: saved.type.toLowerCase(),
              title: saved.title,
              body: saved.body,
              time: saved.createdAt.toISOString(),
              read: false,
              screen: saved.screen,
            },
          },
        })
        if (delivered) await this.prisma.notification.updateMany({
          where: { id: saved.id, pushClaimedAt: claimedAt }, data: { pushProcessedAt: new Date() },
        })
      } catch (error) {
        this.logger.warn(`Could not push notification ${saved.id}: ${(error as Error).message}`)
      }
    }
  }

  private async sendWebPush(deviceId: string, endpoint: string, keys: unknown, payload: PushPayload) {
    if (!this.vapidConfigured) return false
    try {
      // Revalidate legacy records too; rejecting new subscriptions alone is insufficient.
      validatePushDestination(endpoint)
      validatePushKeys(keys as Record<string, string>)
      await webpush.sendNotification(
        { endpoint, keys: keys as { p256dh: string; auth: string } },
        JSON.stringify({ title: payload.title, body: payload.body ?? '', data: payload.data ?? {} }),
        { timeout: 10_000, TTL: 60 * 60 },
      )
      return true
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await this.prisma.pushDevice.delete({ where: { id: deviceId } }).catch(() => undefined)
        return true
      } else {
        this.logger.warn(`Web push delivery failed (${statusCode ?? 'no status'}): ${(error as Error).message}`)
      }
      return false
    }
  }

  private async sendExpoPush(devices: { id: string; address: string }[], payload: PushPayload) {
    if (devices.length === 0) return true
    const messages: ExpoPushMessage[] = devices.map(d => ({
      to: d.address,
      title: payload.title,
      body: payload.body ?? '',
      data: payload.data ?? {},
      sound: 'default',
      channelId: 'ggapp-alerts',
      ttl: PUSH_TTL_MS / 1000,
      tag: typeof (payload.data?.notification as { id?: unknown } | undefined)?.id === 'string'
        ? (payload.data!.notification as { id: string }).id : undefined,
    }))
    const deviceByToken = new Map(devices.map(device => [device.address, device]))
    let delivered = true
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk)
        for (const [i, ticket] of tickets.entries()) {
          const device = deviceByToken.get(chunk[i].to as string)!
          if (ticket.status === 'ok') {
            await this.prisma.pushReceipt.upsert({
              where: { id: ticket.id },
              create: { id: ticket.id, deviceId: device.id, checkAt: new Date(Date.now() + RECEIPT_DELAY_MS) },
              update: {},
            })
          } else if (ticket.details?.error === 'DeviceNotRegistered') {
            await this.prisma.pushDevice.deleteMany({ where: { id: device.id } })
          } else {
            delivered = false
            this.logger.warn(`Expo push ticket error: ${ticket.message ?? 'unknown'}`)
          }
        }
      } catch (error) {
        delivered = false
        this.logger.warn(`Expo push delivery failed: ${(error as Error).message}`)
      }
    }
    return delivered
  }

  private async checkExpoReceipts() {
    // Receipts expire after 24h. Bound storage even during an extended outage.
    await this.prisma.pushReceipt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * PUSH_TTL_MS) } } })
    const pending = await this.prisma.pushReceipt.findMany({ where: { checkAt: { lte: new Date() } }, take: 1000 })
    if (!pending.length) return
    try {
      const receipts = await this.expo.getPushNotificationReceiptsAsync(pending.map(item => item.id))
      for (const item of pending) {
        const receipt = receipts[item.id]
        if (receipt?.status === 'error') {
          this.logger.warn(`Expo push receipt error: ${receipt.details?.error ?? receipt.message}`)
          if (receipt.details?.error === 'DeviceNotRegistered') {
            await this.prisma.pushDevice.deleteMany({ where: { id: item.deviceId } })
          }
        }
        if (receipt) await this.prisma.pushReceipt.deleteMany({ where: { id: item.id } })
        else await this.prisma.pushReceipt.updateMany({
          where: { id: item.id }, data: { checkAt: new Date(Date.now() + RECEIPT_DELAY_MS) },
        })
      }
    } catch (error) {
      await this.prisma.pushReceipt.updateMany({
        where: { id: { in: pending.map(item => item.id) } }, data: { checkAt: new Date(Date.now() + RECEIPT_DELAY_MS) },
      })
      this.logger.warn(`Expo receipt check failed: ${(error as Error).message}`)
    }
  }
}
