import { BENEFICIARY_GENDERS } from '../../../common/constants/health-data'
import { IsDateString, IsIn, IsOptional, IsString, MinLength } from 'class-validator'

export class UpsertBeneficiaryDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsString()
  @MinLength(1)
  relation!: string

  @IsDateString()
  dob!: string

  @IsString()
  @IsIn(['KE', 'ZW', 'ZM'])
  countryCode!: 'KE' | 'ZW' | 'ZM'

  @IsOptional()
  @IsString()
  @MinLength(5)
  nationalId?: string

  @IsOptional()
  @IsIn(BENEFICIARY_GENDERS)
  gender?: (typeof BENEFICIARY_GENDERS)[number]
}
