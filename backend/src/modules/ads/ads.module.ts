import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { AdminAdsController } from './admin-ads.controller'
import { PatientAdsController } from './patient-ads.controller'
import { AdsService } from './ads.service'

@Module({
  imports: [CommonModule],
  controllers: [AdminAdsController, PatientAdsController],
  providers: [AdsService],
})
export class AdsModule {}
