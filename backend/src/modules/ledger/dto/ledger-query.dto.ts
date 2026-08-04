import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class GetLedgerQueryDto {
  @IsOptional()
  @IsString()
  beneficiaryId?: string
}

export class GetAdminLedgerAccessQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50

  @IsOptional()
  @IsString()
  patientUserId?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  providerId?: number
}
