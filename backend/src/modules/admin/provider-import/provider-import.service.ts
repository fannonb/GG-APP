import { allowedCredentialKinds, toCredentialCountry } from '../../../common/constants/credentials'
import { BadRequestException, HttpException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { Prisma, ProviderApplicationStatus, ProviderImportLeadStatus, UserRole, UserStatus } from '@prisma/client'
import { plainToInstance } from 'class-transformer'
import { validate, type ValidationError } from 'class-validator'
import { randomBytes, randomUUID } from 'node:crypto'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../../prisma/prisma.service'
import { RegisterSpDto } from '../../auth/dto/register-sp.dto'
import { StorageService } from '../../../common/services/storage.service'
import { coordinatePair, resolveMapsCoordinates } from '../../../common/utils/provider-location'
import type { ImportProviderLeadDto } from '../dto/provider-import.dto'
import { parseCsvTable, templateRecords, type SheetTable } from './csv'
import { readXlsxTable } from './xlsx'
import { isOutscraperHeaders, mapOutscraperRecord } from './outscraper'

export type ProviderImportFormat = 'template' | 'outscraper'
export type ImportOutcome = 'import' | 'needs_email' | 'skip' | 'error'

export interface ProviderImportInput {
  csv?: string
  fileBase64?: string
  fileName?: string
  commit?: boolean
}

export interface ProviderImportRow {
  record: number
  practiceName: string
  email: string
  serviceTypes: string[]
  city?: string
  lat?: number
  lng?: number
  outcome: ImportOutcome
  errors: string[]
  warnings: string[]
  skipReason?: string
}

export interface ProviderImportResult {
  format: ProviderImportFormat
  valid: boolean
  imported: number
  leadsCreated: number
  summary: { toImport: number; needsEmail: number; skipped: number; errors: number }
  rows: ProviderImportRow[]
}

/** Import-only fields that RegisterSpDto has no place for. Stored on the application or lead. */
interface ImportExtras {
  road?: string
  website?: string
  googlePlaceId?: string
  googleMapsUrl?: string
}

/** Registration as plain data, without email, secondary email or password. This is a lead's payload. */
type RegistrationFields = Record<string, unknown>

interface Draft {
  row: ProviderImportRow
  extras: ImportExtras
  registration?: RegistrationFields
  /** Validated registration. For 'import' rows it carries the real email; for lead rows a placeholder. */
  dto?: RegisterSpDto
  phone?: string
}

const TEMPLATE_SERVICES = ['Hospital', 'Clinic', 'Doctor', 'Pharmacy', 'Laboratory', 'Radiology']
const OUTSCRAPER_ROW_LIMIT = 1000
/** Stands in for the email while a lead is validated. It is never stored. */
const PLACEHOLDER_EMAIL = 'lead-placeholder@example.com'
/** One import writes two or three rows per provider in a single transaction, so it needs more than the default 5 seconds. */
const TRANSACTION_TIMEOUT_MS = 120_000
const LEAD_LIST_LIMIT = 500
const EXTRA_PAYLOAD_KEYS = ['road', 'website', 'googlePlaceId', 'googleMapsUrl']

/**
 * A login left behind when a provider was deleted before the deletion also removed the account: an SP user with no
 * provider record and at least one approved application. It blocks nothing, and an import replaces it. A new import
 * (SUSPENDED user, PENDING application) is not a leftover and still blocks.
 */
const DELETED_PROVIDER_LEFTOVER = {
  role: UserRole.SP,
  providerRecord: { is: null },
  providerApplications: { some: { status: ProviderApplicationStatus.APPROVED } },
} satisfies Prisma.UserWhereInput

/** Existing accounts by email. `leftover` marks a DELETED_PROVIDER_LEFTOVER account. */
type ExistingAccounts = Map<string, { leftover: boolean }>

const REPLACES_LEFTOVER_WARNING = "Replaces a deleted provider's old account"

function badRequest<T>(parse: () => T): T {
  try {
    return parse()
  } catch (e) {
    throw new BadRequestException((e as Error).message)
  }
}

function flatten(items: ValidationError[]): string[] {
  return items.flatMap(v => [...Object.values(v.constraints ?? {}), ...flatten(v.children ?? [])])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function withoutKeys(value: Record<string, unknown>, keys: string[]): RegistrationFields {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)))
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/** Sets each row's outcome. For Outscraper, phone numbers shared by several rows get a warning. */
function finishRows(drafts: Draft[], outscraper: boolean): void {
  for (const { row } of drafts) {
    row.outcome = row.skipReason ? 'skip' : row.errors.length ? 'error' : row.email ? 'import' : 'needs_email'
  }
  if (!outscraper) return
  const byPhone = new Map<string, Draft[]>()
  for (const draft of drafts) {
    if (draft.row.outcome === 'skip' || !draft.phone) continue
    byPhone.set(draft.phone, [...(byPhone.get(draft.phone) ?? []), draft])
  }
  for (const group of byPhone.values()) {
    if (group.length < 2) continue
    for (const draft of group) draft.row.warnings.push(`Phone shared with ${group.length - 1} other rows`)
  }
}

