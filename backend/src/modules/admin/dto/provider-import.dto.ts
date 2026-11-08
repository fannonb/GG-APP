import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator'

/** Send exactly one of `csv` (template or Outscraper CSV text) or `fileBase64` (an .xlsx file, no data: prefix). */
export class ProviderImportDto {
  @IsOptional()
  @IsString()
  @MaxLength(5_000_000)
  csv?: string

  @IsOptional()
  @IsString()
  @MaxLength(20_000_000)
  fileBase64?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fileName?: string

  @IsOptional()
  @IsBoolean()
  commit?: boolean
}

export class ImportProviderLeadDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsEmail()
  emailSecondary?: string
}
