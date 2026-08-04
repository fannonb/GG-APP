import { IsBoolean } from 'class-validator'

export class SetBeneficiariesEnabledDto {
  @IsBoolean()
  enabled!: boolean
}
