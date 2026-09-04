import {
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'

export class UpdateProviderProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  about?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsNumber()
  lat?: number

  @IsOptional()
  @IsNumber()
  lng?: number

  @IsOptional()
  @IsNumber()
  establishedYear?: number

  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed'

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  logoUrl?: string

  @IsOptional()
  @IsObject()
  openingHours?: Record<string, { open: boolean; from: string; to: string }>
}
