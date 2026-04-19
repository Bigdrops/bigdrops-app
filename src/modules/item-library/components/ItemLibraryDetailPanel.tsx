import { Link } from 'react-router-dom'
import { Clock3, FileText, Receipt, Package } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ItemCatalogItem, ItemHistoryRow } from '../types'
import {
  formatItemPrice,
  formatLastUsedDate,
  formatUsageCount,
  getHistoryDocumentHref,
  getHistoryDocumentLabel,
  getHistorySourceLabel,
  getItemMetaRows,
} from './itemLibraryFormatters'

type ItemLibraryDetailPanelProps = {
  item: ItemCatalogItem | null
  historyRows: ItemHistoryRow[]
  loading: boolean
  error: Error | null
}

export function ItemLibraryDetailPanel({
  item,
  historyRows,
  loading,
  error,
}: ItemLibraryDetailPanelProps) {
  if (!item) {
    return (
      <Card className="rounded-3xl border-none shadow-sm ring-1 ring-border/70">
        <CardContent className="flex min-h-[340px] flex-col items-center justify-center px-6 py-10 text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-base font-semibold text-foreground">Select an item to view history</div>
          <div className="mt-2 max-w-sm text-sm text-muted-foreground">
            Select an item from the summary list to inspect its current price reference and usage history.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl border-none shadow-sm ring-1 ring-border/70">
      <CardHeader className="border-b border-border/70">
        <CardTitle className="text-lg font-bold tracking-tight">{item.name}</CardTitle>
        <CardDescription>
          Master item detail and recorded invoice or quotation usage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {getItemMetaRows(item).map((row) => (
            <div key={row.label} className="rounded-2xl border border-border bg-muted/20 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {row.label}
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">{row.value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Usage history</div>
              <div className="text-sm text-muted-foreground">
                Original descriptions and prices used in saved documents.
              </div>
            </div>
            <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {formatUsageCount(item.usage_count)}
            </div>
          </div>

          <Separator className="my-4" />

          {loading ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
              Loading usage history…
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-sm text-destructive">
              {error.message || 'Could not load item history.'}
            </div>
          ) : null}

          {!loading && !error && historyRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <div className="text-sm font-semibold text-foreground">No history yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                This item has no linked invoice or quotation rows yet.
              </div>
            </div>
          ) : null}

          {!loading && !error && historyRows.length > 0 ? (
            <div className="space-y-3">
              {historyRows.map((row) => {
                const href = getHistoryDocumentHref(row)
                const sourceLabel = getHistorySourceLabel(row)
                const SourceIcon = row.source_type === 'invoice' ? Receipt : FileText

                return (
                  <div
                    key={`${row.source_type}-${row.row_id}`}
                    className="rounded-2xl border border-border bg-background px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-muted">
                            <SourceIcon className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <span>{sourceLabel}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {href ? (
                            <Link to={href} className="font-medium text-foreground underline-offset-4 hover:underline">
                              {getHistoryDocumentLabel(row)}
                            </Link>
                          ) : (
                            <span>{getHistoryDocumentLabel(row)}</span>
                          )}
                          <span aria-hidden="true">•</span>
                          <span>{formatLastUsedDate(row.used_at)}</span>
                        </div>
                      </div>

                      <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {formatItemPrice(row.unit_price, 'No price')}
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-foreground">{row.description || 'No description captured.'}</div>

                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {row.quantity !== null && row.quantity !== undefined ? (
                        <span>Qty {Number(row.quantity).toLocaleString()}</span>
                      ) : null}
                      {row.unit ? <span>Unit {row.unit}</span> : null}
                      {row.amount !== null && row.amount !== undefined ? (
                        <span>Total {formatItemPrice(row.amount)}</span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {sourceLabel} record
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
