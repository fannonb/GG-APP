import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { RedisService } from '../../redis/redis.service'

@Injectable()
export class HealthService {
  private readonly prisma: PrismaService
  private readonly redis: RedisService

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(RedisService) redis: RedisService,
  ) {
    this.prisma = prisma
    this.redis = redis
  }

  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }

  async getReadiness() {
    await this.prisma.$queryRawUnsafe('SELECT 1')
    const redis = await this.redis.ping()

    return {
      status: 'ready',
      database: 'ok',
      redis,
      timestamp: new Date().toISOString(),
    }
  }
}
