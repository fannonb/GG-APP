import { Module } from '@nestjs/common'
import { ProvidersModule } from '../providers/providers.module'
import { CommonModule } from '../../common/common.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { PatientController } from './patient.controller'
import { PatientService } from './patient.service'

@Module({
  imports: [CommonModule, ProvidersModule, NotificationsModule],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
