import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator'

export class UpdatePatientProfileDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  phone!: string

  @IsOptional()
  @IsBoolean()
  beneficiariesEnabled?: boolean

  /** ISO country code or country name for where the patient currently lives */
  @IsOptional()
  @IsString()
  @MinLength(2)
  residenceCountryCode?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  residenceCountryName?: string
}
