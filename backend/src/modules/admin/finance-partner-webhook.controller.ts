import { Body, Controller, HttpCode, Inject, Param, Post, Req, type RawBodyRequest } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { AdminPayoutsService, type PartnerPayoutPayload } from './admin-payouts.service'

/**
 * Called by a finance partner's banking system each time it pays a provider.
 *
 *   POST /api/v1/integrations/finance-partners/:partner/payouts
 *   Header  x-gg-signature: sha256=<hex HMAC-SHA256 of the raw body>
 *   Body    { reference, amount, currency?, paidAt?, invoices: ["INV-2026-0872", …] }
 *
 * The secret is FINANCE_PARTNER_WEBHOOK_SECRET_<PARTNER> (e.g. _EQUITY, _MONEYMART).
 * Retries with the same reference are acknowledged without paying twice.
 */
@Controller('integrations/finance-partners')
export class FinancePartnerWebhookController {
  constructor(@Inject(AdminPayoutsService) private readonly payouts: AdminPayoutsService) {}

  @Post(':partner/payouts')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  receivePayout(@Param('partner') partner: string, @Req() req: RawBodyRequest<Request>, @Body() body: PartnerPayoutPayload) {
    this.payouts.verifySignature(partner, req.rawBody, req.header('x-gg-signature'))
    return this.payouts.ingestPartnerPayout(partner, body)
  }
}
