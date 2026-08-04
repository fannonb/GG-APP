import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class QuotedItemDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsOptional()
  @IsString()
  quantity?: string

  @IsNumber()
  @Min(0)
  unitPrice!: number

  @IsOptional()
  @IsString()
  availability?: string

  @IsOptional()
  @IsString()
  substitute?: string
}

export class QuotePrescriptionRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotedItemDto)
  items!: QuotedItemDto[]

  @IsNumber()
  @Min(0)
  amount!: number

  /** Required for delivery orders (validated in service). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number

  @IsOptional()
  @IsString()
  pharmacyNotes?: string
}

export class UpdatePrescriptionRequestStatusDto {
  @IsOptional()
  @IsString()
  pharmacyNotes?: string
}
