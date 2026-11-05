import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class NearbyPharmaciesQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number
}

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
  /** Where to search from: the delivery pin, or the patient's location for pickup. */
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  searchLat!: number

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  searchLng!: number

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

  /** Precise delivery address: street plus house / building / unit and a landmark. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryAddress?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  patientNotes?: string

  @ValidateNested()
  @Type(() => PrescriptionAttachmentDto)
  attachment!: PrescriptionAttachmentDto
}
