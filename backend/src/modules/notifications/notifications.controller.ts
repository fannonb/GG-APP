import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { NotificationsService } from './notifications.service'
import { PushSubscribeDto, PushUnsubscribeDto } from './dto/push-subscribe.dto'

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    @Inject(NotificationsService) private readonly notificationsService: NotificationsService,
  ) {}

  @Post('push/subscribe')
  subscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PushSubscribeDto,
  ) {
    return this.notificationsService.subscribe(user.sub, dto)
  }

  @Post('push/unsubscribe')
  unsubscribe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PushUnsubscribeDto,
  ) {
    return this.notificationsService.unsubscribe(user.sub, dto)
  }
}
