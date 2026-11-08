import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { InvoiceCodeService } from './invoice-code.service'

// Invoices are numbered per provider (see previewInvoice), so they are not in this list.
export type ReferenceType = 'APT' | 'AUTH' | 'TXN' | 'REV' | 'PAY' | 'GGA' | 'RX'

const REF_CONFIG: Record<ReferenceType, { pad: number }> = {
  APT: { pad: 4 },
  AUTH: { pad: 4 },
  TXN: { pad: 4 },
  REV: { pad: 4 },
  PAY: { pad: 4 },
  GGA: { pad: 4 },
  RX: { pad: 4 },
}

/** Highest NNNN among the values that start with `prefix` (values shaped PREFIX-NNNN). */
function highestSequence(prefix: string, values: Array<string | null | undefined>) {
  return values.reduce<number>((max, value) => {
    if (!value || !value.startsWith(prefix)) return max
    const sequence = Number.parseInt(value.slice(prefix.length), 10)
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max
  }, 0)
}

/** ReferenceSequence.type for one provider's invoices. The column is free text. */
function invoiceSequenceType(code: string) {
  return `INV-${code}`
}

function formatInvoiceReference(code: string, year: number, sequence: number) {
  return `INV-${code}-${year}-${String(sequence).padStart(4, '0')}`
}

