import { IsObject, IsOptional, IsString } from 'class-validator'

export class PushSubscribeDto {
  @IsOptional()
  @IsString()
  endpoint?: string

  @IsOptional()
  @IsString()
  expirationTime?: string | null

  @IsOptional()
  @IsObject()
  keys?: Record<string, string>

  @IsOptional()
  @IsString()
  provider?: string

  @IsOptional()
  @IsString()
  token?: string
}

export class PushUnsubscribeDto {
  @IsOptional()
  @IsString()
  endpoint?: string

  @IsOptional()
  @IsString()
  token?: string
}
