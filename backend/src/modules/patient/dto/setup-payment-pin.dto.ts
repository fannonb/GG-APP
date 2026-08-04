import { IsOptional, IsString, Length, Matches } from 'class-validator'

export class SetupPaymentPinDto {
  @IsString()
  @Length(4, 4)
  @Matches(/^\d+$/)
  pin!: string

  @IsString()
  @Length(4, 4)
  @Matches(/^\d+$/)
  confirmPin!: string

  @IsOptional()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d+$/)
  currentPin?: string
}
