import {
  Allow,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class InvoiceLineItemDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsNumber()
  @Min(0)
  amount!: number
}

class InvoiceAttachmentDto {
  @IsString()
  @MinLength(1)
  originalName!: string

  @IsString()
  @MinLength(1)
  mimeType!: string

  @IsNumber()
  @Min(0)
  sizeBytes!: number

  @IsString()
  @MinLength(1)
  displaySize!: string

  @IsString()
  @MinLength(1)
  storageKey!: string

  @Allow()
  @IsOptional()
  @IsString()
  dataUrl?: string
}

export class UpsertInvoiceDto {
  @IsOptional()
  @IsString()
  appointmentId?: string

  @IsOptional()
  @IsString()
  prescriptionRequestId?: string

  @IsString()
  @MinLength(1)
  invoiceNumber!: string

  @IsArray()
  @IsString({ each: true })
  services!: string[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems?: InvoiceLineItemDto[]

  @IsNumber()
  @Min(0)
  amount!: number

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InvoiceAttachmentDto)
  attachment?: InvoiceAttachmentDto

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
}
