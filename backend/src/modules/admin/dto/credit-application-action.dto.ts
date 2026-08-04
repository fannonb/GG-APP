import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreditApplicationActionDto {
  @IsOptional()
  @IsString()
  note?: string

  @IsOptional()
  @IsNumber()
  @Min(100)
  approvedAmount?: number
}
