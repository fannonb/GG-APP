import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(1)
  password!: string

  @IsIn(['patient', 'sp', 'admin'])
  role!: 'patient' | 'sp' | 'admin'

  /** No longer used: admin sign-in is email + password. Accepted and ignored so older clients still work. */
  @IsOptional()
  @IsString()
  portalToken?: string
}
