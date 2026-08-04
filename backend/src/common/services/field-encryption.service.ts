import { Injectable } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

@Injectable()
export class FieldEncryptionService {
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
}
