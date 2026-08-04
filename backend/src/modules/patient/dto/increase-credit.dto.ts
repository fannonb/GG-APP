import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class IncreaseCreditDto {
  @IsNumber()
  @Min(500)
  increaseAmount!: number

  @IsNumber()
  @Min(1)
  monthlyIncome!: number

  @IsString()
  reason!: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsBoolean()
  consent!: boolean
}
