import { IsOptional, IsString, MinLength } from 'class-validator'

export class CancelAppointmentDto {
  @IsString()
  @MinLength(1)
  reason!: string

  @IsOptional()
  @IsString()
  note?: string
}
