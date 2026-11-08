import { IsIn, IsString, MaxLength } from 'class-validator'

export class ProfilePhotoDto {
  /** Base64 data URL of the image, e.g. `data:image/jpeg;base64,...`. Size is checked again in the service. */
  @IsString()
  @MaxLength(3_000_000)
  dataUrl!: string

  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mimeType!: string
}
