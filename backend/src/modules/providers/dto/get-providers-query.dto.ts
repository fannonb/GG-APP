import { IsIn, IsOptional, IsString } from 'class-validator'

export class GetProvidersQueryDto {
  /** Patient market country code or name (KE | Kenya | ZW | Zimbabwe | ZM | Zambia) */
  @IsOptional()
  @IsString()
  @IsIn(['KE', 'ZW', 'ZM', 'Kenya', 'Zimbabwe', 'Zambia'])
  country?: string
}
