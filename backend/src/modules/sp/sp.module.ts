import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { SpController } from './sp.controller'
import { SpService } from './sp.service'

@Module({
  imports: [NotificationsModule, AuthModule],
  controllers: [SpController],
  providers: [SpService],
})
export class SpModule {}
