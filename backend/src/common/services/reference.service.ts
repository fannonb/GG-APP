import { Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

export type ReferenceType = 'APT' | 'INV' | 'AUTH' | 'TXN' | 'REV' | 'PAY' | 'GGA' | 'RX'

const REF_CONFIG: Record<ReferenceType, { pad: number }> = {
  APT: { pad: 4 },
  INV: { pad: 4 },
  AUTH: { pad: 4 },
  TXN: { pad: 4 },
  REV: { pad: 4 },
  PAY: { pad: 4 },
  GGA: { pad: 4 },
  RX: { pad: 4 },
}

@Injectable()
export class ReferenceService {
  private readonly prisma: PrismaService

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    this.prisma = prisma
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
   * When a provider supplies their own INV-YYYY-NNNN reference, advance the
   * sequence so future previews stay above that number.
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

    let record = await client.referenceSequence.findUnique({
      where: { type_year: { type, year } },
    })

    if (!record) {
      const seeded = await this.findMaxSequence(client, type, year)
      record = await client.referenceSequence.create({
        data: { type, year, lastValue: seeded },
      })
    }

    const updated = await client.referenceSequence.update({
      where: { type_year: { type, year } },
      data: { lastValue: { increment: 1 } },
    })

    return this.format(type, year, updated.lastValue)
  }

  private async findMaxSequence(
    client: Prisma.TransactionClient | PrismaService,
    type: ReferenceType,
    year: number,
  ) {
    const prefix = `${type}-${year}-`

    const parseMax = (values: Array<string | null | undefined>) =>
      values.reduce((max, value) => {
        if (!value || !value.startsWith(prefix)) return max
        const sequence = Number.parseInt(value.slice(prefix.length), 10)
        return Number.isFinite(sequence) ? Math.max(max, sequence) : max
      }, 0)

    switch (type) {
      case 'APT': {
        const rows = await client.appointment.findMany({
          where: { reference: { startsWith: prefix } },
          select: { reference: true },
        })
        return parseMax(rows.map(row => row.reference))
      }
      case 'INV': {
        const rows = await client.invoice.findMany({
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
