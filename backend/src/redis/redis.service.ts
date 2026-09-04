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
  private connectPromise: Promise<void> | null = null
  private readonly nodeEnv: string
  private readonly redisConfigured: boolean

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.nodeEnv = configService.get<string>('app.nodeEnv') ?? 'development'
    const url = configService.get<string>('redis.url')
    this.redisConfigured = Boolean(url)

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
    // Track the in-flight connection so callers (e.g. the production
    // fail-fast in main.ts) can await it instead of racing it.
    this.connectPromise = this.ensureRedisConnection()
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
    if (!this.client) {
      return
    }

    try {
      await this.client.connect()
      this.mode = 'redis'
      this.logger.log('Connected to Redis.')
    } catch (error) {
      this.logger.warn(
        `Redis connection failed (${(error as Error).message}); using in-memory fallback for local development.`,
      )
      this.client.disconnect()
      this.client = null
      this.mode = 'memory'
      if (this.nodeEnv === 'production') {
        throw new Error('Redis is unreachable in production; refusing in-memory fallback.')
      }
    }
  }

  private async canUseRedis() {
    if (!this.client && this.mode === 'memory') {
      // Production must never silently degrade to the per-process memory
      // store: revocation/refresh state would be lost and revoked sessions
      // would be re-accepted (audit M5). Fail the call instead so auth can
      // fail closed.
      if (this.nodeEnv === 'production' && this.redisConfigured) {
        throw new Error('Redis is unavailable in production; in-memory fallback is disabled.')
      }
      return false
    }

    // Await the initial connection attempt so a slow-but-successful connect
    // is not mistaken for an outage (previous behavior raced the fail-fast).
    if (this.connectPromise) {
      await this.connectPromise
      this.connectPromise = null
    }

    if (!this.client || this.mode === 'memory') {
      if (this.nodeEnv === 'production' && this.redisConfigured) {
        throw new Error('Redis is unavailable in production; in-memory fallback is disabled.')
      }
      return false
    }

    if (this.client.status === 'ready') {
      return true
    }

    try {
      await this.client.connect()
      this.mode = 'redis'
      return true
    } catch (error) {
      if (this.nodeEnv === 'production') {
        this.client?.disconnect()
        this.client = null
        this.mode = 'memory'
        throw new Error(
          `Redis unavailable (${error instanceof Error ? error.message : String(error)}); in-memory fallback is disabled in production.`,
        )
      }
      this.logger.warn(`Redis unavailable (${(error as Error).message}); continuing with in-memory fallback.`)
      this.client.disconnect()
      this.client = null
      this.mode = 'memory'
      return false
    }
  }
}
