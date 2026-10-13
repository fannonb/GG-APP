import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { Prisma, ProviderApplicationDocumentKind, ProviderCredentialStatus } from '@prisma/client'
import {
  CREDENTIAL_FILE_MAX_BYTES,
  allowedCredentialKinds,
  credentialType,
  credentialsFor,
  needsBusinessRegistration,
  toCredentialCountry,
} from '../constants/credentials'
import { StorageService } from './storage.service'

export interface CredentialInput {
  kind: string
  number: string
  holderName?: string
  expiresAt?: string
  document?: { originalName: string; mimeType: string; sizeBytes: number; dataUrl: string }
}

interface PreparedCredential {
  kind: string
  number: string
  holderName: string | null
  expiresAt: Date | null
  document: {
    originalName: string
    mimeType: string
    sizeBytes: number
    displaySize: string
    storageKey: string | null
    dataUrl: string | null
  } | null
}

export interface PreparedCredentials {
  items: PreparedCredential[]
  licenseNumber: string
  businessRegNumber: string | null
  taxPin: string | null
  /** Object keys already uploaded, so a failed registration can remove them. */
  uploadedKeys: string[]
}

type CredentialRecord = {
  id: string
  kind: string
  number: string
  holderName: string | null
  expiresAt: Date | null
  documentId: string | null
  status: ProviderCredentialStatus
  note: string | null
  verifiedAt: Date | null
}

/**
 * Provider licences: checks what a provider sends against the rules in
 * constants/credentials.ts, stores certificates, and tells admins which
 * required licences are still unverified.
 */
@Injectable()
export class ProviderCredentialsService {
  private readonly logger = new Logger(ProviderCredentialsService.name)

  constructor(@Inject(StorageService) private readonly storage: StorageService) {}

  /**
   * Validate the licences on a registration and upload their certificates.
   * Applications from older clients (no `credentials`) keep the single licence number.
   */
  async prepareForRegistration(input: {
    country: string
    serviceTypes: string[]
    credentials?: CredentialInput[]
    licenseNumber?: string
    businessRegNumber?: string
    taxPin?: string
  }): Promise<PreparedCredentials> {
    const businessRegNumber = input.businessRegNumber?.trim() || null
    const taxPin = input.taxPin?.trim().toUpperCase() || null

    if (!input.credentials || input.credentials.length === 0) {
      const legacy = input.licenseNumber?.trim()
      if (!legacy) throw new BadRequestException('Add your licence details.')
      return { items: [], licenseNumber: legacy, businessRegNumber, taxPin, uploadedKeys: [] }
    }

    const country = toCredentialCountry(input.country)
    if (!country) throw new BadRequestException('GG’APP accepts providers in Kenya, Zimbabwe and Zambia.')

    const allowed = allowedCredentialKinds(country, input.serviceTypes)
    const { required } = credentialsFor(country, input.serviceTypes)
    const problems: string[] = []
    const seen = new Set<string>()
    const now = Date.now()

    for (const c of input.credentials) {
      const type = credentialType(c.kind)
      if (!type || !allowed.has(c.kind)) {
        problems.push(`${type?.label ?? c.kind} does not apply to the services you picked`)
        continue
      }
      if (seen.has(c.kind)) problems.push(`${type.label} was added twice`)
      seen.add(c.kind)
      if (type.holder === 'person' && !c.holderName?.trim()) problems.push(`Add the name for ${type.label}`)
      if (type.expires && !type.optionalOnly && !c.expiresAt) problems.push(`Add the expiry date for ${type.label}`)
      if (c.expiresAt && new Date(c.expiresAt).getTime() < now) problems.push(`${type.label} has expired`)
      if (type.document && !type.optionalOnly && !c.document) problems.push(`Upload the ${type.label} certificate`)
    }

    for (const group of required) {
      if (!group.some(kind => seen.has(kind))) {
        const types = group.map(k => credentialType(k))
        problems.push(
          types.length === 1 && types[0]?.holder === 'person'
            ? `Add the ${types[0].label.toLowerCase()}'s details`
            : `Add your ${types.map((t, i) => t?.label.toLowerCase() ?? group[i]).join(' or ')}`,
        )
      }
    }
    if (needsBusinessRegistration(input.serviceTypes) && !businessRegNumber) problems.push('Add your business registration number')
    if (!taxPin) problems.push('Add your tax PIN')

    if (problems.length > 0) throw new BadRequestException(`${problems.join('. ')}.`)

    const uploadedKeys: string[] = []
    const items: PreparedCredential[] = []
    try {
      for (const c of input.credentials) {
        let document: PreparedCredential['document'] = null
        if (c.document) {
          const bytes = Math.floor(((c.document.dataUrl.split(',')[1] ?? '').length * 3) / 4)
          if (bytes > CREDENTIAL_FILE_MAX_BYTES * 1.02) {
            throw new BadRequestException(`The ${credentialType(c.kind)?.label ?? 'licence'} file is larger than 5 MB.`)
          }
          const stored = await this.storage.storeAttachment({
            dataUrl: c.document.dataUrl,
            originalName: c.document.originalName,
            mimeType: c.document.mimeType,
            sizeBytes: bytes,
            displaySize: formatSize(bytes),
            prefix: 'provider-documents',
          })
          if (stored.storageKey) uploadedKeys.push(stored.storageKey)
          document = {
            originalName: c.document.originalName,
            mimeType: c.document.mimeType,
            sizeBytes: bytes,
            displaySize: formatSize(bytes),
            storageKey: stored.storageKey ?? null,
            dataUrl: stored.storageKey ? null : (stored.dataUrl ?? null),
          }
        }
        items.push({
          kind: c.kind,
          number: c.number.trim().toUpperCase(),
          holderName: c.holderName?.trim() || null,
          expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
          document,
        })
      }
    } catch (error) {
      await this.discardUploads(uploadedKeys)
      throw error
    }

    // The old single licence column keeps the main facility (or practitioner) licence.
    const main =
      items.find(i => credentialType(i.kind)?.holder === 'facility' && !credentialType(i.kind)?.optionalOnly) ??
      items.find(i => !credentialType(i.kind)?.optionalOnly) ??
      items[0]
    return { items, licenseNumber: main.number, businessRegNumber, taxPin, uploadedKeys }
  }

