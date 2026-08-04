import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class VisitVitalsDto {
  @IsString()
  @MinLength(1, { message: 'Blood pressure is required' })
  bp!: string

  @IsString()
  @MinLength(1, { message: 'Temperature is required' })
  temp!: string

  @IsString()
  @MinLength(1, { message: 'Glucometer reading is required' })
  glucose!: string

  @IsString()
  @MinLength(1, { message: 'O₂ sats are required' })
  sats!: string
}

export class CreateProviderVisitDto {
  @IsOptional()
  @IsString()
  appointmentId?: string

  @IsOptional()
  @IsString()
  beneficiaryId?: string

  @IsString()
  @MinLength(1)
  patientId!: string

  @IsOptional()
  @IsString()
  diagnosis?: string

  @IsOptional()
  @IsString()
  treatment?: string

  @IsOptional()
  @IsString()
  followUp?: string

  @IsOptional()
  @IsString()
  internalNote?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[]

  @IsObject()
  @ValidateNested()
  @Type(() => VisitVitalsDto)
  vitals!: VisitVitalsDto
}
