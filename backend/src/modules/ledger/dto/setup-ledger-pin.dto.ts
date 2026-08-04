import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class SetupLedgerPinDto {
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin!: string

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  confirmPin!: string

  @IsOptional()
  @IsString()
  currentPin?: string

  /** Optional PIN lifetime in days (1–365). Omit for no expiry. Pass null-equivalent by omitting. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number
}