  /** Create the credential rows (and their certificate documents) inside the registration transaction. */
  async createRecords(tx: Prisma.TransactionClient, applicationId: string, items: PreparedCredential[]) {
    for (const item of items) {
      let documentId: string | null = null
      if (item.document) {
        const doc = await tx.providerApplicationDocument.create({
          data: {
            applicationId,
            kind: ProviderApplicationDocumentKind.LICENSE,
            originalName: item.document.originalName,
            mimeType: item.document.mimeType,
            sizeBytes: item.document.sizeBytes,
            displaySize: item.document.displaySize,
            storageKey: item.document.storageKey,
            dataUrl: item.document.dataUrl,
          },
          select: { id: true },
        })
        documentId = doc.id
      }
      await tx.providerCredential.create({
        data: {
          applicationId,
          kind: item.kind,
          number: item.number,
          holderName: item.holderName,
          expiresAt: item.expiresAt,
          documentId,
        },
      })
    }
  }

  async discardUploads(keys: string[]) {
    for (const key of keys) await this.storage.deleteObject(key)
  }

  /** Credentials as the admin review shows them, plus which required licences are still unverified. */
  summarize(application: { country: string; serviceTypes: Prisma.JsonValue; credentials?: CredentialRecord[] }) {
    const credentials = application.credentials ?? []
    if (credentials.length === 0) return { credentials: [], outstanding: null as string[] | null }

    const services = Array.isArray(application.serviceTypes)
      ? application.serviceTypes.filter((s): s is string => typeof s === 'string')
      : []
    const country = toCredentialCountry(application.country)
    const required = country ? credentialsFor(country, services).required : []
    const requiredKinds = new Set(required.flat())
    const now = Date.now()
    const usable = (c: CredentialRecord) =>
      c.status === ProviderCredentialStatus.VERIFIED && (!c.expiresAt || c.expiresAt.getTime() >= now)

    const outstanding = required
      .filter(group => !group.some(kind => credentials.some(c => c.kind === kind && usable(c))))
      .map(group => group.map(k => credentialType(k)?.label ?? k).join(' or '))

    return {
      outstanding,
      credentials: credentials.map(c => {
        const type = credentialType(c.kind)
        return {
          id: c.id,
          kind: c.kind,
          label: type?.label ?? c.kind,
          regulator: type?.regulator ?? '',
          holder: type?.holder ?? 'facility',
          numberLabel: type?.numberLabel ?? 'Number',
          number: c.number,
          holderName: c.holderName ?? undefined,
          expiresAt: c.expiresAt?.toISOString(),
          expired: !!c.expiresAt && c.expiresAt.getTime() < now,
          status: c.status.toLowerCase() as 'submitted' | 'verified' | 'rejected' | 'expired',
          note: c.note ?? undefined,
          verifiedAt: c.verifiedAt?.toISOString(),
          hasDocument: !!c.documentId,
          required: requiredKinds.has(c.kind),
          verifyUrl: type?.verifyUrl,
          verifyHint: type?.verifyHint,
        }
      }),
    }
  }

  async resolveDocument(document: {
    originalName: string
    mimeType: string
    sizeBytes: number
    displaySize: string
    storageKey: string | null
    dataUrl: string | null
  }) {
    const resolved = await this.storage.resolveAttachmentUrl(
      {
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        displaySize: document.displaySize,
        storageKey: document.storageKey ?? undefined,
        dataUrl: document.dataUrl ?? undefined,
      },
      'licence',
    )
    if (!resolved) this.logger.warn('A licence document could not be resolved (no storage key or data).')
    return resolved
  }
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
