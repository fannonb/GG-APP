import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { AdsService } from './ads.service'
import { CreateAdBannerDto, UpdateAdBannerDto } from './dto/ad-banner.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/ads')
export class AdminAdsController {
  constructor(@Inject(AdsService) private readonly ads: AdsService) {}

  @Get()
  list() {
    return this.ads.listAds()
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAdBannerDto) {
    return this.ads.createAd(user.sub, dto)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') adId: string,
    @Body() dto: UpdateAdBannerDto,
  ) {
    return this.ads.updateAd(user.sub, adId, dto)
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') adId: string) {
    return this.ads.deleteAd(user.sub, adId)
  }
}
