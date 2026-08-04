import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

const OPERATING_COUNTRY_CODES = ['KE', 'ZW', 'ZM'] as const

export class ApplyCreditBeneficiaryDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsString()
  @MinLength(1)
  relation!: string

  @IsDateString()
  dob!: string

  @IsString()
  @IsIn(OPERATING_COUNTRY_CODES)
  countryCode!: 'KE' | 'ZW' | 'ZM'

  @IsOptional()
  @IsString()
  @MinLength(5)
  nationalId?: string
}

export class ApplyCreditDto {
  @IsString()
  @IsIn(['moneymart', 'equity'])
  financePartnerId!: string

  @IsString()
  employment!: string

  @IsNumber()
  @Min(1)
  monthlyIncome!: number

  @IsNumber()
  @Min(100)
  requestedAmount!: number

  @IsBoolean()
  consent!: boolean

  /** ISO country code for where the patient currently lives (KE/ZW/ZM or any other) */
  @IsString()
  @MinLength(2)
  residenceCountryCode!: string

  /** Country display name (especially useful for non-operating markets) */
  @IsOptional()
  @IsString()
  @MinLength(2)
  residenceCountryName?: string

  @IsString()
  @IsIn(['self', 'self_and_beneficiaries'])
  coverageType!: 'self' | 'self_and_beneficiaries'

  @ValidateIf(dto => dto.coverageType === 'self_and_beneficiaries')
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ApplyCreditBeneficiaryDto)
  beneficiaries?: ApplyCreditBeneficiaryDto[]
}
