import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class PrescriptionAttachmentDto {
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

export class CreatePrescriptionRequestDto {
  @IsInt()
  @Min(1)
  providerId!: number

  @IsBoolean()
  forSelf!: boolean

  @IsOptional()
  @IsString()
  beneficiaryId?: string

  @IsOptional()
  @IsString()
  sourceAppointmentId?: string

  @IsOptional()
  @IsIn(['pickup', 'delivery'])
  fulfillmentMode?: 'pickup' | 'delivery'

  @IsOptional()
  @IsString()
  deliveryAddress?: string

  @IsOptional()
  @IsString()
  patientNotes?: string

  @ValidateNested()
  @Type(() => PrescriptionAttachmentDto)
  attachment!: PrescriptionAttachmentDto
}
