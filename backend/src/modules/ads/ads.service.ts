import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { AdBannerStatus, Prisma } from '@prisma/client'
import type { AdBanner } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageService } from '../../common/services/storage.service'
import type { AttachmentMetadata } from '../../common/services/storage.service'
import { AD_IMAGE_ERROR } from './dto/ad-banner.dto'
import type { AdStatusInput, CreateAdBannerDto, UpdateAdBannerDto } from './dto/ad-banner.dto'

const AD_IMAGE_MAX_BYTES = 3 * 1024 * 1024
const AD_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const PATIENT_AD_LIMIT = 10
/** Operating markets, by code, as admins name them when targeting ads. */
const MARKET_NAMES: Record<string, string> = { KE: 'Kenya', ZW: 'Zimbabwe', ZM: 'Zambia' }

type ImageSlot = 'desktop' | 'mobile'

export interface AdminAdResponse {
  id: string
  advertiserName: string
  ctaUrl: string
  desktopImageUrl: string
  mobileImageUrl: string
  status: AdStatusInput
  frequency: string
  startDate: string
  expiresAt: string
  countries: string[]
  impressions: number
  clicks: number
  updatedAt: string
}

export interface PatientAdResponse {
  id: string
  ctaUrl: string
  desktopImageUrl: string
  mobileImageUrl: string
  updatedAt: string
}

interface ParsedAdImage {
  slot: ImageSlot
  dataUrl: string
  mimeType: string
  bytes: Buffer
}

interface StoredAdImages {
  desktopImage?: AttachmentMetadata
  mobileImage?: AttachmentMetadata
  /** Storage keys written by this request, so they can be discarded if the save fails. */
  keys: string[]
}

/** Identify the image from its leading bytes; the declared MIME type is never trusted on its own. */
function detectImageMimeType(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (PNG_SIGNATURE.equals(bytes.subarray(0, PNG_SIGNATURE.length))) return 'image/png'
  if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

function parseAdImage(dataUrl: string, slot: ImageSlot): ParsedAdImage {
  const declared = /^data:(image\/(?:jpeg|png|webp));base64,/.exec(dataUrl)?.[1]
  if (!declared) throw new BadRequestException(AD_IMAGE_ERROR)

  const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
  if (bytes.length === 0 || bytes.length > AD_IMAGE_MAX_BYTES || detectImageMimeType(bytes) !== declared) {
    throw new BadRequestException(AD_IMAGE_ERROR)
  }
  return { slot, dataUrl, mimeType: declared, bytes }
}

function isCalendarDate(value: string): boolean {
  const parsed = toDate(value)
  return !Number.isNaN(parsed.getTime()) && toDateOnly(parsed) === value
}

/** Dates are YYYY-MM-DD strings, so lexical order matches calendar order. */
function assertDateRange(startDate: string, expiresAt: string) {
  if (!isCalendarDate(startDate) || !isCalendarDate(expiresAt)) {
    throw new BadRequestException('Dates must use the YYYY-MM-DD format')
  }
  if (expiresAt < startDate) {
    throw new BadRequestException('Expiry date must be on or after the start date')
  }
}

function assertActivationHasImage(status: AdStatusInput, hasImage: boolean) {
  if (status === 'active' && !hasImage) {
    throw new BadRequestException('Add an image before activating this ad')
  }
}

function normalizeCountries(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(value => value.length > 0))]
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function toDbStatus(status: AdStatusInput): AdBannerStatus {
  return status.toUpperCase() as AdBannerStatus
}

function fromDbStatus(status: AdBannerStatus): AdStatusInput {
  return status.toLowerCase() as AdStatusInput
}

function asAttachment(value: Prisma.JsonValue | null): AttachmentMetadata | null {
  return value as unknown as AttachmentMetadata | null
}

function storageKeyOf(value: Prisma.JsonValue | null): string | null {
  return asAttachment(value)?.storageKey ?? null
}

/** Image metadata lives in a Json column; a missing image is stored as SQL NULL. */
function toImageColumn(meta: AttachmentMetadata | null | undefined) {
  return meta ? (meta as unknown as Prisma.InputJsonValue) : Prisma.DbNull
}

