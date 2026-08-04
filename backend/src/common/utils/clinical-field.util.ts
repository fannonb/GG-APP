import type { FieldEncryptionService } from '../services/field-encryption.service'

/**
 * Encrypt optional clinical free-text for at-rest storage.
 * Empty / null values stay null. Compatible with FieldEncryptionService AES-256-GCM.
 */
export function encryptClinicalField(
  encryption: FieldEncryptionService,
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  return encryption.encrypt(trimmed)
}

/**
 * Decrypt a clinical field. Falls back to the raw value when it is still
 * plaintext (pre-encryption rows) or when decryption fails.
 */
export function decryptClinicalField(
  encryption: FieldEncryptionService,
  value: string | null | undefined,
): string | null {
  if (value == null || value === '') {
    return null
  }
  try {
    return encryption.decrypt(value)
  } catch {
    return value
  }
}
