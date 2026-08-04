import { Inject, Injectable, Logger } from '@nestjs/common'
import { RedisService } from '../../redis/redis.service'
import type { PushSubscribeDto } from './dto/push-subscribe.dto'

/**
 * Stores one push subscription per user in Redis (with the in-memory fallback
 * when REDIS_URL is not set). This is intentionally schema-free so the patient
 * PWA (Web Push) and the mobile app (Expo push tokens) can share the endpoint
 * without a database migration.
 *
 * TODO(notifications): fan-out to actual delivery (web-push / expo-server-sdk)
 * when the notification pipeline is wired up.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  private key(userId: string) {
    return `push:subscription:${userId}`
  }

  async subscribe(userId: string, subscription: PushSubscribeDto) {
    await this.redis.set(this.key(userId), JSON.stringify(subscription))
    this.logger.log(`Push subscription saved for user ${userId}`)
    return { success: true }
  }

  async unsubscribe(
    userId: string,
    target: { endpoint?: string; token?: string },
  ) {
    const raw = await this.redis.get(this.key(userId))
    if (!raw) {
      return { success: false, message: 'No push subscription found' }
    }

    let stored: PushSubscribeDto
    try {
      stored = JSON.parse(raw) as PushSubscribeDto
    } catch {
      await this.redis.del(this.key(userId))
      return { success: true, message: 'Stale subscription removed' }
    }

    const matches = target.endpoint
      ? stored.endpoint === target.endpoint
      : target.token
        ? stored.token === target.token
        : true

    if (matches) {
      await this.redis.del(this.key(userId))
      return { success: true }
    }

    return { success: false, message: 'Subscription does not match' }
  }
}
