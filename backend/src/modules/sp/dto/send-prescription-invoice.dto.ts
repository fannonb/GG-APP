import { Transform } from 'class-transformer'
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class SendPrescriptionInvoiceDto {
  /** Optional pharmacy-entered invoice number. Blank means the server issues one. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9\-/. ]{0,39}$/, {
    message: 'Invoice numbers use letters, digits, - / . and spaces',
  })
  invoiceNumber?: string
}
