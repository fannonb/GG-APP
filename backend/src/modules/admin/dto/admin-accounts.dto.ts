import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { ProviderPayoutMethod } from '@prisma/client'

const COUNTRY_CODES = ['KE', 'ZW', 'ZM']
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say', '']

export class UpdateAdminPatientDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) firstName?: string
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) lastName?: string
  @IsOptional() @IsString() @MaxLength(30) phone?: string
  @IsOptional() @IsIn(COUNTRY_CODES) countryCode?: string
  @IsOptional() @IsDateString() dateOfBirth?: string
  @IsOptional() @IsIn(GENDERS) gender?: string
  /** Why the admin made the change; kept in the account history. */
  @IsOptional() @IsString() @MaxLength(300) reason?: string
}

export class AdminPayoutDto {
  @IsIn(Object.values(ProviderPayoutMethod)) method!: ProviderPayoutMethod
  @IsString() @MinLength(2) @MaxLength(120) accountName!: string
  @IsString() @MinLength(4) @MaxLength(40) accountNumber!: string
}

export class UpdateAdminProviderDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string
  @IsOptional() @IsArray() @IsString({ each: true }) categories?: string[]
  @IsOptional() @IsString() @MaxLength(30) phone?: string
  @IsOptional() @IsString() @MaxLength(240) address?: string
  @IsOptional() @IsString() @MaxLength(80) license?: string
  @IsOptional() @IsIn(COUNTRY_CODES) country?: string
  @IsOptional() @IsString() @MaxLength(2000) about?: string
  @IsOptional() @IsString() @MaxLength(240) hours?: string
  @IsOptional() @IsIn(['open', 'closed']) openStatus?: 'open' | 'closed'
  @IsOptional() @ValidateNested() @Type(() => AdminPayoutDto) payout?: AdminPayoutDto
  @IsOptional() @IsString() @MaxLength(300) reason?: string
}

export class AdminReasonDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string
}

export class AdminCreditLimitDto {
  @Type(() => Number) @IsNumber() @Min(0) limit!: number
  @IsString() @MinLength(3) @MaxLength(300) reason!: string
}

export class AdminDecisionDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string
}

export class RecordPayoutDto {
  @IsArray() @IsString({ each: true }) invoiceIds!: string[]
  @IsString() @MinLength(3) @MaxLength(80) reference!: string
  @IsOptional() @IsDateString() paidAt?: string
  @IsOptional() @IsString() @MaxLength(300) note?: string
}
