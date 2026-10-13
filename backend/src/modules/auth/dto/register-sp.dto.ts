import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  CREDENTIAL_FILE_MAX_BYTES,
  CREDENTIAL_FILE_TYPES,
  CREDENTIAL_NUMBER_PATTERN,
} from '../../../common/constants/credentials'

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

class CredentialDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  originalName!: string

  @IsIn(CREDENTIAL_FILE_TYPES)
  mimeType!: string

  @IsNumber()
  @Min(1)
  @Max(CREDENTIAL_FILE_MAX_BYTES)
  sizeBytes!: number

  @IsString()
  @Matches(/^data:(application\/pdf|image\/jpeg|image\/png);base64,/, { message: 'Upload a PDF, JPG or PNG file' })
  @MaxLength(7_500_000)
  dataUrl!: string
}

export class ProviderCredentialDto {
  @IsString()
  @MaxLength(40)
  kind!: string

  @IsString()
  @Matches(CREDENTIAL_NUMBER_PATTERN, { message: 'Licence numbers use letters, digits, / . - and spaces (2 to 40 characters)' })
  number!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  holderName?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => CredentialDocumentDto)
  document?: CredentialDocumentDto
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

  /** Older clients send one number; current clients send `credentials` and the API fills this in. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  licenseNumber?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProviderCredentialDto)
  credentials?: ProviderCredentialDto[]

  @IsOptional()
  @IsString()
  @MaxLength(60)
  businessRegNumber?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  taxPin?: string

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProviderDocumentMetadataDto)
  documents?: ProviderDocumentMetadataDto[]
}

export type RegisterSpDocumentDto = ProviderDocumentMetadataDto
