import { IsIn } from 'class-validator'

export class UpdateAppointmentStatusDto {
  @IsIn(['confirmed', 'cancelled'])
  status!: 'confirmed' | 'cancelled'
}
