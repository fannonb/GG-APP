import { IsOptional, IsString, MinLength } from 'class-validator'

export class GoogleAuthDto {
  @IsString()
  @MinLength(1)
  code!: string

  @IsString()
  @MinLength(1)
  redirectUri!: string

  /** PKCE verifier used to generate the code_challenge in the authorization request. */
  @IsOptional()
  @IsString()
  codeVerifier?: string

  /** Google OAuth client ID used for the request (mobile sends its Android client ID). */
  @IsOptional()
  @IsString()
  clientId?: string
}
