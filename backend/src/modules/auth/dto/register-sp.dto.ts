import {
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class ProviderDocumentMetadataDto {
  @IsIn(['logo', 'license', 'supporting', 'invoice_pdf'])
  kind!: 'logo' | 'license' | 'supporting' | 'invoice_pdf'

  @IsString()
  @MinLength(1)
  originalName!: string

  @IsString()
  @MinLength(1)
  mimeType!: string

  @IsNumber()
  sizeBytes!: number

  @IsString()
  @MinLength(1)
  displaySize!: string

  @IsString()
  @MinLength(1)
  storageKey!: string
}

class OpeningHoursEntryDto {
  @IsIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  day!: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

  @IsString()
  status!: 'open' | 'closed'

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}

class ProviderLocationDto {
  @IsOptional()
  @IsString()
  label?: string

  @IsString()
  @MinLength(1)
  address!: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsNumber()
  lat?: number

  @IsOptional()
  @IsNumber()
  lng?: number
}

class ProviderPayoutMethodDto {
  @IsIn(['mpesa', 'bank', 'mobile_money'])
  method!: 'mpesa' | 'bank' | 'mobile_money'

  @IsOptional()
  @IsString()
  summary?: string

  @IsOptional()
  @IsString()
  accountNumber?: string

  @IsOptional()
  @IsString()
  accountName?: string

  @IsOptional()
  @IsString()
  bankName?: string

  @IsOptional()
  @IsString()
  bankBranch?: string
}

export class RegisterSpDto {
  @IsString()
  @MinLength(1)
  practiceName!: string

  @IsEmail()
  email!: string

  @IsOptional()
  @IsEmail()
  emailSecondary?: string

  @IsString()
  @MinLength(1)
  phone!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsString()
  @MinLength(1)
  country!: string

  @IsArray()
  @IsString({ each: true })
  serviceTypes!: string[]

  @IsString()
  @MinLength(1)
  licenseNumber!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningHoursEntryDto)
  hours!: OpeningHoursEntryDto[]

  @ValidateNested()
  @Type(() => ProviderLocationDto)
  location!: ProviderLocationDto

  @ValidateNested()
  @Type(() => ProviderPayoutMethodDto)
  payoutMethod!: ProviderPayoutMethodDto

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderDocumentMetadataDto)
  documents!: ProviderDocumentMetadataDto[]
}

export type RegisterSpDocumentDto = ProviderDocumentMetadataDto
