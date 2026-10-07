import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { InvoiceStatus, NotificationType, PayoutSource, Prisma, UserRole } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { normalizeCountry, type MetricsCountry } from './admin-metrics.service'

/**
 * Provider payouts.
 *
 * The finance partner's banking system pays providers and tells us through
 * `ingestPartnerPayout` (a signed webhook). Admins can also record a payout by
 * hand while the integration isn't live or to reconcile a one-off. Either way,
 * the covered invoices move from AUTHORIZED (patient approved) to PAID.
 */

export type PayoutTab = 'to_pay' | 'paid' | 'waiting' | 'disputed' | 'rejected'

const TAB_STATUS: Record<PayoutTab, InvoiceStatus> = {
  to_pay: InvoiceStatus.AUTHORIZED,
  paid: InvoiceStatus.PAID,
  waiting: InvoiceStatus.PENDING_AUTH,
  disputed: InvoiceStatus.DISPUTED,
  rejected: InvoiceStatus.REJECTED,
}
const HISTORY_TABS: PayoutTab[] = ['paid', 'rejected']

const CURRENCY: Record<MetricsCountry, string> = { KE: 'KES', ZW: 'ZWG', ZM: 'ZMW' }
const DAY = 86_400_000

const INVOICE_INCLUDE = {
  provider: { select: { id: true, name: true, country: true, authUserId: true, payoutAccounts: { where: { isDefault: true }, take: 1 } } },
  appointment: { select: { service: true } },
  prescriptionRequest: { select: { reference: true } },
  payout: true,
  lineItems: true,
  patient: { select: { id: true, patientProfile: { select: { financePartnerId: true, countryCode: true } } } },
} satisfies Prisma.InvoiceInclude

type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_INCLUDE }>

export interface PartnerPayoutPayload {
  reference: string
  paidAt?: string
  amount: number
  currency?: string
  /** Invoice references (e.g. INV-2026-0872) this payment covers. */
  invoices: string[]
}

