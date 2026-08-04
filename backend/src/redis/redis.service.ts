import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

type MemoryEntry = {
  value: string
  expiresAt?: number
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: Redis | null = null
  private readonly memoryStore = new Map<string, MemoryEntry>()
  private mode: 'redis' | 'memory' = 'memory'

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const url = configService.get<string>('redis.url')

    if (!url) {
      this.logger.warn('REDIS_URL is not set; using in-memory session store.')
      return
    }

    const client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 1000,
    })

    client.on('error', error => {
      this.logger.warn(`Redis error: ${(error as Error).message}`)
    })

    this.client = client
    void this.ensureRedisConnection()
  }

  get raw() {
    return this.client
  }

  async get(key: string) {
    if (await this.canUseRedis()) {
      return this.client?.get(key) ?? null
    }

    const entry = this.memoryStore.get(key)
    if (!entry) {
      return null
    }

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key)
      return null
    }

    return entry.value
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (await this.canUseRedis()) {
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client?.set(key, value, 'EX', ttlSeconds)
        return
      }

      await this.client?.set(key, value)
      return
    }

    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined
    this.memoryStore.set(key, { value, expiresAt })
  }

  async del(key: string) {
    if (await this.canUseRedis()) {
      await this.client?.del(key)
      return
    }

    this.memoryStore.delete(key)
  }

  async ping() {
    if (await this.canUseRedis()) {
      return this.client?.ping() ?? 'PONG'
    }

    return 'PONG (memory)'
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit()
    }
  }

  private async ensureRedisConnection() {
    if (!this.client || this.mode === 'redis') {
      return
    }

    try {
      await this.client.connect()
      this.mode = 'redis'
      this.logger.log('Connected to Redis.')
    } catch {
      this.logger.warn('Redis unavailable; using in-memory fallback for local development.')
      this.client.disconnect()
      this.client = null
      this.mode = 'memory'
    }
  }

  private async canUseRedis() {
    if (!this.client || this.mode === 'memory') {
      return false
    }

    if (this.client.status === 'ready') {
      return true
    }

    try {
      await this.client.connect()
      this.mode = 'redis'
      return true
    } catch {
      this.logger.warn('Redis unavailable; continuing with in-memory fallback.')
      this.client.disconnect()
      this.client = null
      this.mode = 'memory'
      return false
    }
  }
}
