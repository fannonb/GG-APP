import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FieldEncryptionService } from './services/field-encryption.service'
import { ReferenceService } from './services/reference.service'
import { MailService } from './services/mail.service'
import { StorageService } from './services/storage.service'
import { ProviderCredentialsService } from './services/provider-credentials.service'
import { PrescriptionDispatchService } from './services/prescription-dispatch.service'
import { PrescriptionInvoiceService } from './services/prescription-invoice.service'
import { InvoiceCodeService } from './services/invoice-code.service'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FieldEncryptionService, ReferenceService, MailService, StorageService, ProviderCredentialsService, PrescriptionDispatchService, PrescriptionInvoiceService, InvoiceCodeService],
  exports: [FieldEncryptionService, ReferenceService, MailService, StorageService, ProviderCredentialsService, PrescriptionDispatchService, PrescriptionInvoiceService, InvoiceCodeService],
})
export class CommonModule {}
