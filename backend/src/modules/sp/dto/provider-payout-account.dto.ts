import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator'

export class UpsertProviderPayoutAccountDto {
  @IsIn(['mpesa', 'bank', 'mobile_money'])
  method!: 'mpesa' | 'bank' | 'mobile_money'

  @IsString()
  @MinLength(1)
  accountNumber!: string

  @IsString()
  @MinLength(1)
  accountName!: string

  @IsString()
  @MinLength(1)
  country!: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}
