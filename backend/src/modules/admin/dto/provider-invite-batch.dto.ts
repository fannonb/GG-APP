import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsString, MaxLength } from 'class-validator'

/** Imported applications to send setup links to in one request. The web client sends large selections in chunks. */
export class ProviderInviteBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  ids!: string[]
}
