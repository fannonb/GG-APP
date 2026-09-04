import { IsOptional, IsString, MinLength } from 'class-validator'

export class LogoutDto {
  /** Web clients in cookie mode omit this — the refresh token arrives in the
   * httpOnly cookie instead. Native clients always send it in the body. */
  @IsOptional()
  @IsString()
  @MinLength(10)
  refreshToken?: string
}
