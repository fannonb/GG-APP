import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import webpush from 'web-push'
import { Expo } from 'expo-server-sdk'
import { RedisService } from '../../redis/redis.service'
import type { PushSubscribeDto } from './dto/push-subscribe.dto'

export interface PushPayload {
  title: string
  body?: string
  data?: Record<string, unknown>
}

/**
 * Push delivery for the PWA (Web Push / VAPID) and the mobile app
 * (Expo push tokens -> FCM/APNs). Subscriptions are stored per channel in
 * Redis so a user can receive on both web and mobile simultaneously.
 *
 * Delivery is fire-and-forget: failures are logged, and dead Web Push
 * subscriptions (HTTP 404/410) are pruned automatically.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private readonly expo: Expo | null = null
  private readonly vapidConfigured: boolean

  constructor(
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(ConfigService) configService: ConfigService,
  ) {
    const vapidPublicKey = configService.get<string>('notifications.vapidPublicKey') ?? ''
    const vapidPrivateKey = configService.get<string>('notifications.vapidPrivateKey') ?? ''
    const vapidSubject = configService.get<string>('notifications.vapidSubject') ?? ''

    this.vapidConfigured = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject)
    if (this.vapidConfigured) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
      this.logger.log('Web Push (VAPID) delivery enabled.')
    } else {
      this.logger.warn('Web Push is NOT configured (VAPID keys missing); web subscriptions will be stored but not delivered.')
    }

    const expoAccessToken = configService.get<string>('notifications.expoAccessToken') ?? ''
    this.expo = new Expo({ accessToken: expoAccessToken || undefined })
  }

  private webKey(userId: string) {
    return `push:web:${userId}`
  }

  private mobileKey(userId: string) {
    return `push:mobile:${userId}`
  }

  async subscribe(userId: string, subscription: PushSubscribeDto) {
    const isMobile = subscription.provider === 'expo' || (subscription.token && !subscription.endpoint)

    if (isMobile) {
      if (!subscription.token) {
        return { success: false, message: 'Expo push token is required' }
      }
      await this.redis.set(this.mobileKey(userId), subscription.token)
      this.logger.log(`Expo push token saved for user ${userId}`)
      return { success: true }
    }

    if (!subscription.endpoint) {
      return { success: false, message: 'Web push endpoint is required' }
    }
    await this.redis.set(this.webKey(userId), JSON.stringify(subscription))
    this.logger.log(`Web push subscription saved for user ${userId}`)
    return { success: true }
  }

  async unsubscribe(userId: string, target: { endpoint?: string; token?: string }) {
    let removed = false

    if (target.endpoint) {
      const raw = await this.redis.get(this.webKey(userId))
      if (raw) {
        try {
          const stored = JSON.parse(raw) as PushSubscribeDto
          if (stored.endpoint === target.endpoint) {
            await this.redis.del(this.webKey(userId))
            removed = true
          }
        } catch {
          await this.redis.del(this.webKey(userId))
          removed = true
        }
      }
    }

    if (target.token) {
      const storedToken = await this.redis.get(this.mobileKey(userId))
      if (storedToken === target.token) {
        await this.redis.del(this.mobileKey(userId))
        removed = true
      }
    }

    return removed
      ? { success: true }
      : { success: false, message: 'No matching push subscription found' }
  }

  /**
   * Fan out a notification to the user's Web Push subscription and Expo token.
   * Fire-and-forget: never throws (callers must not fail business logic when
   * push delivery fails).
   */
  async sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    await Promise.allSettled([
      this.sendWebPush(userId, payload),
      this.sendMobilePush(userId, payload),
    ])
  }

  private async sendWebPush(userId: string, payload: PushPayload): Promise<void> {
    if (!this.vapidConfigured) return

    const raw = await this.redis.get(this.webKey(userId))
    if (!raw) return

    let subscription: PushSubscribeDto
    try {
      subscription = JSON.parse(raw) as PushSubscribeDto
    } catch {
      await this.redis.del(this.webKey(userId))
      return
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint ?? '',
          expirationTime: subscription.expirationTime ?? null,
          keys: (subscription.keys ?? {}) as { p256dh: string; auth: string },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body ?? '',
          data: payload.data ?? {},
        }),
      )
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        this.logger.warn(`Web push subscription for user ${userId} is gone (${statusCode}); pruning.`)
        await this.redis.del(this.webKey(userId))
      } else {
        this.logger.warn(`Web push delivery failed for user ${userId}: ${(error as Error).message}`)
      }
    }
  }

  private async sendMobilePush(userId: string, payload: PushPayload): Promise<void> {
    if (!this.expo) return

    const token = await this.redis.get(this.mobileKey(userId))
    if (!token) return

    if (!Expo.isExpoPushToken(token)) {
      this.logger.warn(`Invalid Expo push token stored for user ${userId}; removing.`)
      await this.redis.del(this.mobileKey(userId))
      return
    }

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([
        {
          to: token,
          title: payload.title,
          body: payload.body ?? '',
          data: payload.data ?? {},
        },
      ])
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          this.logger.warn(`Expo push ticket error for user ${userId}: ${ticket.message ?? 'unknown'}`)
        }
      }
    } catch (error) {
      this.logger.warn(`Expo push delivery failed for user ${userId}: ${(error as Error).message}`)
    }
  }
}
