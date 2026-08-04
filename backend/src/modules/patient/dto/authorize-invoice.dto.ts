import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator'

export class AuthorizeInvoiceDto {
  @IsString()
  @Length(4, 4)
  @Matches(/^\d+$/)
  pin!: string

  /** Confirmation round 1–3 of the same payment PIN */
  @IsInt()
  @Min(1)
  @Max(3)
  step!: number
}
