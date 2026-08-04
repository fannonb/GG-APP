import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class GetAdminPaymentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 20, 50])
  limit?: number

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  @IsIn(['all', 'Kenya', 'Zimbabwe', 'Zambia'])
  country?: string
}
