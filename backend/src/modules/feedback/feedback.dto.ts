import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class SubmitAppFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string

  /** Where the rating was asked, e.g. after paying an invoice. */
  @IsIn(['payment'])
  context!: 'payment'

  @IsOptional()
  @IsIn(['web', 'mobile'])
  platform?: 'web' | 'mobile'
}
