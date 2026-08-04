import { useEffect, useState } from 'react'
import { createAttachmentObjectUrl, revokeAttachmentObjectUrl } from '@/utils/invoice-attachment'

export function useAttachmentPreviewUrl(sourceUrl: string) {
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (!sourceUrl) {
      setPreviewUrl('')
      return
    }

    let objectUrl = ''
    let cancelled = false

    void createAttachmentObjectUrl(sourceUrl).then(url => {
      if (cancelled) {
        if (url !== sourceUrl) revokeAttachmentObjectUrl(url)
        return
      }
      objectUrl = url
      setPreviewUrl(url)
    })

    return () => {
      cancelled = true
      if (objectUrl && objectUrl !== sourceUrl) {
        revokeAttachmentObjectUrl(objectUrl)
      }
    }
  }, [sourceUrl])

  return previewUrl
}
