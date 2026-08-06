import { Injectable, Logger } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

@Injectable()
export class FieldEncryptionService {
  private readonly logger = new Logger(FieldEncryptionService.name)
  private readonly key: Buffer

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.key = Buffer.from(
      configService.getOrThrow<string>('security.fieldEncryptionKey'),
      'hex',
    )
  }

  encrypt(value: string) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  decrypt(payload: string) {
    const buffer = Buffer.from(payload, 'base64')
    const iv = buffer.subarray(0, 12)
    const tag = buffer.subarray(12, 28)
    const encrypted = buffer.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }

  /**
   * Best-effort decrypt that returns null instead of throwing when the payload
   * cannot be authenticated with the current key (e.g. records written under a
   * previous FIELD_ENCRYPTION_KEY). Callers show a masked/empty value and keep
   * the rest of the response intact; affected records can be repaired by saving
   * the profile again (which re-encrypts with the current key).
   */
  tryDecrypt(payload: string): string | null {
    try {
      return this.decrypt(payload)
    } catch {
      this.logger.warn(
        'Field decryption failed (key mismatch or corrupt payload) — returning null. ' +
          'Saving the record again will re-encrypt it with the current key.',
      )
      return null
    }
  }
}
