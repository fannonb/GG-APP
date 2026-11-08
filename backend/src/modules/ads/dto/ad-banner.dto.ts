import { Transform } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export const AD_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'expired'] as const
export const AD_FREQUENCIES = ['always', 'every_other', 'every_third'] as const
export type AdStatusInput = (typeof AD_STATUSES)[number]
export type AdFrequencyInput = (typeof AD_FREQUENCIES)[number]

export const AD_IMAGE_ERROR = 'Ad images must be JPEG, PNG or WebP under 3 MB'
const AD_IMAGE_DATA_URL_MAX_LENGTH = 4_500_000
const AD_IMAGE_DATA_URL_PATTERN = /^data:image\/(jpeg|png|webp);base64,/
const AD_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const AD_DATE_MESSAGE = 'Dates must use the YYYY-MM-DD format'
const AD_LINK_PATTERN = /^(https:\/\/|\/app\/)/
const AD_LINK_MESSAGE = 'Link must start with https:// or /app/'

/** Trims surrounding whitespace before validation runs. Non-string values pass through untouched. */
const trimmed = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))

export class CreateAdBannerDto {
  @trimmed()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  advertiserName!: string

  @trimmed()
  @IsString()
  @MaxLength(500)
  @Matches(AD_LINK_PATTERN, { message: AD_LINK_MESSAGE })
  ctaUrl!: string

  @IsIn(AD_STATUSES)
  status!: AdStatusInput

  @IsIn(AD_FREQUENCIES)
  frequency!: AdFrequencyInput

  @IsString()
  @Matches(AD_DATE_PATTERN, { message: AD_DATE_MESSAGE })
  startDate!: string

  @IsString()
  @Matches(AD_DATE_PATTERN, { message: AD_DATE_MESSAGE })
  expiresAt!: string

  /** Country names the ad is shown in. Empty means every country. */
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  countries!: string[]

  /** Base64 data URL, e.g. `data:image/jpeg;base64,...`. Type and size are checked again in the service. */
  @IsOptional()
  @IsString()
  @MaxLength(AD_IMAGE_DATA_URL_MAX_LENGTH, { message: AD_IMAGE_ERROR })
  @Matches(AD_IMAGE_DATA_URL_PATTERN, { message: AD_IMAGE_ERROR })
  desktopImageDataUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(AD_IMAGE_DATA_URL_MAX_LENGTH, { message: AD_IMAGE_ERROR })
  @Matches(AD_IMAGE_DATA_URL_PATTERN, { message: AD_IMAGE_ERROR })
  mobileImageDataUrl?: string
}

export class UpdateAdBannerDto {
  @IsOptional()
  @trimmed()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  advertiserName?: string

  @IsOptional()
  @trimmed()
  @IsString()
  @MaxLength(500)
  @Matches(AD_LINK_PATTERN, { message: AD_LINK_MESSAGE })
  ctaUrl?: string

  @IsOptional()
  @IsIn(AD_STATUSES)
  status?: AdStatusInput

  @IsOptional()
  @IsIn(AD_FREQUENCIES)
  frequency?: AdFrequencyInput

  @IsOptional()
  @IsString()
  @Matches(AD_DATE_PATTERN, { message: AD_DATE_MESSAGE })
  startDate?: string

  @IsOptional()
  @IsString()
  @Matches(AD_DATE_PATTERN, { message: AD_DATE_MESSAGE })
  expiresAt?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  countries?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(AD_IMAGE_DATA_URL_MAX_LENGTH, { message: AD_IMAGE_ERROR })
  @Matches(AD_IMAGE_DATA_URL_PATTERN, { message: AD_IMAGE_ERROR })
  desktopImageDataUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(AD_IMAGE_DATA_URL_MAX_LENGTH, { message: AD_IMAGE_ERROR })
  @Matches(AD_IMAGE_DATA_URL_PATTERN, { message: AD_IMAGE_ERROR })
  mobileImageDataUrl?: string

  @IsOptional()
  @IsBoolean()
  removeDesktopImage?: boolean

  @IsOptional()
  @IsBoolean()
  removeMobileImage?: boolean
}
