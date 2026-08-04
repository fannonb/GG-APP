import type { Prisma } from '@prisma/client'

export interface InvoiceAttachmentMetadata {
  originalName?: string
  mimeType?: string
  sizeBytes?: number
  displaySize?: string
  storageKey?: string
  dataUrl?: string
}

export function parseInvoiceAttachmentMetadata(
  attachmentMetadata: Prisma.JsonValue | null | undefined,
): InvoiceAttachmentMetadata | null {
  if (
    !attachmentMetadata ||
    typeof attachmentMetadata !== 'object' ||
    Array.isArray(attachmentMetadata)
  ) {
    return null
  }

  return attachmentMetadata as InvoiceAttachmentMetadata
}

export function getInvoiceAttachmentDataUrl(
  attachment: string | null | undefined,
  attachmentMetadata: Prisma.JsonValue | null | undefined,
) {
  const metadata = parseInvoiceAttachmentMetadata(attachmentMetadata)
  const dataUrl = metadata?.dataUrl

  if (typeof dataUrl !== 'string' || !dataUrl.trim() || !metadata) {
    return null
  }

  return {
    url: dataUrl,
    fileName: metadata.originalName ?? attachment ?? 'invoice.pdf',
    mimeType: metadata.mimeType ?? 'application/pdf',
    sizeBytes: metadata.sizeBytes ?? 0,
    displaySize: metadata.displaySize ?? '',
  }
}

/** List/dashboard responses must not embed PDF binaries (dataUrl). */
export function sanitizeInvoiceAttachmentMetadata(
  attachmentMetadata: Prisma.JsonValue | null | undefined,
): Omit<InvoiceAttachmentMetadata, 'dataUrl'> | null {
  const metadata = parseInvoiceAttachmentMetadata(attachmentMetadata)
  if (!metadata) return null

  return {
    originalName: metadata.originalName,
    mimeType: metadata.mimeType,
    sizeBytes: metadata.sizeBytes,
    displaySize: metadata.displaySize,
    storageKey: metadata.storageKey,
  }
}
