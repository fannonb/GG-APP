import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength, Matches } from 'class-validator'

export class RegisterPatientDto {
  @IsString()
  @MinLength(1)
  firstName!: string

  @IsString()
  @MinLength(1)
  lastName!: string

  @IsEmail()
  email!: string

  @IsString()
  @IsIn(['KE', 'ZW', 'ZM'])
  country!: 'KE' | 'ZW' | 'ZM'

  @IsString()
  @MinLength(6)
  phone!: string

  @IsDateString()
  dob!: string

  @IsString()
  @MinLength(5)
  nationalId!: string

  /** Required unless googleIdToken is supplied — validated in AuthService.registerPatient. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/)
  @Matches(/[0-9]/)
  password?: string

  /** Google ID token from the pre-registration Google sign-in step. Re-verified server-side. */
  @IsOptional()
  @IsString()
  googleIdToken?: string

  /** Google OAuth client ID used for the sign-in (mobile sends its Android client ID). */
  @IsOptional()
  @IsString()
  googleClientId?: string
}
