import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FieldEncryptionService } from './services/field-encryption.service'
import { ReferenceService } from './services/reference.service'

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FieldEncryptionService, ReferenceService],
  exports: [FieldEncryptionService, ReferenceService],
})
export class CommonModule {}
