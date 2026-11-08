const MAX_PHOTO_BYTES = 10 * 1024 * 1024
const UNREADABLE_MESSAGE = 'Could not read this image. Try a different photo.'

interface LoadedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // Not decodable through this path; try the <img> element below.
    }
  }
  return loadWithImageElement(file)
}

function loadWithImageElement(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(UNREADABLE_MESSAGE))
    }
    img.src = url
  })
}

/**
 * Centre-crops an image to a square and re-encodes it as a JPEG for upload.
 * Re-encoding through a canvas drops EXIF data (location, camera), which is intended.
 */
export async function squareResize(
  file: File,
  size = 512,
): Promise<{ dataUrl: string; mimeType: 'image/jpeg' }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('Photo must be 10 MB or smaller.')
  }

  const image = await loadImage(file)
  try {
    if (image.width === 0 || image.height === 0) {
      throw new Error(UNREADABLE_MESSAGE)
    }
    const side = Math.min(image.width, image.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('This device could not process the photo. Try again.')
    }
    // JPEG has no alpha channel: paint white first so transparent PNG areas don't turn black.
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, size, size)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      image.source,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    )
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), mimeType: 'image/jpeg' }
  } finally {
    image.release()
  }
}