@Injectable()
export class ReferenceService {
  private readonly prisma: PrismaService
  private readonly invoiceCodes: InvoiceCodeService

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(InvoiceCodeService) invoiceCodes: InvoiceCodeService,
  ) {
    this.prisma = prisma
    this.invoiceCodes = invoiceCodes
  }

  format(type: ReferenceType, year: number, sequence: number) {
    const padded = String(sequence).padStart(REF_CONFIG[type].pad, '0')
    return `${type}-${year}-${padded}`
  }

  async preview(type: ReferenceType) {
    const year = new Date().getFullYear()
    const client = this.prisma
    const record = await client.referenceSequence.findUnique({
      where: { type_year: { type, year } },
    })
    const current = record?.lastValue ?? (await this.findMaxSequence(client, type, year))
    return this.format(type, year, current + 1)
  }

  /**
   * When a reference of this type is supplied by the caller, advance the sequence so future
   * previews stay above that number. Invoices use syncInvoiceReference instead.
   */
  async syncFromReference(
    type: ReferenceType,
    reference: string,
    tx?: Prisma.TransactionClient,
  ) {
    const year = new Date().getFullYear()
    const prefix = `${type}-${year}-`
    if (!reference.startsWith(prefix)) return

    const sequence = Number.parseInt(reference.slice(prefix.length), 10)
    if (!Number.isFinite(sequence) || sequence < 1) return

    const client = tx ?? this.prisma
    const existing = await client.referenceSequence.findUnique({
      where: { type_year: { type, year } },
    })

    if (!existing) {
      const seeded = await this.findMaxSequence(client, type, year)
      await client.referenceSequence.create({
        data: { type, year, lastValue: Math.max(seeded, sequence) },
      })
      return
    }

    if (existing.lastValue < sequence) {
      await client.referenceSequence.update({
        where: { type_year: { type, year } },
        data: { lastValue: sequence },
      })
    }
  }

  async next(type: ReferenceType, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    const year = new Date().getFullYear()

    const record = await client.referenceSequence.findUnique({
      where: { type_year: { type, year } },
    })

    if (!record) {
      const seeded = await this.findMaxSequence(client, type, year)
      await client.referenceSequence.create({
        data: { type, year, lastValue: seeded },
      })
    }

    const updated = await client.referenceSequence.update({
      where: { type_year: { type, year } },
      data: { lastValue: { increment: 1 } },
    })

    return this.format(type, year, updated.lastValue)
  }

  // ── Invoice numbers: INV-<CODE>-<YYYY>-<NNNN>, one counter per provider per year ──

  /** The number the provider's next invoice will get. Nothing is consumed. */
  async previewInvoice(providerId: number) {
    const code = await this.invoiceCodes.ensureForProvider(providerId)
    const year = new Date().getFullYear()
    const type = invoiceSequenceType(code)
    const record = await this.prisma.referenceSequence.findUnique({
      where: { type_year: { type, year } },
    })
    const current = record?.lastValue ?? (await this.findMaxInvoiceSequence(this.prisma, code, year))
    return formatInvoiceReference(code, year, current + 1)
  }

  /** Issues the provider's next invoice number. Call inside the transaction that creates the invoice. */
  async nextInvoice(providerId: number, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    const code = await this.invoiceCodes.ensureForProvider(providerId, tx)
    const year = new Date().getFullYear()
    const type = invoiceSequenceType(code)

    const record = await client.referenceSequence.findUnique({
      where: { type_year: { type, year } },
    })
    if (!record) {
      const seeded = await this.findMaxInvoiceSequence(client, code, year)
      await client.referenceSequence.create({
        data: { type, year, lastValue: seeded },
      })
    }

    const updated = await client.referenceSequence.update({
      where: { type_year: { type, year } },
      data: { lastValue: { increment: 1 } },
    })
    return formatInvoiceReference(code, year, updated.lastValue)
  }

  /**
   * When a provider types its own number in its INV-<CODE>-YYYY-NNNN format, advance that
   * provider's counter so its next number stays above it. Numbers in any other format are ignored.
   */
  async syncInvoiceReference(providerId: number, reference: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma
    const provider = await client.provider.findUnique({
      where: { id: providerId },
      select: { invoiceCode: true },
    })
    if (!provider?.invoiceCode) return

    const code = provider.invoiceCode
    const year = new Date().getFullYear()
    const prefix = `INV-${code}-${year}-`
    if (!reference.startsWith(prefix)) return

    const sequence = Number.parseInt(reference.slice(prefix.length), 10)
    if (!Number.isFinite(sequence) || sequence < 1) return

    const type = invoiceSequenceType(code)
    const existing = await client.referenceSequence.findUnique({
      where: { type_year: { type, year } },
    })

    if (!existing) {
      const seeded = await this.findMaxInvoiceSequence(client, code, year)
      await client.referenceSequence.create({
        data: { type, year, lastValue: Math.max(seeded, sequence) },
      })
      return
    }

    if (existing.lastValue < sequence) {
      await client.referenceSequence.update({
        where: { type_year: { type, year } },
        data: { lastValue: sequence },
      })
    }
  }

  private async findMaxInvoiceSequence(
    client: Prisma.TransactionClient | PrismaService,
    code: string,
    year: number,
  ) {
    const prefix = `INV-${code}-${year}-`
    const rows = await client.invoice.findMany({
      where: { reference: { startsWith: prefix } },
      select: { reference: true },
    })
    return highestSequence(prefix, rows.map(row => row.reference))
  }

  private async findMaxSequence(
    client: Prisma.TransactionClient | PrismaService,
    type: ReferenceType,
    year: number,
  ) {
    const prefix = `${type}-${year}-`
    const parseMax = (values: Array<string | null | undefined>) => highestSequence(prefix, values)

    switch (type) {
      case 'APT': {
        const rows = await client.appointment.findMany({
          where: { reference: { startsWith: prefix } },
          select: { reference: true },
        })
        return parseMax(rows.map(row => row.reference))
      }
      case 'AUTH':
      case 'PAY': {
        const rows = await client.invoice.findMany({
          where: { paymentRef: { startsWith: prefix } },
          select: { paymentRef: true },
        })
        return parseMax(rows.map(row => row.paymentRef))
      }
      case 'REV': {
        const rows = await client.providerReview.findMany({
          where: { reference: { startsWith: prefix } },
          select: { reference: true },
        })
        return parseMax(rows.map(row => row.reference))
      }
      case 'TXN': {
        const rows = await client.transaction.findMany({
          where: { reference: { startsWith: prefix } },
          select: { reference: true },
        })
        return parseMax(rows.map(row => row.reference))
      }
      case 'GGA': {
        const rows = await client.creditApplication.findMany({
          where: { reference: { startsWith: prefix } },
          select: { reference: true },
        })
        return parseMax(rows.map(row => row.reference))
      }
      case 'RX': {
        const rows = await client.prescriptionRequest.findMany({
          where: { reference: { startsWith: prefix } },
          select: { reference: true },
        })
        return parseMax(rows.map(row => row.reference))
      }
      default:
        return 0
    }
  }
}
