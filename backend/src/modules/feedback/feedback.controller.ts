import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { PrismaService } from '../../prisma/prisma.service'
import { SubmitAppFeedbackDto } from './feedback.dto'

const DAY = 86_400_000

/** Ratings of GG'APP itself, shown on the admin Patients & credit page. */
@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Post()
  async submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitAppFeedbackDto) {
    const comment = dto.comment?.trim() || null
    // One rating per person per context per day, so repeat prompts can't skew the average.
    const recent = await this.prisma.appFeedback.findFirst({
      where: { userId: user.sub, context: dto.context, createdAt: { gte: new Date(Date.now() - DAY) } },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) {
      await this.prisma.appFeedback.update({ where: { id: recent.id }, data: { rating: dto.rating, comment, platform: dto.platform ?? recent.platform } })
    } else {
      await this.prisma.appFeedback.create({
        data: { userId: user.sub, role: user.role, rating: dto.rating, comment, context: dto.context, platform: dto.platform ?? null },
      })
    }
    return { message: 'Thanks for your feedback.' }
  }
}
