import { IsString, MinLength } from 'class-validator'

export class RejectPrescriptionRequestDto {
  @IsString()
  @MinLength(3, { message: 'Please provide a rejection reason (at least 3 characters)' })
  reason!: string
}
