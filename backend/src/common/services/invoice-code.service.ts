import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

/** Codes that would read as another kind of reference (INV-, APT-, RX-...). Never issued. */
export const RESERVED_INVOICE_CODES: ReadonlySet<string> = new Set([
  'INV', 'APT', 'AUTH', 'TXN', 'REV', 'PAY', 'GGA', 'RX', 'GG',
])

const CODE_PATTERN = /^[A-Z0-9]{2,6}$/
const FORMAT_MESSAGE = 'Use 2 to 6 letters or digits'
const RESERVED_MESSAGE = 'That code is reserved'
const FALLBACK_CODE = 'PRV'
const MAX_ATTEMPTS = 999

/** Words that say nothing about the practice. "&" needs no entry because it is a separator. */
const FILLER_WORDS = new Set([
  'THE', 'AND', 'OF', 'LTD', 'LIMITED', 'CO', 'COMPANY', 'INC', 'LLC', 'PLC', 'DR', 'MR', 'MRS', 'MS', 'PROF',
])

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])

/** Adds a counter to a base code, keeping the result within 6 characters: MPH2, MPH10, MP100. */
function withCounter(base: string, n: number) {
  return `${base.slice(0, 6 - String(n).length)}${n}`
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

/**
 * Owns each provider's invoice code, the short code in its system invoice numbers:
 * INV-<CODE>-<YYYY>-<NNNN>, e.g. INV-PHP-2026-0007.
 */
@Injectable()
export class InvoiceCodeService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InvoiceCodeService.name)

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Returns null when the code can be used, otherwise the reason it cannot. */
  validate(code: string): string | null {
    if (!CODE_PATTERN.test(code)) return FORMAT_MESSAGE
    if (RESERVED_INVOICE_CODES.has(code)) return RESERVED_MESSAGE
    return null
  }

  /**
   * Suggests a 3-character code from a practice name. Rule:
   *   1. Strip accents, uppercase, and split on anything that is not A-Z or 0-9.
   *   2. Drop filler words (FILLER_WORDS). If that leaves nothing, keep every word.
   *   3. Take the first character of the first three words.
   *   4. If that is fewer than three characters, fill from the last word (skipping its first
   *      character), then the word before it, taking consonants before vowels within each word.
   *      Pad with X only if the name has too few characters to fill from.
   *   5. A reserved result has its last character replaced with 2 (INV becomes IN2).
   * Examples: "Miangeni Pharmacy" -> MPH, "Metro Surgical Hospital" -> MSH,
   * "The Nairobi Hospital" -> NHS, "Dr. Jane Wanjiru Clinic" -> JWC, "Lab 24" -> L24.
   */
  suggest(name: string): string {
    const words = name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean)
    const significant = words.filter(word => !FILLER_WORDS.has(word))
    const used = significant.length > 0 ? significant : words
    if (used.length === 0) return FALLBACK_CODE

    let code = used.slice(0, 3).map(word => word[0]).join('')
    for (let i = used.length - 1; i >= 0 && code.length < 3; i--) {
      const rest = [...used[i].slice(1)]
      const ordered = [...rest.filter(ch => !VOWELS.has(ch)), ...rest.filter(ch => VOWELS.has(ch))]
      for (const ch of ordered) {
        if (code.length >= 3) break
        code += ch
      }
    }
    while (code.length < 3) code += 'X'

    if (RESERVED_INVOICE_CODES.has(code)) code = `${code.slice(0, 2)}2`
    return code
  }

  /**
   * Returns the provider's invoice code, assigning one from the provider's name if it has none.
   * Pass `tx` when calling inside a transaction so the code is written in that transaction.
   */
  async ensureForProvider(providerId: number, tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx ?? this.prisma
    const provider = await client.provider.findUnique({
      where: { id: providerId },
      select: { name: true, invoiceCode: true },
    })
    if (!provider) throw new NotFoundException('Provider not found')
    if (provider.invoiceCode) return provider.invoiceCode

    const base = this.suggest(provider.name)
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const candidate = attempt === 1 ? base : withCounter(base, attempt)
      const taken = await client.provider.findFirst({ where: { invoiceCode: candidate }, select: { id: true } })
      if (taken) continue

      try {
        const claimed = await client.provider.updateMany({
          where: { id: providerId, invoiceCode: null },
          data: { invoiceCode: candidate },
        })
        if (claimed.count === 1) return candidate

        // A concurrent request gave this provider a code first; keep that one.
        const current = await client.provider.findUnique({
          where: { id: providerId },
          select: { invoiceCode: true },
        })
        if (current?.invoiceCode) return current.invoiceCode
        throw new NotFoundException('Provider not found')
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
        // Another provider took this code after the check. Inside a transaction Postgres has already
        // aborted the transaction, so the only safe option is to fail and let the caller retry.
        if (tx) throw new ConflictException('Could not assign an invoice code. Try again.')
        // Outside a transaction, the next candidate is tried.
      }
    }
    throw new ConflictException('Could not find a free invoice code for this provider')
  }

  /** Gives every existing provider without a code one. Never blocks or fails startup. */
  async onApplicationBootstrap() {
    try {
      const missing = await this.prisma.provider.findMany({
        where: { invoiceCode: null },
        select: { id: true },
        orderBy: { id: 'asc' },
      })
      if (missing.length === 0) return

      let assigned = 0
      for (const { id } of missing) {
        try {
          await this.ensureForProvider(id)
          assigned += 1
        } catch (error) {
          this.logger.warn(
            `Could not assign an invoice code to provider ${id}: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
      this.logger.log(`Assigned invoice codes to ${assigned} of ${missing.length} providers that had none`)
    } catch (error) {
      this.logger.error(
        `Invoice code backfill skipped: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
