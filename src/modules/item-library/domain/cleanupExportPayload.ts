import type { CatalogCleanupBatchExportPayload, FlaggedCleanupBatchExportPayload } from '../types'

export function getCleanupExportItemIds(
  exportPayload: CatalogCleanupBatchExportPayload | FlaggedCleanupBatchExportPayload,
): Set<string> {
  if ('items' in exportPayload && Array.isArray(exportPayload.items)) {
    return new Set(exportPayload.items.map((item) => item.item_id))
  }

  if ('groups' in exportPayload && Array.isArray(exportPayload.groups)) {
    return new Set(
      exportPayload.groups.flatMap((group) =>
        Array.isArray(group.items) ? group.items.map((item) => item.item_id) : [],
      ),
    )
  }

  return new Set()
}
