import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FieldEncryptionService } from './services/field-encryption.service'
import { ReferenceService } from './services/reference.service'
import { MailService } from './services/mail.service'
import { StorageService } from './services/storage.service'
import { ProviderCredentialsService } from './services/provider-credentials.service'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FieldEncryptionService, ReferenceService, MailService, StorageService, ProviderCredentialsService],
  exports: [FieldEncryptionService, ReferenceService, MailService, StorageService, ProviderCredentialsService],
})
export class CommonModule {}
