import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { NotificationType, PrismaClient } from '@prisma/client'

/** The fields of an in-app notification as it was written. */
export interface CreatedNotification {
  userId: string
  type: NotificationType
  title: string
  body: string
  screen: string
}

type NotificationListener = (created: CreatedNotification[], at: Date) => void

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly notificationListeners: NotificationListener[] = []

  constructor() {
    super()
    // In-app notifications are written from many services, often inside a
    // transaction. Observing the writes here lets push delivery follow every one
    // of them without each call site having to remember to send a push.
    this.$use(async (params, next) => {
      const result = await next(params)
      if (params.model === 'Notification' && (params.action === 'create' || params.action === 'createMany')) {
        const raw = params.args?.data
        const rows = (Array.isArray(raw) ? raw : [raw]).filter(Boolean) as CreatedNotification[]
        if (rows.length > 0) {
          const at = new Date()
          for (const listener of this.notificationListeners) {
            try {
              listener(rows, at)
            } catch {
              // A listener must never break the write that triggered it.
            }
          }
        }
      }
      return result
    })
  }

  /** Called with every batch of in-app notifications written, possibly before their transaction commits. */
  onNotificationsCreated(listener: NotificationListener) {
    this.notificationListeners.push(listener)
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
