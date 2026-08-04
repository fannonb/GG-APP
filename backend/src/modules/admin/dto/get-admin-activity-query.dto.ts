import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class GetAdminActivityQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['all', 'Kenya', 'Zimbabwe', 'Zambia'])
  country?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number
}
