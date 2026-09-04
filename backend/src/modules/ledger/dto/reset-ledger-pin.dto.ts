import { IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator'
import { Type } from 'class-transformer'

export class ResetLedgerPinDto {
  @IsString()
  @MinLength(1, { message: 'Account password is required' })
  password!: string

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin!: string

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  confirmPin!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number
}
