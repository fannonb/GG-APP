import { Controller, Get, Inject, Param, ParseIntPipe, Query } from '@nestjs/common'
import { Public } from '../../common/decorators/public.decorator'
import { GetProvidersQueryDto } from './dto/get-providers-query.dto'
import { ProvidersService } from './providers.service'

@Public()
@Controller('providers')
export class ProvidersController {
  private readonly providersService: ProvidersService

  constructor(@Inject(ProvidersService) providersService: ProvidersService) {
    this.providersService = providersService
  }

  @Get()
  getAll(@Query() query: GetProvidersQueryDto) {
    return this.providersService.getAll(query.country)
  }

  @Get('category/:category')
  getByCategory(
    @Param('category') category: string,
    @Query() query: GetProvidersQueryDto,
  ) {
    return this.providersService.getByCategory(category, query.country)
  }

  @Get(':id/reviews')
  getReviews(@Param('id', ParseIntPipe) id: number) {
    return this.providersService.getReviews(id)
  }

  @Get(':id')
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.providersService.getById(id)
  }
}
