import React, { useMemo } from 'react'

import { TableDocumentPreview } from '@/components/table-document/TableDocumentPreview'
import type { Boq } from '@/domain/boq/types'
import { computeBoqTotals } from '@/domain/boq/calculateBoqTotals'

export function BoqPreview({ boq }: { boq: Boq }) {
  const totals = useMemo(() => computeBoqTotals(boq.table_rows || []), [boq.table_rows])
  const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n)

  return (
    <div className="space-y-4">
      <TableDocumentPreview
        documentType="boq"
        templateId={boq.template_id}
        document={boq}
        rows={boq.table_rows}
        columns={boq.table_columns}
      />

      <div className="flex items-center justify-end gap-6 text-sm py-3 px-4 rounded-lg border border-border bg-muted/20">
        <span className="opacity-60">Total Cost</span>
        <span className="font-mono font-bold">{fmt(totals.total_cost)}</span>
        <span className="opacity-60">Total Selling Price</span>
        <span className="font-mono font-bold">{fmt(totals.total_selling_price)}</span>
        <span className="font-bold ml-2">Gross Profit</span>
        <span className="font-mono font-black text-green-600">{fmt(totals.gross_profit)}</span>
      </div>
    </div>
  )
}
