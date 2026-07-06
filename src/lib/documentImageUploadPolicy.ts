/**
 * Shared image upload validation policy for all document forms.
 *
 * Every document image picker MUST import from here rather than
 * duplicating MIME arrays or `accept` strings.
 */

export const SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/gif',
  'image/bmp',
  'image/tiff',
] as const

export type SupportedImageMime =
  (typeof SUPPORTED_IMAGE_MIME_TYPES)[number]

/**
 * The `accept` attribute string for <input type="file"> elements.
 * Browser-native pickers use this to pre-filter the file list.
 * It is a convenience only — validation must still happen after selection.
 */
export const IMAGE_ACCEPT_ATTRIBUTE = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.avif',
  '.gif',
  '.bmp',
  '.tiff',
  '.tif',
].join(',')

const MIME_SET = new Set<string>(SUPPORTED_IMAGE_MIME_TYPES)

/**
 * Returns `true` when the file's MIME type is in the allowed set.
 * Use this AFTER picker selection as the authoritative check.
 */
export function isSupportedImageFile(file: File): boolean {
  return MIME_SET.has(file.type)
}

/**
 * Filter an array of files, keeping only supported images and
 * collecting human-readable error messages for rejected files.
 */
export function partitionImageFiles(files: File[]): {
  valid: File[]
  rejected: { file: File; reason: string }[]
} {
  const valid: File[] = []
  const rejected: { file: File; reason: string }[] = []

  for (const file of files) {
    if (isSupportedImageFile(file)) {
      valid.push(file)
    } else {
      rejected.push({
        file,
        reason: `"${file.name}" is not a supported image format. Please select a JPG, PNG, WebP, HEIC, HEIF, AVIF, GIF, BMP, or TIFF file.`,
      })
    }
  }

  return { valid, rejected }
}

/**
 * Returns a consistent user-facing error message for a rejected file.
 */
export function getUnsupportedImageErrorMessage(fileName: string): string {
  return `"${fileName}" is not a supported image format. Please select a JPG, PNG, WebP, HEIC, HEIF, AVIF, GIF, BMP, or TIFF file.`
}
