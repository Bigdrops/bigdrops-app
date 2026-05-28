import { Card, CardContent } from '@/components/ui/card'
import { resolveLineAmount } from '@/domain/invoice/projections/lineItemResolvers'

interface InvoiceLineItemRow {
  id?: string | null
  _uiKey?: string | null
  row_type?: string | null
  group_name?: string | null
  description?: string | null
  sub_description?: string | null
  quantity?: number | string | null
  unit?: string | null
  make?: string | null
  amount?: number | string | null
  unit_price?: number | string | null
}

interface InvoiceLineItemsCardProps {
  items: InvoiceLineItemRow[]
  formatMoney: (value: number | string | null | undefined) => string
}

export default function InvoiceLineItemsCard({ items, formatMoney }: InvoiceLineItemsCardProps) {
  let itemNumber = 0

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-bd-text-muted">Line Items</div>
      <Card className="rounded-[24px] border-border shadow-sm">
        <CardContent className="space-y-3 p-4">
          {items.map((item, index) => {
            if (item.row_type === 'group_header') {
              return (
                <div
                  key={item._uiKey || item.id || index}
                  className="rounded-2xl bg-bd-text px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-bd-surface"
                >
                  {item.group_name || `Group ${index + 1}`}
                </div>
              )
            }

            itemNumber += 1
            const quantity = Number(item.quantity || 0)
            const unitPrice = Number(item.unit_price || 0)

            return (
              <div
                key={item._uiKey || item.id || index}
                className="flex gap-3 border-b border-bd-border pb-3 last:border-b-0 last:pb-0"
              >
                <div
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-bd-surface-muted text-[10px] font-extrabold text-bd-text-muted cursor-pointer"
                  // DIAGNOSTIC LOGGING
                  onClick={(e) => {
                    e.stopPropagation();
                    const el = e.currentTarget;
                    console.group('🔍 Badge clicked');
                    console.log('Classes:', el.className);
                    console.log('Computed bg:', getComputedStyle(el).backgroundColor);
                    console.log('--bd-surface-muted:', getComputedStyle(el).getPropertyValue('--bd-surface-muted'));
                    console.log('--bd-text-muted:', getComputedStyle(el).getPropertyValue('--bd-text-muted'));
                    console.log('data-theme:', document.documentElement.getAttribute('data-theme'));
                    console.groupEnd();
                  }}
                >
                  {itemNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-foreground">
                    {item.description || 'Untitled item'}
                  </div>
                  {item.sub_description ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.sub_description}
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Qty {quantity}
                    {item.unit ? ` ${item.unit}` : ''}
                    {item.make ? ` · ${item.make}` : ''}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-extrabold text-foreground">
                    {formatMoney(resolveLineAmount(item))}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatMoney(unitPrice)} each
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
