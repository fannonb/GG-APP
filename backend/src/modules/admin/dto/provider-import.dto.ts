import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class ProviderImportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1_000_000)
  csv!: string

  @IsOptional()
  @IsBoolean()
  commit?: boolean
}
