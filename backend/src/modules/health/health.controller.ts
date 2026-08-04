import { Controller, Get, Inject } from '@nestjs/common'
import { NewsStatus } from '@prisma/client'
import { Public } from '../../common/decorators/public.decorator'
import { PrismaService } from '../../prisma/prisma.service'
import { HealthService } from './health.service'

@Controller('health')
export class HealthController {
  private readonly healthService: HealthService
  private readonly prisma: PrismaService

  constructor(
    @Inject(HealthService) healthService: HealthService,
    @Inject(PrismaService) prisma: PrismaService,
  ) {
    this.healthService = healthService
    this.prisma = prisma
  }

  @Public()
  @Get()
  getHealth() {
    return this.healthService.getLiveness()
  }

  @Public()
  @Get('ready')
  async getReadiness() {
    return this.healthService.getReadiness()
  }

  @Public()
  @Get('news')
  async getNews() {
    const items = await this.prisma.newsArticle.findMany({
      where: { status: NewsStatus.PUBLISHED },
      orderBy: {
        publishedAt: 'desc',
      },
      take: 10,
    })

    return items.map(item => ({
      id: item.id,
      title: item.title,
      source: item.source,
      date: item.publishedAt.toISOString(),
      tag: item.tag,
      body: item.body,
      url: item.url ?? undefined,
    }))
  }
}
