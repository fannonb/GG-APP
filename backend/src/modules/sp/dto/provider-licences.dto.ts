import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { ProviderCredentialDto } from '../../auth/dto/register-sp.dto'

export class UpdateProviderLicencesDto {
  @IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => ProviderCredentialDto)
  credentials!: ProviderCredentialDto[]

  @IsOptional() @IsString() @MaxLength(60)
  businessRegNumber?: string

  @IsOptional() @IsString() @MaxLength(40)
  taxPin?: string
}
