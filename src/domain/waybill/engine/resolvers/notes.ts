import { richTextToPlainText } from '@/components/pdf-new/core/richText'
import { normalizeBlank } from '../normalizeBlank'

export function resolveNotes(rawNotes: unknown): string {
  return richTextToPlainText(normalizeBlank(rawNotes))
}
