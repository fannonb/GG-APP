import { Inject, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

export interface AttachmentMetadata {
  originalName?: string
  mimeType?: string
  sizeBytes?: number
  displaySize?: string
  storageKey?: string
  /** 'bucket' once the file lives in object storage; older rows have no marker and keep their data URL. */
  storage?: 'bucket'
  /** Legacy field: base64 data URL embedded in PostgreSQL (storage disabled). */
  dataUrl?: string
}

export interface StoreAttachmentInput {
  dataUrl?: string
  originalName?: string
  mimeType?: string
  sizeBytes?: number
  displaySize?: string
  prefix: 'invoices' | 'prescriptions' | 'appointments' | 'provider-documents'
}

export interface ResolvedAttachment {
  url: string
  fileName: string
  mimeType: string
  sizeBytes: number
  displaySize: string
}

/**
 * S3-compatible object storage (Railway Buckets, Cloudflare R2, AWS S3,
 * Backblaze B2 — any provider that speaks the S3 API; the endpoint/keys are
 * env-driven so the provider can be swapped without code changes).
 *
 * When storage is not configured (no STORAGE_ENDPOINT), the service falls back
 * to the legacy behavior of embedding base64 data URLs in PostgreSQL — used
 * for local development only. Production must enable object storage so
 * clinical documents never live in the database.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly client: S3Client | null = null
  private readonly bucket: string
  private readonly publicBaseUrl: string
  private readonly presignExpiresSeconds: number

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const endpoint = configService.get<string>('storage.endpoint') ?? ''
    const region = configService.get<string>('storage.region') ?? 'us-east-1'
    const accessKeyId = configService.get<string>('storage.accessKeyId') ?? ''
    const secretAccessKey = configService.get<string>('storage.secretAccessKey') ?? ''
    this.bucket = configService.get<string>('storage.bucket') ?? ''
    this.publicBaseUrl = (configService.get<string>('storage.publicBaseUrl') ?? '').replace(/\/+$/, '')
    this.presignExpiresSeconds = Number(configService.get<string>('storage.presignExpiresSeconds') ?? 900)

    if (endpoint && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        endpoint,
        region,
        forcePathStyle: (configService.get<string>('storage.forcePathStyle') ?? 'true') !== 'false',
        credentials: { accessKeyId, secretAccessKey },
      })
      this.logger.log(`Object storage enabled (bucket "${this.bucket}").`)
    } else {
      this.logger.warn(
        'Object storage is NOT configured (STORAGE_ENDPOINT/keys/bucket missing); ' +
          'attachments will be embedded in PostgreSQL as data URLs (legacy, dev-only).',
      )
    }
  }

  get isEnabled(): boolean {
    return this.client !== null
  }

  /**
   * Store an attachment. When storage is enabled the base64 data URL is
   * decoded and uploaded to the bucket; the returned metadata contains a
   * `storageKey` and NO `dataUrl` (documents leave PostgreSQL). When storage
   * is disabled the input metadata is returned unchanged (legacy data URLs).
   */
  async storeAttachment(input: StoreAttachmentInput): Promise<AttachmentMetadata> {
    const base = {
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      displaySize: input.displaySize,
    }

    if (!this.client) {
      return { ...base, dataUrl: input.dataUrl }
    }

    const dataUrl = input.dataUrl
    if (!dataUrl) {
      // No file payload — keep whatever metadata the caller provides.
      return { ...base }
    }

    const base64 = dataUrl.split(',')[1] ?? ''
    if (!base64) {
      throw new Error('Attachment dataUrl is not a valid base64 data URL')
    }
    const body = Buffer.from(base64, 'base64')
    if (body.length === 0) {
      throw new Error('Attachment dataUrl decoded to an empty file')
    }

    const key = `${input.prefix}/${randomUUID()}/${this.sanitizeFileName(input.originalName ?? 'attachment')}`

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: input.mimeType ?? 'application/octet-stream',
          ContentLength: body.length,
        }),
      )
    } catch (error) {
      this.logger.error(`Failed to store attachment in bucket "${this.bucket}": ${(error as Error).message}`)
      throw new Error('Failed to store attachment. Check object storage configuration.', {
        cause: error,
      })
    }

    return { ...base, storageKey: key }
  }

  /**
   * Resolve an attachment to a downloadable URL:
   * - stored object  -> presigned (or public) URL when storage is enabled
   * - legacy metadata -> the embedded data URL
   */
  async resolveAttachmentUrl(
    metadata: AttachmentMetadata | null | undefined,
    fallbackFileName: string,
  ): Promise<ResolvedAttachment | null> {
    if (!metadata || typeof metadata !== 'object') {
      return null
    }

    const fileName = metadata.originalName ?? fallbackFileName

    if (metadata.storageKey && this.client) {
      const url = this.publicBaseUrl
        ? `${this.publicBaseUrl}/${metadata.storageKey}`
        : await this.presign(metadata.storageKey)
      if (!url) return null
      return {
        url,
        fileName,
        mimeType: metadata.mimeType ?? 'application/octet-stream',
        sizeBytes: metadata.sizeBytes ?? 0,
        displaySize: metadata.displaySize ?? '',
      }
    }

    if (typeof metadata.dataUrl === 'string' && metadata.dataUrl.trim()) {
      return {
        url: metadata.dataUrl,
        fileName,
        mimeType: metadata.mimeType ?? 'application/pdf',
        sizeBytes: metadata.sizeBytes ?? 0,
        displaySize: metadata.displaySize ?? '',
      }
    }

    return null
  }

  async deleteObject(storageKey?: string | null): Promise<void> {
    if (!storageKey || !this.client) return
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      )
    } catch (error) {
      this.logger.warn(`Failed to delete object "${storageKey}": ${(error as Error).message}`)
    }
  }

  /**
   * Move an inline file out of the database. Returns the metadata to store: the object key and
   * `storage: 'bucket'`, with no `dataUrl`. Metadata without a file, or with storage disabled,
   * is returned unchanged. The caller must `deleteObject` the returned key if its save fails.
   */
  async externalize<T extends AttachmentMetadata>(
    meta: T | null | undefined,
    prefix: StoreAttachmentInput['prefix'],
  ): Promise<T | null> {
    if (!meta || typeof meta !== 'object') return meta ?? null
    if (!this.client || !meta.dataUrl) return meta

    const stored = await this.storeAttachment({
      dataUrl: meta.dataUrl,
      originalName: meta.originalName,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      displaySize: meta.displaySize,
      prefix,
    })
    const { dataUrl: _inline, ...rest } = meta
    return { ...rest, storageKey: stored.storageKey, storage: 'bucket' } as T
  }

  /** Delete files that were uploaded for a save that then failed, and rethrow the original error. */
  async discardOnFailure(keys: Array<string | null | undefined>, error: unknown): Promise<never> {
    await Promise.all(keys.filter((k): k is string => !!k).map(k => this.deleteObject(k)))
    throw error
  }

  /** Hydrate every item of a stored list (e.g. appointment attachments). */
  async hydrateList(items: unknown): Promise<unknown[]> {
    if (!Array.isArray(items)) return []
    return Promise.all(items.map(item => this.hydrate(item as AttachmentMetadata)))
  }

  /**
   * Put a stored file back as a data URL, for responses that clients read inline.
   * Rows that still carry their own data URL, and rows without a bucket marker, pass through unchanged.
   */
  async hydrate<T extends AttachmentMetadata>(meta: T | null | undefined): Promise<T | null> {
    if (!meta || typeof meta !== 'object') return meta ?? null
    if (meta.dataUrl || meta.storage !== 'bucket' || !meta.storageKey) return meta
    if (!this.client) {
      // The row points at the bucket but this API has no bucket credentials (e.g. local dev without STORAGE_*).
      this.logger.warn(`File "${meta.storageKey}" is in object storage, but storage is not configured here, so it cannot be served.`)
      return meta
    }

    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: meta.storageKey }))
      const bytes = Buffer.from(await res.Body!.transformToByteArray())
      return { ...meta, dataUrl: `data:${meta.mimeType ?? 'application/octet-stream'};base64,${bytes.toString('base64')}` }
    } catch (error) {
      this.logger.error(`Could not load stored file "${meta.storageKey}": ${(error as Error).message}`)
      return meta
    }
  }

  private async presign(storageKey: string): Promise<string | null> {
    try {
      return await getSignedUrl(
        this.client!,
        new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
        { expiresIn: this.presignExpiresSeconds },
      )
    } catch (error) {
      this.logger.error(`Failed to presign object "${storageKey}": ${(error as Error).message}`)
      return null
    }
  }

  private sanitizeFileName(name: string): string {
    const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
    return cleaned || 'attachment'
  }
}