@Injectable()
export class ProviderImportService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  /** Preview unless `commit` is set. Nothing is written unless every row is valid. */
  async run(actorUserId: string, input: ProviderImportInput): Promise<ProviderImportResult> {
    const table = await this.readTable(input)
    const format: ProviderImportFormat = isOutscraperHeaders(table.headers) ? 'outscraper' : 'template'
    const drafts = format === 'outscraper' ? await this.prepareOutscraper(table) : await this.prepareTemplate(table)
    const rows = drafts.map(d => d.row)
    const summary = {
      toImport: rows.filter(r => r.outcome === 'import').length,
      needsEmail: rows.filter(r => r.outcome === 'needs_email').length,
      skipped: rows.filter(r => r.outcome === 'skip').length,
      errors: rows.filter(r => r.outcome === 'error').length,
    }
    const valid = summary.errors === 0
    if (!input.commit || !valid) return { format, valid, imported: 0, leadsCreated: 0, summary, rows }
    const { imported, leadsCreated } = await this.save(actorUserId, drafts, format, input.fileName)
    return { format, valid, imported, leadsCreated, summary, rows }
  }

  private async readTable(input: ProviderImportInput): Promise<SheetTable> {
    const csv = input.csv
    const fileBase64 = input.fileBase64
    if (!!csv === !!fileBase64) throw new BadRequestException('Send exactly one of csv or fileBase64')
    if (csv) return badRequest(() => parseCsvTable(csv))
    return readXlsxTable(Buffer.from(fileBase64!, 'base64'))
  }

  private async prepareTemplate(table: SheetTable): Promise<Draft[]> {
    const records = badRequest(() => templateRecords(table))
    const existing = await this.existingEmails(records.map(({ data }) => data.email.toLowerCase()))
    const seen = new Set<string>()
    const drafts: Draft[] = []
    for (const { record, data } of records) drafts.push(await this.templateRow(record, data, existing, seen))
    finishRows(drafts, false)
    return drafts
  }

  private async templateRow(record: number, r: Record<string, string>, existing: ExistingAccounts, seen: Set<string>): Promise<Draft> {
    const email = r.email.toLowerCase()
    const serviceTypes = r.serviceTypes.split('|').map(s => s.trim())
    const row: ProviderImportRow = { record, practiceName: r.practiceName, email, serviceTypes, city: r.city || undefined, outcome: 'error', errors: [], warnings: [] }
    const draft: Draft = { row, extras: {} }
    try {
      if (seen.has(email)) throw new Error('Duplicate email in this file')
      seen.add(email)
      const account = existing.get(email)
      if (account && !account.leftover) throw new Error('An account already exists for this email')
      if (account) row.warnings.push(REPLACES_LEFTOVER_WARNING)
      const country = ({ KE: 'Kenya', ZW: 'Zimbabwe', ZM: 'Zambia' } as Record<string, string>)[r.country.toUpperCase()] ?? r.country
      if (!['Kenya', 'Zimbabwe', 'Zambia'].includes(country)) throw new Error('Country must be Kenya, Zimbabwe, Zambia, KE, ZW or ZM')
      if (!serviceTypes.length || serviceTypes.some(s => !TEMPLATE_SERVICES.includes(s))) throw new Error('Use service names from the template, separated by |')
      let point = r.latitude || r.longitude ? coordinatePair(r.latitude, r.longitude) : undefined
      if (r.googleMapsUrl) {
        const extracted = await resolveMapsCoordinates(r.googleMapsUrl)
        if (point && (Math.abs(point.lat - extracted.lat) > 0.0001 || Math.abs(point.lng - extracted.lng) > 0.0001)) throw new Error('Coordinates differ from the Google Maps pin')
        point = extracted
      }
      if (!point) throw new Error('Provide latitude and longitude, or an exact Google Maps pin link')
      row.lat = point.lat
      row.lng = point.lng
      const credentials = r.credentialsJson ? JSON.parse(r.credentialsJson) : []
      if (!Array.isArray(credentials) || credentials.some(c => !c || c.document)) throw new Error('credentialsJson must be an array of licence details; upload documents later')
      const hours = r.hoursJson ? JSON.parse(r.hoursJson) : []
      const allowed = allowedCredentialKinds(toCredentialCountry(country)!, serviceTypes)
      if (credentials.some(c => !allowed.has(c.kind)) || new Set(credentials.map(c => c.kind)).size !== credentials.length) throw new Error('Licence kinds must match the country and services, without duplicates')
      if (credentials.some(c => c.expiresAt && new Date(c.expiresAt).getTime() < Date.now())) throw new Error('A supplied licence has expired')
      const registration: RegistrationFields = {
        practiceName: r.practiceName, phone: r.phone, country, serviceTypes, licenseNumber: r.licenseNumber || undefined,
        businessRegNumber: r.businessRegNumber || undefined, taxPin: r.taxPin || undefined, credentials, hours,
        location: { address: r.address, city: r.city || undefined, region: r.region || undefined, label: r.locationLabel || undefined, ...point },
        payoutMethod: { method: r.payoutMethod || 'bank', accountNumber: r.accountNumber || undefined, accountName: r.accountName || undefined, bankName: r.bankName || undefined, bankBranch: r.bankBranch || undefined, summary: r.payoutSummary || undefined },
      }
      const { dto, errors } = await this.validateRegistration(registration, email, r.emailSecondary || undefined, false)
      row.errors.push(...errors)
      draft.registration = registration
      draft.dto = dto
    } catch (e) {
      row.errors.push((e as Error).message)
    }
    return draft
  }

  private async prepareOutscraper(table: SheetTable): Promise<Draft[]> {
    if (!table.rows.length || table.rows.length > OUTSCRAPER_ROW_LIMIT) throw new BadRequestException(`Import between 1 and ${OUTSCRAPER_ROW_LIMIT} rows per file`)
    const headers = table.headers.map(h => h.trim().toLowerCase())
    const parsed = table.rows.map(({ record, values }) => {
      const data: Record<string, string> = {}
      headers.forEach((header, i) => { if (!Object.prototype.hasOwnProperty.call(data, header)) data[header] = values[i] ?? '' })
      return { record, data, mapped: values.length === headers.length ? mapOutscraperRecord(data) : undefined }
    })
    const placeIds = parsed.flatMap(p => (p.mapped?.placeId ? [p.mapped.placeId] : []))
    const primaryEmails = parsed.flatMap(p => (p.mapped?.emails[0] ? [p.mapped.emails[0]] : []))
    const knownPlaceIds = await this.knownPlaceIds(placeIds)
    const existing = await this.existingEmails(primaryEmails)
    const seenPlaceIds = new Set<string>()
    const seenEmails = new Set<string>()
    const drafts: Draft[] = []

    for (const { record, data, mapped: m } of parsed) {
      const row: ProviderImportRow = { record, practiceName: data.name ?? '', email: '', serviceTypes: [], outcome: 'error', errors: [], warnings: [] }
      const draft: Draft = { row, extras: {} }
      drafts.push(draft)
      if (!m) {
        row.errors.push('Column count does not match the header')
        continue
      }
      row.practiceName = m.practiceName
      row.serviceTypes = m.serviceTypes
      row.city = m.city
      row.lat = m.coords?.lat
      row.lng = m.coords?.lng
      if (m.closed) { row.skipReason = 'Closed on Google'; continue }
      if (!m.serviceTypes.length) { row.skipReason = `Not a care provider (${m.serviceLabel})`; continue }
      if (m.placeId) {
        if (seenPlaceIds.has(m.placeId)) { row.skipReason = 'Duplicate in this file'; continue }
        seenPlaceIds.add(m.placeId)
        if (knownPlaceIds.blocked.has(m.placeId)) { row.skipReason = 'Already imported'; continue }
      }

      const email = m.emails[0] as string | undefined
      const emailSecondary = m.emails[1] as string | undefined
      let replaces = !!m.placeId && knownPlaceIds.replaced.has(m.placeId)
      if (email) {
        row.email = email
        if (seenEmails.has(email)) row.errors.push('Duplicate email in this file')
        seenEmails.add(email)
        const account = existing.get(email)
        if (account && !account.leftover) row.errors.push('An account already exists for this email')
        if (account?.leftover) replaces = true
        if (m.invalidEmails.length) row.warnings.push(`Ignored invalid email: ${m.invalidEmails.join(', ')}`)
      } else if (m.invalidEmails.length) {
        row.errors.push(`Email is not valid: ${m.invalidEmails[0]}`)
      }
      if (replaces) row.warnings.push(REPLACES_LEFTOVER_WARNING)
      if (!m.phone) row.warnings.push('No phone number')
      if (!m.hours) row.warnings.push('Opening hours not set')
      if (!m.coords) row.errors.push('Missing map coordinates')
      if (!m.country) row.errors.push('Country must be Kenya, Zimbabwe or Zambia')

      draft.phone = m.phone || undefined
      draft.extras = { road: m.road, website: m.website, googlePlaceId: m.placeId, googleMapsUrl: m.googleMapsUrl }
      if (m.country) {
        const registration: RegistrationFields = {
          practiceName: m.practiceName, phone: m.phone, country: m.country, serviceTypes: m.serviceTypes, hours: m.hours ?? [],
          location: { address: m.address, city: m.city, region: m.region, label: m.locationLabel, lat: m.coords?.lat, lng: m.coords?.lng },
          payoutMethod: { method: 'bank' },
        }
        const { dto, errors } = await this.validateRegistration(registration, email ?? PLACEHOLDER_EMAIL, emailSecondary, true)
        row.errors.push(...errors)
        draft.registration = registration
        draft.dto = dto
      }
    }
    finishRows(drafts, true)
    return drafts
  }

  /** Runs the same checks as the registration form. Outscraper rows may have no phone, which is stored as ''. */
  private async validateRegistration(registration: RegistrationFields, email: string, emailSecondary: string | undefined, outscraper: boolean): Promise<{ dto: RegisterSpDto; errors: string[] }> {
    const dto = plainToInstance(RegisterSpDto, { ...registration, email, emailSecondary, password: randomBytes(32).toString('hex') })
    const validation = await validate(dto, { whitelist: true, forbidNonWhitelisted: true })
    const errors = flatten(validation.filter(item => !(outscraper && item.property === 'phone')))
    if (!dto.practiceName.trim() || (!outscraper && !dto.phone.trim()) || !dto.location.address.trim()) {
      errors.push(outscraper ? 'Practice name and address cannot be blank' : 'Practice, phone and address cannot be blank')
    }
    return { dto, errors }
  }

  /** Creates the SUSPENDED user and application for each validated account, with one audit entry per application. */
  private async createAccounts(tx: Prisma.TransactionClient, actorUserId: string, accounts: Array<{ dto: RegisterSpDto; extras: ImportExtras }>, passwordHash: string, leadId?: string): Promise<string[]> {
    const created: Array<{ id: string; email: string }> = []
    for (const { dto, extras } of accounts) {
      const user = await tx.user.create({ data: { email: dto.email, passwordHash, role: UserRole.SP, status: UserStatus.SUSPENDED, phone: dto.phone || null, country: dto.country } })
      const application = await tx.providerApplication.create({ data: {
        userId: user.id, importedAt: new Date(), practiceName: dto.practiceName, email: dto.email, emailSecondary: dto.emailSecondary,
        phone: dto.phone, country: dto.country, address: dto.location.address, city: dto.location.city, region: dto.location.region,
        locationLabel: dto.location.label, lat: dto.location.lat, lng: dto.location.lng, serviceTypes: dto.serviceTypes,
        road: extras.road, website: extras.website, googlePlaceId: extras.googlePlaceId,
        licenseNumber: dto.licenseNumber ?? dto.credentials?.[0]?.number ?? '', businessRegNumber: dto.businessRegNumber, taxPin: dto.taxPin,
        openingHours: dto.hours as unknown as Prisma.InputJsonValue, payoutMethod: dto.payoutMethod.method === 'mpesa' ? 'MPESA' : dto.payoutMethod.method === 'mobile_money' ? 'MOBILE_MONEY' : 'BANK',
        payoutSummary: dto.payoutMethod.summary, payoutDetails: dto.payoutMethod as unknown as Prisma.InputJsonValue,
        credentials: { create: (dto.credentials ?? []).map(c => ({ kind: c.kind, number: c.number, holderName: c.holderName, expiresAt: c.expiresAt ? new Date(c.expiresAt) : undefined })) },
      } })
      created.push({ id: application.id, email: dto.email })
    }
    if (created.length) {
      await tx.auditLog.createMany({ data: created.map(c => ({ actorUserId, action: 'admin.provider.imported', entityType: 'ProviderApplication', entityId: c.id, metadata: { email: c.email, ...(leadId ? { leadId } : {}) } })) })
    }
    return created.map(c => c.id)
  }

  private async save(actorUserId: string, drafts: Draft[], format: ProviderImportFormat, fileName?: string) {
    const accounts = drafts.filter(d => d.row.outcome === 'import').map(d => ({ dto: d.dto!, extras: d.extras }))
    const leads = drafts.filter(d => d.row.outcome === 'needs_email')
    const passwordHash = await bcrypt.hash(randomBytes(48).toString('hex'), 12)
    let committed: { imported: number; leadsCreated: number; freedKeys: string[] }
    try {
      committed = await this.prisma.$transaction(async tx => {
        const freedKeys = await this.clearLeftovers(tx, accounts)
        const applicationIds = await this.createAccounts(tx, actorUserId, accounts, passwordHash)
        if (leads.length) {
          await tx.providerImportLead.createMany({ data: leads.map(d => this.leadData(d, actorUserId)) })
          await tx.auditLog.create({ data: {
            actorUserId, action: 'admin.provider.import_leads', entityType: 'ProviderImport', entityId: randomUUID(),
            metadata: { count: leads.length, imported: applicationIds.length, format, fileName: fileName?.slice(0, 200) ?? null },
          } })
        }
        return { imported: applicationIds.length, leadsCreated: leads.length, freedKeys }
      }, { timeout: TRANSACTION_TIMEOUT_MS })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException('An email or Google place was registered during import. No rows were imported. Preview again.')
      throw new ServiceUnavailableException('Import could not be saved. No rows were imported. Please retry.')
    }
    await this.deleteStoredFiles(committed.freedKeys)
    return { imported: committed.imported, leadsCreated: committed.leadsCreated }
  }

  private leadData(draft: Draft, actorUserId: string): Prisma.ProviderImportLeadCreateManyInput {
    const registration = draft.registration ?? {}
    const location = isRecord(registration.location) ? registration.location : {}
    return {
      googlePlaceId: draft.extras.googlePlaceId ?? null,
      practiceName: draft.row.practiceName,
      phone: draft.phone ?? null,
      website: draft.extras.website ?? null,
      address: typeof location.address === 'string' ? location.address : '',
      city: typeof location.city === 'string' ? location.city : null,
      region: typeof location.region === 'string' ? location.region : null,
      serviceTypes: draft.row.serviceTypes,
      payload: toJson({ ...registration, ...draft.extras }),
      status: ProviderImportLeadStatus.NEEDS_EMAIL,
      importedById: actorUserId,
    }
  }

  private async existingEmails(emails: string[]): Promise<ExistingAccounts> {
    const unique = [...new Set(emails.filter(Boolean))]
    if (!unique.length) return new Map()
    const users = await this.prisma.user.findMany({ where: { email: { in: unique } }, select: { id: true, email: true } })
    const leftovers = await this.leftoverUserIds(users.map(user => user.id))
    return new Map(users.map((user): [string, { leftover: boolean }] => [user.email, { leftover: leftovers.has(user.id) }]))
  }

  /** The ids among `userIds` that are DELETED_PROVIDER_LEFTOVER accounts. */
  private async leftoverUserIds(userIds: string[]): Promise<Set<string>> {
    const unique = [...new Set(userIds)]
    if (!unique.length) return new Set()
    const leftovers = await this.prisma.user.findMany({ where: { id: { in: unique }, ...DELETED_PROVIDER_LEFTOVER }, select: { id: true } })
    return new Set(leftovers.map(user => user.id))
  }

  /**
   * Google place ids already on an application or a lead, dismissed leads included. `blocked` places stop a row
   * ("Already imported"). `replaced` places are held only by leftover accounts, which the import takes over.
   */
  private async knownPlaceIds(ids: string[]): Promise<{ blocked: Set<string>; replaced: Set<string> }> {
    const blocked = new Set<string>()
    const replaced = new Set<string>()
    const unique = [...new Set(ids)]
    if (!unique.length) return { blocked, replaced }
    const [applications, leads] = await Promise.all([
      this.prisma.providerApplication.findMany({ where: { googlePlaceId: { in: unique } }, select: { id: true, userId: true, googlePlaceId: true } }),
      this.prisma.providerImportLead.findMany({ where: { googlePlaceId: { in: unique } }, select: { googlePlaceId: true, applicationId: true } }),
    ])
    const leftovers = await this.leftoverUserIds(applications.map(app => app.userId))
    const leftoverApplicationIds = new Set(applications.filter(app => leftovers.has(app.userId)).map(app => app.id))
    for (const app of applications) {
      if (!app.googlePlaceId) continue
      if (leftovers.has(app.userId)) replaced.add(app.googlePlaceId)
      else blocked.add(app.googlePlaceId)
    }
    for (const lead of leads) {
      if (!lead.googlePlaceId) continue
      // A lead whose application is a leftover's goes with that application.
      if (lead.applicationId && leftoverApplicationIds.has(lead.applicationId)) replaced.add(lead.googlePlaceId)
      else blocked.add(lead.googlePlaceId)
    }
    return { blocked, replaced }
  }

  /**
   * Deletes the leftover accounts that hold one of these emails or Google places, with their applications and the import
   * leads that point at those applications. Runs inside the import transaction, where the leftover condition is checked
   * again. Returns the storage keys of the deleted documents, to remove once the transaction has committed.
   */
  private async clearLeftovers(tx: Prisma.TransactionClient, accounts: Array<{ dto: RegisterSpDto; extras: ImportExtras }>): Promise<string[]> {
    if (!accounts.length) return []
    const emails = accounts.map(account => account.dto.email)
    const placeIds = accounts.flatMap(account => (account.extras.googlePlaceId ? [account.extras.googlePlaceId] : []))
    const leftovers = await tx.user.findMany({
      where: { ...DELETED_PROVIDER_LEFTOVER, OR: [{ email: { in: emails } }, { providerApplications: { some: { googlePlaceId: { in: placeIds } } } }] },
      select: { id: true },
    })
    if (!leftovers.length) return []
    const userIds = leftovers.map(user => user.id)
    const applicationIds = (await tx.providerApplication.findMany({ where: { userId: { in: userIds } }, select: { id: true } })).map(app => app.id)
    const documents = await tx.providerApplicationDocument.findMany({ where: { applicationId: { in: applicationIds } }, select: { storageKey: true } })
    await tx.providerImportLead.deleteMany({ where: { applicationId: { in: applicationIds } } })
    await tx.user.deleteMany({ where: { id: { in: userIds } } })
    return documents.flatMap(doc => (doc.storageKey ? [doc.storageKey] : []))
  }

  /** Best effort. StorageService logs and ignores its own failures. Call only after the rows that owned the files are gone. */
  private async deleteStoredFiles(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.storage.deleteObject(key)))
  }

  async listLeads() {
    const leads = await this.prisma.providerImportLead.findMany({
      where: { status: ProviderImportLeadStatus.NEEDS_EMAIL },
      orderBy: { createdAt: 'desc' },
      take: LEAD_LIST_LIMIT,
    })
    return leads.map(lead => {
      const payload = isRecord(lead.payload) ? lead.payload : {}
      const googleMapsUrl = typeof payload.googleMapsUrl === 'string' ? payload.googleMapsUrl : undefined
      return {
        id: lead.id,
        practiceName: lead.practiceName,
        phone: lead.phone,
        website: lead.website,
        address: lead.address,
        city: lead.city,
        region: lead.region,
        serviceTypes: Array.isArray(lead.serviceTypes) ? lead.serviceTypes.filter((s): s is string => typeof s === 'string') : [],
        ...(googleMapsUrl ? { googleMapsUrl } : {}),
        createdAt: lead.createdAt,
      }
    })
  }

  async countLeads() {
    return { needsEmail: await this.prisma.providerImportLead.count({ where: { status: ProviderImportLeadStatus.NEEDS_EMAIL } }) }
  }

  /** Adds the email to a lead, which creates the account exactly as a normal import row does. */
  async importLead(actorUserId: string, leadId: string, input: ImportProviderLeadDto) {
    const lead = await this.prisma.providerImportLead.findUnique({ where: { id: leadId } })
    if (!lead || lead.status !== ProviderImportLeadStatus.NEEDS_EMAIL) throw new NotFoundException('Lead not found')
    const email = input.email.trim().toLowerCase()
    const secondary = input.emailSecondary?.trim().toLowerCase()
    const emailSecondary = secondary && secondary !== email ? secondary : undefined
    const account = (await this.existingEmails([email])).get(email)
    if (account && !account.leftover) throw new BadRequestException('An account already exists for this email')

    const payload: Record<string, unknown> = isRecord(lead.payload) ? lead.payload : {}
    const registration = withoutKeys(payload, EXTRA_PAYLOAD_KEYS)
    const extras: ImportExtras = {
      road: typeof payload.road === 'string' ? payload.road : undefined,
      website: lead.website ?? undefined,
      googlePlaceId: lead.googlePlaceId ?? undefined,
      googleMapsUrl: typeof payload.googleMapsUrl === 'string' ? payload.googleMapsUrl : undefined,
    }
    const { dto, errors } = await this.validateRegistration(registration, email, emailSecondary, true)
    if (errors.length) throw new BadRequestException(errors.join('; '))

    const passwordHash = await bcrypt.hash(randomBytes(48).toString('hex'), 12)
    let committed: { applicationId: string; freedKeys: string[] }
    try {
      committed = await this.prisma.$transaction(async tx => {
        const freedKeys = await this.clearLeftovers(tx, [{ dto, extras }])
        const [createdId] = await this.createAccounts(tx, actorUserId, [{ dto, extras }], passwordHash, lead.id)
        const claimed = await tx.providerImportLead.updateMany({
          where: { id: lead.id, status: ProviderImportLeadStatus.NEEDS_EMAIL },
          data: { status: ProviderImportLeadStatus.IMPORTED, applicationId: createdId },
        })
        if (claimed.count !== 1) throw new NotFoundException('Lead not found')
        return { applicationId: createdId, freedKeys }
      }, { timeout: TRANSACTION_TIMEOUT_MS })
    } catch (e) {
      if (e instanceof HttpException) throw e
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = JSON.stringify(e.meta?.target ?? '')
        throw new BadRequestException(target.includes('email') ? 'An account already exists for this email' : 'This provider was already imported. Refresh the list.')
      }
      throw new ServiceUnavailableException('Lead could not be imported. Nothing was saved. Please retry.')
    }
    await this.deleteStoredFiles(committed.freedKeys)
    return { applicationId: committed.applicationId }
  }

  async dismissLead(actorUserId: string, leadId: string) {
    const result = await this.prisma.providerImportLead.updateMany({
      where: { id: leadId, status: ProviderImportLeadStatus.NEEDS_EMAIL },
      data: { status: ProviderImportLeadStatus.DISMISSED },
    })
    if (result.count !== 1) throw new NotFoundException('Lead not found')
    await this.prisma.auditLog.create({ data: { actorUserId, action: 'admin.provider.import_lead_dismissed', entityType: 'ProviderImportLead', entityId: leadId } })
    return { success: true }
  }
}
