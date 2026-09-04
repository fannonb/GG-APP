import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { RedisService } from '../../../redis/redis.service'
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type'

interface JwtPayload {
  sub: string
  email: string
  role: 'patient' | 'sp' | 'admin'
  iat?: number
  /** Logical session id; key for per-session revocation. Missing on tokens
   * issued before the per-session model shipped. */
  jti?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name)

  /** Last-known revocation state, refreshed on every successful Redis check.
   * Used to fail closed (and stay usable) through short Redis outages instead
   * of silently re-enabling revoked sessions (audit M5). */
  private readonly sessionCache = new Map<string, { revoked: boolean; checkedAt: number }>()
  private readonly cutoffCache = new Map<string, { cutoff: number | null; checkedAt: number }>()
  private static readonly CACHE_TTL_MS = 30_000
  private static readonly MAX_CACHE_ENTRIES = 10_000

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.accessSecret'),
    })
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const now = Date.now()
    const sessionState = payload.jti
      ? this.sessionState(payload.jti, now)
      : { known: true, revoked: false }
    const cutoffState = this.cutoffState(payload.sub, now)

    // Instant revocation happens at two granularities:
    //   1. Per-session — `session-revoked:<jti>` set on logout / "revoke this
    //      session". Kills exactly the peeled-off device.
    //   2. Per-user cutoff — `token-revoked-before:<userId>` set on password
    //      reset (and refresh-token reuse escalations). Kills every access
    //      token minted before the timestamp for the whole account.
    try {
      const [revokedBefore, sessionRevoked] = await Promise.all([
        this.redis.get(`token-revoked-before:${payload.sub}`),
        payload.jti ? this.redis.get(`session-revoked:${payload.jti}`) : Promise.resolve(null),
      ])
      const revokedBeforeCutoff = revokedBefore ? Number(revokedBefore) : null
      if (payload.jti) {
        this.sessionCache.set(payload.jti, { revoked: Boolean(sessionRevoked), checkedAt: now })
      }
      this.cutoffCache.set(payload.sub, { cutoff: revokedBeforeCutoff, checkedAt: now })
      this.pruneCaches()
      // `<=` on purpose: iat and the cutoff share second resolution, so a
      // token minted in the same second as the revocation is treated as
      // revoked. A token issued after the cutoff is unaffected.
      if (sessionRevoked) {
        throw new UnauthorizedException('Session has been revoked')
      }
      if (revokedBeforeCutoff !== null && payload.iat && payload.iat <= revokedBeforeCutoff) {
        throw new UnauthorizedException('Session has been revoked')
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      const reason = error instanceof Error ? error.message : String(error)
      // Redis is unreachable: fall back to last-known state and fail closed
      // when the state is unknown — a revoked session must not be re-enabled
      // by an outage (audit M5).
      if (sessionState.revoked) {
        throw new UnauthorizedException('Session has been revoked')
      }
      if (cutoffState.cutoff !== null && payload.iat && payload.iat <= cutoffState.cutoff) {
        throw new UnauthorizedException('Session has been revoked')
      }
      if (!sessionState.known || !cutoffState.known) {
        this.logger.warn(`Revocation check failed closed (redis: ${reason})`)
        throw new UnauthorizedException('Unable to verify session status. Please try again.')
      }
      // Both states were verified clean within the cache window — cached
      // negative results keep traffic flowing through short blips without
      // re-enabling anything that was revoked.
      this.logger.warn(`Revocation check used cached negative results (redis: ${reason})`)
    }

    return payload
  }

  private sessionState(jti: string, now: number): { known: boolean; revoked: boolean } {
    const entry = this.sessionCache.get(jti)
    if (entry && now - entry.checkedAt <= JwtStrategy.CACHE_TTL_MS) {
      return { known: true, revoked: entry.revoked }
    }
    return { known: false, revoked: false }
  }

  private cutoffState(userId: string, now: number): { known: boolean; cutoff: number | null } {
    const entry = this.cutoffCache.get(userId)
    if (entry && now - entry.checkedAt <= JwtStrategy.CACHE_TTL_MS) {
      return { known: true, cutoff: entry.cutoff }
    }
    return { known: false, cutoff: null }
  }

  private pruneCaches() {
    if (
      this.sessionCache.size <= JwtStrategy.MAX_CACHE_ENTRIES &&
      this.cutoffCache.size <= JwtStrategy.MAX_CACHE_ENTRIES
    ) {
      return
    }
    // Simple bound: on overflow drop everything (the caches refill on the next
    // successful checks). Keeps memory bounded under token churn.
    this.sessionCache.clear()
    this.cutoffCache.clear()
  }
}