@Injectable()
export class AdminPayoutsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ── helpers ───────────────────────────────────────────────────────────────

  private since(range?: string) {
    const days = { '7d': 7, '30d': 30, '90d': 91, '12m': 365 }[range ?? ''] as number | undefined
    return days ? new Date(Date.now() - days * DAY) : null
  }

  private dateFieldFor(tab: PayoutTab): 'paymentAuthorizedAt' | 'paidAt' | 'submittedAt' {
    return tab === 'to_pay' ? 'paymentAuthorizedAt' : tab === 'paid' ? 'paidAt' : 'submittedAt'
  }

  private async providerIdsFor(country?: string) {
    const code = country && country !== 'all' ? normalizeCountry(country) : null
    if (!code) return null
    const providers = await this.prisma.provider.findMany({ select: { id: true, country: true } })
    return providers.filter(p => normalizeCountry(p.country) === code).map(p => p.id)
  }

  private searchWhere(q?: string): Prisma.InvoiceWhereInput {
    const term = q?.trim()
    if (!term) return {}
    return {
      OR: [
        { reference: { contains: term, mode: 'insensitive' } },
        { billedToName: { contains: term, mode: 'insensitive' } },
        { serviceForName: { contains: term, mode: 'insensitive' } },
        { provider: { name: { contains: term, mode: 'insensitive' } } },
        { paymentRef: { contains: term, mode: 'insensitive' } },
      ],
    }
  }

  private mapRow(inv: InvoiceRow) {
    const code = normalizeCountry(inv.provider.country)
    const service = inv.appointment?.service
      ?? (inv.prescriptionRequest ? `Prescription ${inv.prescriptionRequest.reference}` : null)
      ?? inv.lineItems[0]?.name
      ?? null
    return {
      id: inv.id,
      reference: inv.reference,
      patientUserId: inv.patientUserId,
      patient: inv.billedToName,
      forFamily: inv.serviceForType === 'BENEFICIARY' ? { name: inv.serviceForName, relation: inv.serviceForRelation } : null,
      provider: { id: inv.provider.id, name: inv.provider.name, country: code },
      service,
      amount: Number(inv.amount),
      currency: code ? CURRENCY[code] : null,
      status: inv.status.toLowerCase(),
      submittedAt: inv.submittedAt.toISOString(),
      approvedAt: inv.paymentAuthorizedAt?.toISOString() ?? null,
      paidAt: inv.paidAt?.toISOString() ?? null,
      disputeReason: inv.disputeReason,
      rejectionReason: inv.rejectionReason,
      payout: inv.payout
        ? { id: inv.payout.id, reference: inv.payout.reference, source: inv.payout.source.toLowerCase(), partner: inv.payout.financePartnerId, mismatch: inv.payout.amountMismatch }
        : inv.paymentRef && inv.status === InvoiceStatus.PAID
          ? { id: null, reference: inv.paymentRef, source: 'legacy', partner: null, mismatch: false }
          : null,
    }
  }

  private async notifyAdmins(title: string, body: string) {
    const admins = await this.prisma.user.findMany({ where: { role: UserRole.ADMIN }, select: { id: true } })
    if (admins.length === 0) return
    await this.prisma.notification.createMany({
      data: admins.map(a => ({ userId: a.id, type: NotificationType.PAYMENT, title, body, screen: 'admin-payments' })),
    })
  }

  private async notifyProvider(providerUserId: string | null, amount: number, currency: string, reference: string, count: number) {
    if (!providerUserId) return
    await this.prisma.notification.create({
      data: {
        userId: providerUserId,
        type: NotificationType.PAYMENT,
        title: 'Payout sent',
        body: `${currency} ${amount.toLocaleString('en-US')} for ${count} invoice${count === 1 ? '' : 's'} (ref ${reference}).`,
        screen: '/sp/payments',
      },
    })
  }

  // ── desk queries ──────────────────────────────────────────────────────────

  async list(params: { tab?: string; country?: string; range?: string; q?: string; providerId?: string; page?: string; pageSize?: string }) {
    const tab = (Object.keys(TAB_STATUS).includes(params.tab ?? '') ? params.tab : 'to_pay') as PayoutTab
    const providerIds = await this.providerIdsFor(params.country)
    const since = this.since(params.range)
    const pageSize = Math.min(100, Math.max(5, Number(params.pageSize) || 25))
    const page = Math.max(0, Number(params.page) || 0)

    const base: Prisma.InvoiceWhereInput = {
      ...(providerIds ? { providerId: { in: providerIds } } : {}),
      ...(params.providerId ? { providerId: Number(params.providerId) || -1 } : {}),
      ...this.searchWhere(params.q),
    }
    // Open queues (to pay, waiting, disputed) show everything outstanding; history tabs follow the date range.
    const whereFor = (t: PayoutTab): Prisma.InvoiceWhereInput => ({
      ...base,
      status: TAB_STATUS[t],
      ...(since && HISTORY_TABS.includes(t) ? { [this.dateFieldFor(t)]: { gte: since } } : {}),
    })
    const where = whereFor(tab)
    const tabs = Object.keys(TAB_STATUS) as PayoutTab[]

    const [total, rows, ...tabCounts] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({ where, include: INVOICE_INCLUDE, orderBy: { [this.dateFieldFor(tab)]: 'desc' }, skip: page * pageSize, take: pageSize }),
      ...tabs.map(t => this.prisma.invoice.count({ where: whereFor(t) })),
    ])

    return {
      tab,
      page,
      pageSize,
      total,
      counts: Object.fromEntries(tabs.map((t, i) => [t, tabCounts[i]])) as Record<PayoutTab, number>,
      items: rows.map(r => this.mapRow(r)),
    }
  }

  /** Per-country money, each in its own currency. "Owed" is a balance, so it ignores the date range. */
  async summary(country?: string, range?: string) {
    const since = this.since(range)
    const providers = await this.prisma.provider.findMany({ select: { id: true, country: true } })
    const codeOf = new Map(providers.map(p => [p.id, normalizeCountry(p.country)]))
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { in: [InvoiceStatus.AUTHORIZED, InvoiceStatus.PAID] } },
      select: { providerId: true, amount: true, status: true, paymentAuthorizedAt: true, paidAt: true },
    })
    const wanted = country && country !== 'all' ? normalizeCountry(country) : null
    const codes: MetricsCountry[] = wanted ? [wanted] : ['KE', 'ZW', 'ZM']
    const inRange = (d: Date | null) => !!d && (!since || d >= since)
    return codes.map(code => {
      const mine = invoices.filter(i => codeOf.get(i.providerId) === code)
      const sum = (list: typeof mine) => list.reduce((s, i) => s + Number(i.amount), 0)
      return {
        country: code,
        currency: CURRENCY[code],
        approved: sum(mine.filter(i => inRange(i.paymentAuthorizedAt))),
        paidOut: sum(mine.filter(i => i.status === InvoiceStatus.PAID && inRange(i.paidAt))),
        owed: sum(mine.filter(i => i.status === InvoiceStatus.AUTHORIZED)),
        owedCount: mine.filter(i => i.status === InvoiceStatus.AUTHORIZED).length,
      }
    })
  }

  /** What each provider is owed right now, with their payout account. */
  async owedByProvider(country?: string) {
    const providerIds = await this.providerIdsFor(country)
    const rows = await this.prisma.invoice.findMany({
      where: { status: InvoiceStatus.AUTHORIZED, ...(providerIds ? { providerId: { in: providerIds } } : {}) },
      include: INVOICE_INCLUDE,
      orderBy: { paymentAuthorizedAt: 'asc' },
    })
    const groups = new Map<number, { rows: InvoiceRow[] }>()
    for (const r of rows) {
      const g = groups.get(r.providerId) ?? { rows: [] }
      g.rows.push(r)
      groups.set(r.providerId, g)
    }
    return [...groups.values()].map(({ rows: list }) => {
      const p = list[0].provider
      const code = normalizeCountry(p.country)
      const account = p.payoutAccounts[0]
      return {
        provider: { id: p.id, name: p.name, country: code },
        currency: code ? CURRENCY[code] : null,
        owed: list.reduce((s, r) => s + Number(r.amount), 0),
        invoiceIds: list.map(r => r.id),
        invoiceCount: list.length,
        oldestApprovedAt: list[0].paymentAuthorizedAt?.toISOString() ?? null,
        payoutAccount: account ? { method: account.method, accountName: account.accountName, accountNumber: account.accountNumber } : null,
      }
    }).sort((a, b) => b.owed - a.owed)
  }

  async detail(invoiceId: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, include: INVOICE_INCLUDE })
    if (!inv) throw new NotFoundException('Invoice not found')
    const account = inv.provider.payoutAccounts[0]
    const timeline = [
      { label: 'Invoice sent by provider', at: inv.submittedAt.toISOString() },
      inv.paymentAuthorizedAt && { label: 'Approved by patient', at: inv.paymentAuthorizedAt.toISOString() },
      inv.disputedAt && { label: 'Disputed by patient', at: inv.disputedAt.toISOString(), note: inv.disputeReason },
      inv.disputeResolvedAt && { label: 'Dispute resolved', at: inv.disputeResolvedAt.toISOString() },
      inv.status === InvoiceStatus.REJECTED && { label: 'Rejected', at: inv.updatedAt.toISOString(), note: inv.rejectionReason },
      inv.paidAt && { label: inv.payout?.source === PayoutSource.PARTNER ? 'Paid out by finance partner' : 'Payout recorded', at: inv.paidAt.toISOString(), note: inv.payout?.reference ?? inv.paymentRef },
    ].filter(Boolean)
    return {
      ...this.mapRow(inv),
      lineItems: inv.lineItems.map(li => ({ name: li.name, amount: Number(li.amount) })),
      timeline,
      payoutAccount: account ? { method: account.method, accountName: account.accountName, accountNumber: account.accountNumber } : null,
    }
  }

  // ── recording payouts ─────────────────────────────────────────────────────

  private async applyPayout(args: {
    invoices: InvoiceRow[]
    source: PayoutSource
    financePartnerId: string
    reference: string
    paidAt: Date
    amount: number
    currency: string
    mismatch: boolean
    note?: string | null
    recordedByUserId?: string | null
    rawPayload?: Prisma.InputJsonValue
  }) {
    const providerId = args.invoices[0].providerId
    const payout = await this.prisma.$transaction(async tx => {
      const created = await tx.payout.create({
        data: {
          providerId,
          financePartnerId: args.financePartnerId,
          reference: args.reference,
          amount: new Prisma.Decimal(args.amount),
          currency: args.currency,
          paidAt: args.paidAt,
          source: args.source,
          amountMismatch: args.mismatch,
          note: args.note ?? null,
          recordedByUserId: args.recordedByUserId ?? null,
          rawPayload: args.rawPayload,
        },
      })
      await tx.invoice.updateMany({
        where: { id: { in: args.invoices.map(i => i.id) }, status: InvoiceStatus.AUTHORIZED },
        data: { status: InvoiceStatus.PAID, paidAt: args.paidAt, paymentRef: args.reference, payoutId: created.id },
      })
      await tx.auditLog.create({
        data: {
          actorUserId: args.recordedByUserId ?? null,
          action: args.source === PayoutSource.PARTNER ? 'partner.payout.received' : 'admin.payout.recorded',
          entityType: 'Provider',
          entityId: String(providerId),
          metadata: { payoutId: created.id, reference: args.reference, amount: args.amount, currency: args.currency, invoices: args.invoices.map(i => i.reference), mismatch: args.mismatch } as Prisma.JsonObject,
        },
      })
      return created
    })
    await this.notifyProvider(args.invoices[0].provider.authUserId, args.amount, args.currency, args.reference, args.invoices.length)
    return payout
  }

  /** Admin records a payout made outside the app (fallback while the partner integration isn't live). */
  async recordManual(actorUserId: string, dto: { invoiceIds: string[]; reference: string; paidAt?: string; note?: string }) {
    const reference = dto.reference.trim()
    if (reference.length < 3) throw new BadRequestException('Enter the payment reference from the bank or M-Pesa.')
    const invoices = await this.prisma.invoice.findMany({ where: { id: { in: dto.invoiceIds } }, include: INVOICE_INCLUDE })
    if (invoices.length === 0 || invoices.length !== new Set(dto.invoiceIds).size) throw new NotFoundException('Some invoices weren’t found.')
    const notReady = invoices.filter(i => i.status !== InvoiceStatus.AUTHORIZED)
    if (notReady.length) throw new BadRequestException(`Only approved, unpaid invoices can be paid out (${notReady.map(i => i.reference).join(', ')}).`)
    if (new Set(invoices.map(i => i.providerId)).size > 1) throw new BadRequestException('A payout goes to one provider. Select invoices for a single provider.')

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date()
    if (isNaN(paidAt.getTime()) || paidAt.getTime() > Date.now() + 60_000) throw new BadRequestException('Enter a valid payment date (not in the future).')
    const code = normalizeCountry(invoices[0].provider.country)
    const partner = invoices[0].patient.patientProfile?.financePartnerId ?? 'manual'
    const exists = await this.prisma.payout.findUnique({ where: { financePartnerId_reference: { financePartnerId: partner, reference } } })
    if (exists) throw new ConflictException('A payout with this reference is already recorded.')

    const amount = invoices.reduce((s, i) => s + Number(i.amount), 0)
    const payout = await this.applyPayout({
      invoices,
      source: PayoutSource.MANUAL,
      financePartnerId: partner,
      reference,
      paidAt,
      amount,
      currency: code ? CURRENCY[code] : 'USD',
      mismatch: false,
      note: dto.note?.trim() || null,
      recordedByUserId: actorUserId,
    })
    return { payoutId: payout.id, invoices: invoices.length, amount, currency: payout.currency }
  }

  // ── finance partner webhook ──────────────────────────────────────────────

  /** HMAC-SHA256 of the raw body with the partner's shared secret, sent as `x-gg-signature: sha256=<hex>`. */
  verifySignature(partnerId: string, rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = process.env[`FINANCE_PARTNER_WEBHOOK_SECRET_${partnerId.toUpperCase()}`]
    if (!secret) throw new ServiceUnavailableException(`Payout integration for ${partnerId} isn’t configured.`)
    if (!rawBody || !signature) throw new UnauthorizedException('Missing signature.')
    const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'))
    const given = Buffer.from(signature.replace(/^sha256=/, ''))
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new UnauthorizedException('Invalid signature.')
  }

  async ingestPartnerPayout(partnerId: string, payload: PartnerPayoutPayload) {
    const partner = partnerId.toLowerCase()
    const reference = String(payload.reference ?? '').trim()
    if (!reference) throw new BadRequestException('reference is required')
    if (!Array.isArray(payload.invoices) || payload.invoices.length === 0) throw new BadRequestException('invoices is required')
    const amount = Number(payload.amount)
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('amount must be positive')

    // Partners retry; the same reference is only applied once.
    const existing = await this.prisma.payout.findUnique({ where: { financePartnerId_reference: { financePartnerId: partner, reference } } })
    if (existing) return { status: 'duplicate', payoutId: existing.id }

    const invoices = await this.prisma.invoice.findMany({ where: { reference: { in: payload.invoices } }, include: INVOICE_INCLUDE })
    const unknown = payload.invoices.filter(ref => !invoices.some(i => i.reference === ref))
    const payable = invoices.filter(i => i.status === InvoiceStatus.AUTHORIZED)
    const skipped = invoices.filter(i => i.status !== InvoiceStatus.AUTHORIZED).map(i => `${i.reference} (${i.status.toLowerCase()})`)

    if (payable.length === 0) {
      await this.notifyAdmins('Payout needs checking', `${partner} reported payment ${reference}, but none of its invoices are waiting for payout.${unknown.length ? ` Unknown: ${unknown.join(', ')}.` : ''}`)
      throw new ConflictException('None of these invoices are waiting for payout.')
    }
    if (new Set(payable.map(i => i.providerId)).size > 1) throw new BadRequestException('A payout must cover invoices for one provider.')

    const expected = payable.reduce((s, i) => s + Number(i.amount), 0)
    const mismatch = Math.abs(expected - amount) > 0.01 || unknown.length > 0 || skipped.length > 0
    const code = normalizeCountry(payable[0].provider.country)
    const payout = await this.applyPayout({
      invoices: payable,
      source: PayoutSource.PARTNER,
      financePartnerId: partner,
      reference,
      paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
      amount,
      currency: payload.currency || (code ? CURRENCY[code] : 'USD'),
      mismatch,
      rawPayload: payload as unknown as Prisma.InputJsonValue,
    })
    if (mismatch) {
      await this.notifyAdmins(
        'Payout needs checking',
        `${partner} paid ${amount} for ${reference}; invoices total ${expected}.${unknown.length ? ` Unknown invoices: ${unknown.join(', ')}.` : ''}${skipped.length ? ` Not payable: ${skipped.join(', ')}.` : ''}`,
      )
    }
    return { status: mismatch ? 'applied_with_mismatch' : 'applied', payoutId: payout.id, invoicesPaid: payable.length }
  }
}
