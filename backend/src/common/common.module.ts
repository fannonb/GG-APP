import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FieldEncryptionService } from './services/field-encryption.service'
import { ReferenceService } from './services/reference.service'
import { StorageService } from './services/storage.service'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FieldEncryptionService, ReferenceService, StorageService],
  exports: [FieldEncryptionService, ReferenceService, StorageService],
})
export class CommonModule {}
