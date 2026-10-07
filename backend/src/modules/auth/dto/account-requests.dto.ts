import { Type } from 'class-transformer'
import { IsArray, IsEmail, IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator'

export class EmailChangeRequestDto {
  @IsEmail() newEmail!: string
  /** Not needed for Google sign-ups, which have no password of their own. */
  @IsOptional() @IsString() password?: string
  @IsOptional() @IsString() @MaxLength(300) reason?: string
}

class ReplyDocumentDto {
  @IsIn(['logo', 'license', 'supporting', 'invoice_pdf']) kind!: string
  @IsString() @MinLength(1) originalName!: string
  @IsString() @MinLength(1) mimeType!: string
  @IsNumber() sizeBytes!: number
  @IsString() @MinLength(1) displaySize!: string
  @IsString() @MinLength(1) storageKey!: string
}

export class ProviderApplicationReplyDto {
  @IsEmail() email!: string
  @IsString() @MinLength(1) password!: string
  @IsString() @MinLength(3) @MaxLength(2000) message!: string
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ReplyDocumentDto) documents?: ReplyDocumentDto[]
}
