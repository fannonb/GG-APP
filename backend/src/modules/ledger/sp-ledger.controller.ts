import { Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { LedgerService } from './ledger.service'
import { UnlockLedgerDto } from './dto/unlock-ledger.dto'
import { GetLedgerQueryDto } from './dto/ledger-query.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SP)
@Controller('sp/ledger')
export class SpLedgerController {
  private readonly ledgerService: LedgerService

  constructor(@Inject(LedgerService) ledgerService: LedgerService) {
    this.ledgerService = ledgerService
  }

  @Post('unlock')
  unlock(@CurrentUser() user: AuthenticatedUser, @Body() dto: UnlockLedgerDto) {
    return this.ledgerService.unlock(user.sub, dto)
  }

  @Get(':patientId')
  getLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Query() query: GetLedgerQueryDto,
  ) {
    return this.ledgerService.getLedger(user.sub, patientId, query.beneficiaryId)
  }
}
