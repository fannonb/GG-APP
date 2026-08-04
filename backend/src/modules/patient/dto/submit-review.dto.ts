import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator'

export class SubmitReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  providerId!: number

  @IsString()
  @MinLength(1)
  invoiceId!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number

  @IsOptional()
  @IsString()
  text?: string
}
