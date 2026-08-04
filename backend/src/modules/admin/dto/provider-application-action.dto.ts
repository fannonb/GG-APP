import { IsOptional, IsString } from 'class-validator'

export class ProviderApplicationActionDto {
  @IsOptional()
  @IsString()
  note?: string
}
