export const REPORT_IMAGE_MAX_COUNT = 20
export const REPORT_IMAGE_MAX_BYTES = 25 * 1024 * 1024
export const REPORT_IMAGE_MAX_EDGE = 1600

export type CompressReportImagesErrorCode
  = 'empty'
    | 'too_many'
    | 'still_too_large'
    | 'decode_failed'

export class CompressReportImagesError extends Error {
  constructor(
    public readonly code: CompressReportImagesErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'CompressReportImagesError'
  }
}

/**
 * Resize each image to long edge ≤ 1600 and encode as JPEG.
 * Retries once at lower quality if the batch still exceeds 25MB.
 */
export async function compressReportImages(files: File[]): Promise<File[]> {
  if (files.length === 0) {
    throw new CompressReportImagesError('empty', 'No images to compress')
  }
  if (files.length > REPORT_IMAGE_MAX_COUNT) {
    throw new CompressReportImagesError('too_many', 'Too many images')
  }

  let quality = 0.8
  let compressed = await Promise.all(
    files.map((file, index) => compressOne(file, index, quality))
  )
  let total = compressed.reduce((sum, file) => sum + file.size, 0)
  if (total <= REPORT_IMAGE_MAX_BYTES) {
    return compressed
  }

  quality = 0.55
  compressed = await Promise.all(
    files.map((file, index) => compressOne(file, index, quality))
  )
  total = compressed.reduce((sum, file) => sum + file.size, 0)
  if (total > REPORT_IMAGE_MAX_BYTES) {
    throw new CompressReportImagesError('still_too_large', 'Compressed images still exceed 25MB')
  }

  return compressed
}

async function compressOne(file: File, index: number, quality: number): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new CompressReportImagesError('decode_failed', `Unable to decode image at index ${index}`)
  }

  try {
    const scale = Math.min(1, REPORT_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new CompressReportImagesError('decode_failed', 'Canvas unavailable')
    }
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })
    if (!blob) {
      throw new CompressReportImagesError('decode_failed', 'JPEG encode failed')
    }
    return new File([blob], `page-${index + 1}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}

/** Try loading a gallery/camera File; return null if the browser cannot decode it (e.g. HEIC). */
export async function tryLoadImageFile(file: File): Promise<File | null> {
  if (!file.type.startsWith('image/') && file.type !== '') {
    return null
  }
  try {
    const bitmap = await createImageBitmap(file)
    bitmap.close()
    return file
  } catch {
    return null
  }
}
