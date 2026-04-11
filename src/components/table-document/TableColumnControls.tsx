import React from 'react'

import { Label } from '@/components/ui/label'
import type { TableDocumentColumn } from '@/domain/table-document/types'

type Props = {
  columns: TableDocumentColumn[]
  onChange: (columns: TableDocumentColumn[]) => void
}

export function TableColumnControls({ columns, onChange }: Props) {
  return (
    <div className="space-y-3">
      {columns.map((column) => (
        <label key={column.key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-3">
          <div>
            <div className="text-sm font-semibold text-foreground">{column.label}</div>
            <div className="text-xs text-muted-foreground">{column.key}</div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Visible</Label>
            <input
              type="checkbox"
              checked={column.visible}
              onChange={(event) =>
                onChange(columns.map((entry) => entry.key === column.key ? { ...entry, visible: event.target.checked } : entry))
              }
              className="h-4 w-4"
            />
          </div>
        </label>
      ))}
    </div>
  )
}
