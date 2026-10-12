import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PushChannel } from '@prisma/client'
import webpush from 'web-push'
import { Expo, type ExpoPushMessage } from 'expo-server-sdk'
import { PrismaService, type CreatedNotification } from '../../prisma/prisma.service'
import type { PushSubscribeDto } from './dto/push-subscribe.dto'

export interface PushPayload {
  title: string
  body?: string
  data?: Record<string, unknown>
}

/**
 * Notifications are often written inside a transaction. Waiting this long and
 * then confirming the row exists means a rolled-back write never sends a push.
 */
const PUSH_DELAY_MS = 1500

/**
 * Push delivery for the PWA (Web Push / VAPID) and the mobile app (Expo push
 * tokens -> FCM/APNs). Every browser and phone a user registers is stored as a
 * PushDevice, so a user receives on all of them.
 *
 * Every in-app notification is pushed automatically (see onModuleInit).
 * Delivery is fire-and-forget: failures are logged, and devices that are gone
 * (Web Push 404/410, Expo DeviceNotRegistered) are removed.
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name)
  private readonly expo: Expo
  private readonly vapidConfigured: boolean
  private readonly vapidPublicKey: string

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
    this.prisma.onNotificationsCreated((rows, at) => {
      setTimeout(() => void this.pushCreated(rows, at), PUSH_DELAY_MS)
    })
  }

  /** The VAPID public key browsers need to subscribe; empty when Web Push is off. */
  getWebPushPublicKey() {
    return { publicKey: this.vapidConfigured ? this.vapidPublicKey : '' }
  }

  async subscribe(userId: string, subscription: PushSubscribeDto, userAgent?: string) {
    const isExpo = subscription.provider === 'expo' || (!!subscription.token && !subscription.endpoint)
    const address = isExpo ? subscription.token : subscription.endpoint

    if (!address) {
      return { success: false, message: isExpo ? 'Expo push token is required' : 'Web push endpoint is required' }
    }
    if (isExpo && !Expo.isExpoPushToken(address)) {
      return { success: false, message: 'Invalid Expo push token' }
    }
    if (!isExpo && (!subscription.keys?.p256dh || !subscription.keys?.auth)) {
      return { success: false, message: 'Web push subscription keys are required' }
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
  async sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    try {
      const devices = await this.prisma.pushDevice.findMany({ where: { userId } })
      if (devices.length === 0) return
      await Promise.allSettled([
        ...devices
          .filter(d => d.channel === PushChannel.WEB)
          .map(d => this.sendWebPush(d.id, d.address, d.keys, payload)),
        this.sendExpoPush(devices.filter(d => d.channel === PushChannel.EXPO), payload),
      ])
    } catch (error) {
      this.logger.warn(`Push delivery failed for user ${userId}: ${(error as Error).message}`)
    }
  }

  /** Pushes freshly written in-app notifications once their rows are confirmed saved. */
  private async pushCreated(rows: CreatedNotification[], at: Date) {
    for (const row of rows) {
      try {
        const saved = await this.prisma.notification.findFirst({
          where: { userId: row.userId, title: row.title, createdAt: { gte: new Date(at.getTime() - 5000) } },
          orderBy: { createdAt: 'desc' },
        })
        if (!saved) continue // rolled back, or already deleted
        await this.sendPushToUser(row.userId, {
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
      } catch (error) {
        this.logger.warn(`Could not push notification to user ${row.userId}: ${(error as Error).message}`)
      }
    }
  }

  private async sendWebPush(deviceId: string, endpoint: string, keys: unknown, payload: PushPayload) {
    if (!this.vapidConfigured) return
    try {
      await webpush.sendNotification(
        { endpoint, keys: keys as { p256dh: string; auth: string } },
        JSON.stringify({ title: payload.title, body: payload.body ?? '', data: payload.data ?? {} }),
      )
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await this.prisma.pushDevice.delete({ where: { id: deviceId } }).catch(() => undefined)
      } else {
        this.logger.warn(`Web push delivery failed (${statusCode ?? 'no status'}): ${(error as Error).message}`)
      }
    }
  }

  private async sendExpoPush(devices: { id: string; address: string }[], payload: PushPayload) {
    if (devices.length === 0) return
    const messages: ExpoPushMessage[] = devices.map(d => ({
      to: d.address,
      title: payload.title,
      body: payload.body ?? '',
      data: payload.data ?? {},
      sound: 'default',
    }))
    try {
      const tickets = await this.expo.sendPushNotificationsAsync(messages)
      await Promise.all(
        tickets.map(async (ticket, i) => {
          if (ticket.status !== 'error') return
          if (ticket.details?.error === 'DeviceNotRegistered') {
            await this.prisma.pushDevice.delete({ where: { id: devices[i].id } }).catch(() => undefined)
          } else {
            this.logger.warn(`Expo push ticket error: ${ticket.message ?? 'unknown'}`)
          }
        }),
      )
    } catch (error) {
      this.logger.warn(`Expo push delivery failed: ${(error as Error).message}`)
    }
  }
}