@Injectable()
export class AdsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async listAds(): Promise<AdminAdResponse[]> {
    const ads = await this.prisma.adBanner.findMany({ orderBy: { updatedAt: 'desc' } })
    return Promise.all(ads.map(ad => this.toAdminAd(ad)))
  }

  async createAd(actorUserId: string, dto: CreateAdBannerDto): Promise<AdminAdResponse> {
    assertDateRange(dto.startDate, dto.expiresAt)
    const desktop = dto.desktopImageDataUrl ? parseAdImage(dto.desktopImageDataUrl, 'desktop') : null
    const mobile = dto.mobileImageDataUrl ? parseAdImage(dto.mobileImageDataUrl, 'mobile') : null
    assertActivationHasImage(dto.status, desktop !== null || mobile !== null)

    const images = await this.storeImages(desktop, mobile)

    const ad = await this.prisma
      .$transaction(async tx => {
        const created = await tx.adBanner.create({
          data: {
            advertiserName: dto.advertiserName,
            ctaUrl: dto.ctaUrl,
            status: toDbStatus(dto.status),
            frequency: dto.frequency,
            startDate: toDate(dto.startDate),
            expiresAt: toDate(dto.expiresAt),
            countries: normalizeCountries(dto.countries),
            desktopImage: toImageColumn(images.desktopImage),
            mobileImage: toImageColumn(images.mobileImage),
          },
        })
        await tx.auditLog.create({
          data: {
            actorUserId,
            action: 'admin.ad.created',
            entityType: 'AdBanner',
            entityId: created.id,
            metadata: {
              status: dto.status,
              frequency: dto.frequency,
              hasDesktopImage: desktop !== null,
              hasMobileImage: mobile !== null,
            } as Prisma.JsonObject,
          },
        })
        return created
      })
      .catch(error => this.storage.discardOnFailure(images.keys, error))

    return this.toAdminAd(ad)
  }

  async updateAd(actorUserId: string, adId: string, dto: UpdateAdBannerDto): Promise<AdminAdResponse> {
    const existing = await this.findAdOrThrow(adId)

    if (dto.desktopImageDataUrl && dto.removeDesktopImage) {
      throw new BadRequestException('Upload a new image or remove it, not both')
    }
    if (dto.mobileImageDataUrl && dto.removeMobileImage) {
      throw new BadRequestException('Upload a new image or remove it, not both')
    }

    const startDate = dto.startDate ?? toDateOnly(existing.startDate)
    const expiresAt = dto.expiresAt ?? toDateOnly(existing.expiresAt)
    assertDateRange(startDate, expiresAt)

    const desktop = dto.desktopImageDataUrl ? parseAdImage(dto.desktopImageDataUrl, 'desktop') : null
    const mobile = dto.mobileImageDataUrl ? parseAdImage(dto.mobileImageDataUrl, 'mobile') : null
    const removesDesktop = desktop === null && dto.removeDesktopImage === true
    const removesMobile = mobile === null && dto.removeMobileImage === true

    const status = dto.status ?? fromDbStatus(existing.status)
    const hasDesktop = desktop !== null || (existing.desktopImage !== null && !removesDesktop)
    const hasMobile = mobile !== null || (existing.mobileImage !== null && !removesMobile)
    assertActivationHasImage(status, hasDesktop || hasMobile)

    const images = await this.storeImages(desktop, mobile)

    const data: Prisma.AdBannerUpdateInput = {
      advertiserName: dto.advertiserName ?? existing.advertiserName,
      ctaUrl: dto.ctaUrl ?? existing.ctaUrl,
      status: toDbStatus(status),
      frequency: dto.frequency ?? existing.frequency,
      startDate: toDate(startDate),
      expiresAt: toDate(expiresAt),
      countries: dto.countries !== undefined ? normalizeCountries(dto.countries) : existing.countries,
    }
    if (desktop !== null || removesDesktop) {
      data.desktopImage = toImageColumn(images.desktopImage)
    }
    if (mobile !== null || removesMobile) {
      data.mobileImage = toImageColumn(images.mobileImage)
    }

    const updated = await this.prisma
      .$transaction(async tx => {
        const row = await tx.adBanner.update({ where: { id: existing.id }, data })
        await tx.auditLog.create({
          data: {
            actorUserId,
            action: 'admin.ad.updated',
            entityType: 'AdBanner',
            entityId: existing.id,
            metadata: {
              status,
              desktopImageChanged: desktop !== null || removesDesktop,
              mobileImageChanged: mobile !== null || removesMobile,
            } as Prisma.JsonObject,
          },
        })
        return row
      })
      .catch(error => this.storage.discardOnFailure(images.keys, error))

    // The replaced or removed files are no longer referenced. deleteObject logs and ignores its own failures.
    await this.deleteObjects([
      desktop !== null || removesDesktop ? storageKeyOf(existing.desktopImage) : null,
      mobile !== null || removesMobile ? storageKeyOf(existing.mobileImage) : null,
    ])

    return this.toAdminAd(updated)
  }

  async deleteAd(actorUserId: string, adId: string): Promise<{ success: boolean }> {
    const existing = await this.findAdOrThrow(adId)

    await this.prisma.$transaction([
      this.prisma.adBanner.delete({ where: { id: existing.id } }),
      this.prisma.auditLog.create({
        data: {
          actorUserId,
          action: 'admin.ad.deleted',
          entityType: 'AdBanner',
          entityId: existing.id,
          metadata: {
            advertiserName: existing.advertiserName,
            status: fromDbStatus(existing.status),
          } as Prisma.JsonObject,
        },
      }),
    ])

    await this.deleteObjects([storageKeyOf(existing.desktopImage), storageKeyOf(existing.mobileImage)])
    return { success: true }
  }

  // ---------------------------------------------------------------------------
  // Patient
  // ---------------------------------------------------------------------------

  async listPatientAds(userId: string): Promise<PatientAdResponse[]> {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      select: { countryCode: true, user: { select: { country: true } } },
    })
    if (!profile) return []

    // Admins target by country name ("Kenya"). Match the stored name, the market code ("KE")
    // and the market's name, so a patient without a stored country name still matches.
    const patientCountries = new Set(
      [profile.user.country, profile.countryCode, MARKET_NAMES[profile.countryCode?.toUpperCase() ?? '']]
        .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        .map(value => value.trim().toLowerCase()),
    )
    const today = toDate(toDateOnly(new Date()))

    const candidates = await this.prisma.adBanner.findMany({
      where: {
        status: AdBannerStatus.ACTIVE,
        startDate: { lte: today },
        expiresAt: { gte: today },
        OR: [{ desktopImage: { not: Prisma.DbNull } }, { mobileImage: { not: Prisma.DbNull } }],
      },
      orderBy: { updatedAt: 'desc' },
    })

    const inCountry = candidates.filter(
      ad => ad.countries.length === 0 || ad.countries.some(name => patientCountries.has(name.trim().toLowerCase())),
    )
    const ads = await Promise.all(inCountry.map(ad => this.toPatientAd(ad)))
    return ads.filter(ad => ad.desktopImageUrl !== '' || ad.mobileImageUrl !== '').slice(0, PATIENT_AD_LIMIT)
  }

  recordImpression(adId: string) {
    return this.incrementActiveAd(adId, { impressions: { increment: 1 } })
  }

  recordClick(adId: string) {
    return this.incrementActiveAd(adId, { clicks: { increment: 1 } })
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Atomic counter bump. The status filter lives in the same UPDATE, so inactive or missing ads hit P2025. */
  private async incrementActiveAd(adId: string, data: Prisma.AdBannerUpdateInput): Promise<{ success: boolean }> {
    try {
      await this.prisma.adBanner.update({
        where: { id: adId, status: AdBannerStatus.ACTIVE },
        data,
        select: { id: true },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Ad not found')
      }
      throw error
    }
    return { success: true }
  }

  private async findAdOrThrow(adId: string): Promise<AdBanner> {
    const ad = await this.prisma.adBanner.findUnique({ where: { id: adId } })
    if (!ad) throw new NotFoundException('Ad not found')
    return ad
  }

  /** Stores the uploaded images. Files already written by this request are discarded if a later one fails. */
  private async storeImages(desktop: ParsedAdImage | null, mobile: ParsedAdImage | null): Promise<StoredAdImages> {
    const keys: string[] = []
    try {
      const desktopImage = desktop ? await this.storeImage(desktop, keys) : undefined
      const mobileImage = mobile ? await this.storeImage(mobile, keys) : undefined
      return { desktopImage, mobileImage, keys }
    } catch (error) {
      return this.storage.discardOnFailure(keys, error)
    }
  }

  private async storeImage(image: ParsedAdImage, keys: string[]): Promise<AttachmentMetadata> {
    const stored = await this.storage.storeAttachment({
      dataUrl: image.dataUrl,
      originalName: `${image.slot}.${AD_IMAGE_EXTENSIONS[image.mimeType]}`,
      mimeType: image.mimeType,
      sizeBytes: image.bytes.length,
      displaySize: `${Math.max(1, Math.round(image.bytes.length / 1024))} KB`,
      prefix: 'ads',
    })
    if (stored.storageKey) keys.push(stored.storageKey)
    return stored
  }

  private async deleteObjects(keys: Array<string | null>) {
    await Promise.all(
      keys.filter((key): key is string => !!key).map(key => this.storage.deleteObject(key)),
    )
  }

  /** Resolved, downloadable URL for a stored image. Raw storage keys are never returned. */
  private async resolveImageUrl(value: Prisma.JsonValue | null): Promise<string> {
    const resolved = await this.storage.resolveAttachmentUrl(asAttachment(value), 'ad-image')
    return resolved?.url ?? ''
  }

  private async toAdminAd(ad: AdBanner): Promise<AdminAdResponse> {
    const [desktopImageUrl, mobileImageUrl] = await Promise.all([
      this.resolveImageUrl(ad.desktopImage),
      this.resolveImageUrl(ad.mobileImage),
    ])
    return {
      id: ad.id,
      advertiserName: ad.advertiserName,
      ctaUrl: ad.ctaUrl,
      desktopImageUrl,
      mobileImageUrl,
      status: fromDbStatus(ad.status),
      frequency: ad.frequency,
      startDate: toDateOnly(ad.startDate),
      expiresAt: toDateOnly(ad.expiresAt),
      countries: ad.countries,
      impressions: ad.impressions,
      clicks: ad.clicks,
      updatedAt: ad.updatedAt.toISOString(),
    }
  }

  /** Patient view: no advertiser name, counters, or status. */
  private async toPatientAd(ad: AdBanner): Promise<PatientAdResponse> {
    const [desktopImageUrl, mobileImageUrl] = await Promise.all([
      this.resolveImageUrl(ad.desktopImage),
      this.resolveImageUrl(ad.mobileImage),
    ])
    return {
      id: ad.id,
      ctaUrl: ad.ctaUrl,
      desktopImageUrl,
      mobileImageUrl,
      updatedAt: ad.updatedAt.toISOString(),
    }
  }
}
