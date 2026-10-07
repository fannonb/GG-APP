import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { AdminMetricsService } from './admin-metrics.service'
import { AdminAccountsService } from './admin-accounts.service'
import { AdminPayoutsService } from './admin-payouts.service'
import { FinancePartnerWebhookController } from './finance-partner-webhook.controller'
import { AuthModule } from '../auth/auth.module'
import { LedgerModule } from '../ledger/ledger.module'

@Module({
  imports: [LedgerModule, AuthModule],
  controllers: [AdminController, FinancePartnerWebhookController],
  providers: [AdminService, AdminMetricsService, AdminAccountsService, AdminPayoutsService],
})
export class AdminModule {}
