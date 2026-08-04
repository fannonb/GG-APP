import { IsOptional, IsString } from 'class-validator'

export class DeclinePrescriptionRequestDto {
  @IsOptional()
  @IsString()
  reason?: string
}
