import { IsDateString, IsOptional, IsString, Matches, MinLength } from 'class-validator'

export class RescheduleAppointmentDto {
  @IsDateString()
  date!: string

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  time!: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string
}
