import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class AppointmentAttachmentDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsString()
  @IsIn(['pdf', 'image', 'document'])
  type!: 'pdf' | 'image' | 'document'

  @IsString()
  @MinLength(1)
  size!: string

  @IsString()
  @MinLength(1)
  mimeType!: string

  @IsInt()
  @Min(0)
  sizeBytes!: number

  @IsString()
  @MinLength(1)
  storageKey!: string

  @IsOptional()
  @IsString()
  dataUrl?: string
}

export class CreateAppointmentDto {
  @IsInt()
  @Min(1)
  providerId!: number

  @IsString()
  @MinLength(1)
  description!: string

  @IsDateString()
  date!: string

  @IsString()
  @MinLength(1)
  time!: string

  @IsBoolean()
  forSelf!: boolean

  @IsOptional()
  @IsString()
  beneficiaryId?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedServices?: string[]

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentAttachmentDto)
  attachments?: AppointmentAttachmentDto[]
}
