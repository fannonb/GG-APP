import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateNewsArticleDto {
  @IsString()
  @MinLength(1)
  title!: string

  @IsString()
  @MinLength(1)
  source!: string

  @IsString()
  @MinLength(1)
  tag!: string

  @IsString()
  @MinLength(1)
  body!: string

  @IsOptional()
  @IsString()
  url?: string

  @IsDateString()
  date!: string
}

export class UpdateNewsArticleDto {
  @IsString()
  @MinLength(1)
  title!: string

  @IsString()
  @MinLength(1)
  source!: string

  @IsString()
  @MinLength(1)
  tag!: string

  @IsString()
  @MinLength(1)
  body!: string

  @IsOptional()
  @IsString()
  url?: string

  @IsDateString()
  date!: string
}