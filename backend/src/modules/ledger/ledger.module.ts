import { Module } from '@nestjs/common'
import { LedgerService } from './ledger.service'
import { PatientLedgerController } from './patient-ledger.controller'
import { SpLedgerController } from './sp-ledger.controller'

@Module({
  controllers: [PatientLedgerController, SpLedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
