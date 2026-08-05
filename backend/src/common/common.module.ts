import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FieldEncryptionService } from './services/field-encryption.service'
import { ReferenceService } from './services/reference.service'
import { MailService } from './services/mail.service'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FieldEncryptionService, ReferenceService, MailService],
  exports: [FieldEncryptionService, ReferenceService, MailService],
})
export class CommonModule {}
