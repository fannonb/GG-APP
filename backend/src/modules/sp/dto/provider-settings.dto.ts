import { IsBoolean, IsString, MinLength } from 'class-validator'

export class UpdateProviderNotificationPrefsDto {
  @IsBoolean()
  newAppointmentEmail!: boolean

  @IsBoolean()
  paymentEmail!: boolean

  @IsBoolean()
  invoiceEmail!: boolean

  @IsBoolean()
  disputeEmail!: boolean

  @IsBoolean()
  systemEmail!: boolean
}

export class ChangeProviderPasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string

  @IsString()
  @MinLength(8)
  newPassword!: string
}
