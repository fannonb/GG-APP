import { IsOptional, IsString, Matches, MinLength } from 'class-validator'

export class UnlockLedgerDto {
  /** When provided, unlock is scoped to this patient (preferred). */
  @IsOptional()
  @IsString()
  @MinLength(1)
  patientId?: string

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin!: string
}
