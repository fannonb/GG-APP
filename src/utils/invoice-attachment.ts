const MAX_INVOICE_PDF_BYTES = 10 * 1024 * 1024

export function validateInvoicePdfFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return 'Only PDF invoice documents are supported.'
  }

  if (file.size > MAX_INVOICE_PDF_BYTES) {
    return 'Invoice PDF must be 10 MB or smaller.'
  }

  return null
}

export function isImageAttachmentUrl(url: string) {
  return url.startsWith('data:image/')
}

export async function createAttachmentObjectUrl(sourceUrl: string): Promise<string> {
  if (!sourceUrl.startsWith('data:')) {
    return sourceUrl
  }

  // Prefer manual decode: fetch(data:) fails for large PDFs in Chromium.
  const comma = sourceUrl.indexOf(',')
  if (comma === -1) {
    const response = await fetch(sourceUrl)
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  const header = sourceUrl.slice(5, comma) // after "data:"
  const payload = sourceUrl.slice(comma + 1)
  const mime = header.split(';')[0] || 'application/octet-stream'
  const isBase64 = /;base64/i.test(header)

  let bytes: Uint8Array
  if (isBase64) {
    const binary = atob(payload)
    bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(payload))
  }

  return URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mime }))
}

export function revokeAttachmentObjectUrl(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export async function downloadInvoiceAttachment(url: string, fileName: string) {
  const objectUrl = await createAttachmentObjectUrl(url)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  if (objectUrl !== url) {
    revokeAttachmentObjectUrl(objectUrl)
  }
}

export function invoiceHasStoredAttachment(
  attachmentUrl?: string | null,
  attachmentMetadata?: { dataUrl?: string } | null,
) {
  const url = attachmentUrl ?? attachmentMetadata?.dataUrl ?? ''
  return typeof url === 'string' && url.trim().length > 0
}
