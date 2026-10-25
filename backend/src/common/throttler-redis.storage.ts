import { Inject, Injectable, Logger } from '@nestjs/common'
import type { ThrottlerStorage } from '@nestjs/throttler'
import type Redis from 'ioredis'
import { RedisService } from '../redis/redis.service'

// @nestjs/throttler v6 does not re-export this record type from its index.
interface ThrottlerStorageRecord {
  totalHits: number
  timeToExpire: number
  isBlocked: boolean
  timeToBlockExpire: number
}

interface MemoryRecord {
  hits: number
  expiresAt: number
}

/**
 * Redis-backed throttler storage.
 *
 * The default in-memory `ThrottlerStorageService` keeps counters per process,
 * which has two consequences in production:
 *   1. Every replica counts its own budget (limits multiply with instances).
 *   2. Restarts reset the window, so restart-storms silently bypass limits.
 *
 * This implementation keeps the counter in the shared Redis instance with a
 * TTL equal to the throttle window. Semantics match @nestjs/throttler v6:
 * `increment` returns the hit total inside the current window, whether the
 * client is blocked, and remaining time in SECONDS (the guard feeds those
 * values straight into `Retry-After` / `X-RateLimit-Reset` headers).
 *
 * Failure behaviour: when Redis is unreachable, the limiter fails OPEN with a
 * warning — a transient rate-limit outage must never 500 the whole API. Auth
 * itself still fails closed through `jwt.strategy` / `RedisService`, so the
 * security boundary does not depend on this limiter succeeding.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name)
  private readonly memory = new Map<string, MemoryRecord>()

  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    // The guard's key is a sha256 of route + tracker + throttler name; prefix
    // it so these counters are visually distinct from other Redis keys and
    // can be swept/inspected without touching session state.
    const redisKey = `throttle:${key}`
    const client: Redis | null = this.redis.raw

    if (!client) {
      return this.incrementInMemory(redisKey, ttl, limit)
    }

    let hits: number
    try {
      hits = await client.incr(redisKey)
      if (hits === 1) {
        await client.pexpire(redisKey, ttl)
      } else {
        // Refresh on every hit so a client that keeps hammering past the
        // limit stays blocked (sliding lockout), while a normal client that
        // drops back under the limit unblocks when the window expires.
        // (Also recovers a lost TTL after external redis evictions.)
        await client.pexpire(redisKey, ttl)
      }

      const timeToLiveMs = await client.pttl(redisKey)
      const timeToExpireSeconds = timeToLiveMs > 0 ? Math.ceil(timeToLiveMs / 1000) : Math.ceil(ttl / 1000)

      const isBlocked = hits > limit
      return {
        totalHits: hits,
        timeToExpire: timeToExpireSeconds,
        isBlocked,
        // Block expires when the window resets (configs use default block
        // duration == window; an explicit blockDuration would drift this, see
        // TODO below).
        timeToBlockExpire: isBlocked ? timeToExpireSeconds : 0,
      }
    } catch (error) {
      // Fail open with context: a limiter outage must not take the API down.
      this.logger.warn(
        `Throttle store error on ${redisKey} (${throttlerName}): ${
          error instanceof Error ? error.message : String(error)
        } — allowing request.`,
      )
      return {
        totalHits: 1,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      }
    }
  }

  /**
   * Local fallback for development (REDIS_URL unset): mirrors the Redis
   * semantics with a per-process map so `vite`-style hot reloads and dev runs
   * keep limits meaningful. Production always talks to Redis (main.ts refuses
   * to boot without it).
   */
  private incrementInMemory(key: string, ttl: number, limit: number): ThrottlerStorageRecord {
    const now = Date.now()
    const record = this.memory.get(key)
    if (!record || record.expiresAt <= now) {
      this.memory.set(key, { hits: 1, expiresAt: now + ttl })
      this.sweep(now)
      return {
        totalHits: 1,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      }
    }
    record.hits += 1
    const timeToExpireSeconds = Math.ceil((record.expiresAt - now) / 1000)
    const isBlocked = record.hits > limit
    return {
      totalHits: record.hits,
      timeToExpire: timeToExpireSeconds,
      isBlocked,
      timeToBlockExpire: isBlocked ? timeToExpireSeconds : 0,
    }
  }

  private sweep(now: number) {
    if (this.memory.size < 1024) return
    for (const [key, record] of this.memory) {
      if (record.expiresAt <= now) this.memory.delete(key)
    }
  }
}
