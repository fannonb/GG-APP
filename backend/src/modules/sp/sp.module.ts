import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { SpController } from './sp.controller'
import { SpService } from './sp.service'

@Module({
  imports: [NotificationsModule],
  controllers: [SpController],
  providers: [SpService],
})
export class SpModule {}
