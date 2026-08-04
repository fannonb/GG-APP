import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type'
import { LedgerService } from './ledger.service'
import { SetupLedgerPinDto } from './dto/setup-ledger-pin.dto'
import { GetLedgerQueryDto } from './dto/ledger-query.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PATIENT)
@Controller('patient/ledger')
export class PatientLedgerController {
  private readonly ledgerService: LedgerService

  constructor(@Inject(LedgerService) ledgerService: LedgerService) {
    this.ledgerService = ledgerService
  }

  @Post('pin')
  setupPin(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetupLedgerPinDto) {
    return this.ledgerService.setupPin(user.sub, dto)
  }

  @Delete('pin')
  revokePin(@CurrentUser() user: AuthenticatedUser) {
    return this.ledgerService.revokePin(user.sub)
  }

  @Get('status')
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.ledgerService.getStatus(user.sub)
  }

  @Get()
  getOwnLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLedgerQueryDto,
  ) {
    return this.ledgerService.getOwnLedger(user.sub, query.beneficiaryId)
  }

  @Get('access')
  getAccessLog(@CurrentUser() user: AuthenticatedUser) {
    return this.ledgerService.getAccessLog(user.sub)
  }

  @Patch('grants/:id/revoke')
  revokeGrant(@CurrentUser() user: AuthenticatedUser, @Param('id') grantId: string) {
    return this.ledgerService.revokeGrant(user.sub, grantId)
  }
}
