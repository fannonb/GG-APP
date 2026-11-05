import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { RedisService } from '../../redis/redis.service'

export const applicationAccessKey = (token: string) =>
  `application-access:${createHash('sha256').update(token).digest('hex')}`

@Injectable()
export class ApplicationAccessGuard implements CanActivate {
  constructor(@Inject(RedisService) private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest()
    const token = req.headers['x-application-token']
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      throw new UnauthorizedException('Confirm your application credentials to continue.')
    }
    try {
      const stored = await this.redis.get(applicationAccessKey(token))
      if (!stored) throw new Error('Expired application access')
      const access = JSON.parse(stored) as { applicationId: string; userId: string; expiresAt: number }
      if (access.applicationId !== req.params.applicationId || !access.userId || access.expiresAt <= Date.now()) {
        throw new Error('Invalid application access')
      }
      req.applicationUserId = access.userId
      return true
    } catch {
      throw new UnauthorizedException('Application access expired. Confirm your credentials again.')
    }
  }
}
