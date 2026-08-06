import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(1)
  password!: string

  @IsIn(['patient', 'sp', 'admin'])
  role!: 'patient' | 'sp' | 'admin'

  /** Portal token required for admin logins (X-Admin-Portal header value). */
  @IsOptional()
  @IsString()
  portalToken?: string
}
