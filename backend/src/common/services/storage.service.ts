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
  /** Legacy field: base64 data URL embedded in PostgreSQL (storage disabled). */
  dataUrl?: string
}

export interface StoreAttachmentInput {
  dataUrl?: string
  originalName?: string
  mimeType?: string
  sizeBytes?: number
  displaySize?: string
  prefix: 'invoices' | 'prescriptions' | 'provider-documents'
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
        forcePathStyle: true,
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
