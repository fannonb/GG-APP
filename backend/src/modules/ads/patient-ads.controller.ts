import { Controller, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { AdsService } from './ads.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PATIENT)
@Controller('patient/ads')
export class PatientAdsController {
  constructor(@Inject(AdsService) private readonly ads: AdsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.ads.listPatientAds(user.sub)
  }

  @Post(':id/impression')
  @HttpCode(200)
  impression(@Param('id') adId: string) {
    return this.ads.recordImpression(adId)
  }

  @Post(':id/click')
  @HttpCode(200)
  click(@Param('id') adId: string) {
    return this.ads.recordClick(adId)
  }
}
