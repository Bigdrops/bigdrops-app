import * as React from 'react'
import { Search, Link2 } from 'lucide-react'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { cn } from '@/lib/utils'
import { supabase } from '@/supabase'

function normalize(value: string | number | null | undefined): string {
  return String(value || '').trim().toLowerCase()
}

interface ScoreMatchParams {
  query: string
  numberValue: string | number | null | undefined
  clientValue: string | number | null | undefined
  poValue: string | number | null | undefined
  sameClient: boolean
}

function scoreMatch({
  query,
  numberValue,
  clientValue,
  poValue,
  sameClient,
}: ScoreMatchParams): number {
  if (!query) return sameClient ? 10 : 0
  const q = normalize(query)
  const number = normalize(numberValue)
  const client = normalize(clientValue)
  const po = normalize(poValue)

  const numberExact = q && number === q
  const numberPartial = q && number.includes(q)
  const poMatch = q && po.includes(q)
  const clientMatch = q && client.includes(q)

  if (sameClient && numberExact) return 100
  if (sameClient && numberPartial) return 90
  if (sameClient && poMatch) return 80
  if (sameClient && clientMatch) return 70
  if (!sameClient && numberExact) return 60
  if (!sameClient && numberPartial) return 50
  if (!sameClient && poMatch) return 40
  if (!sameClient && clientMatch) return 30
  return 0
}

interface DocumentItem {
  id: string
  [key: string]: any
  _sameClient?: boolean
}

interface ConfirmState {
  type: 'reassign' | 'client-mismatch'
  item: DocumentItem
  linkedTo?: string | null
}

interface AttachExistingDocumentSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  table: string
  numberField: string
  clientField: string
  poField: string
  linkedInvoiceField?: string
  currentInvoiceId?: string | null
  currentClientName?: string | null
  searchPlaceholder?: string
  onAttach?: (item: DocumentItem) => void
}

export default function AttachExistingDocumentSheet({
  open,
  onOpenChange,
  title,
  description,
  table,
  numberField,
  clientField,
  poField,
  linkedInvoiceField,
  currentInvoiceId,
  currentClientName,
  searchPlaceholder = 'Search',
  onAttach,
}: AttachExistingDocumentSheetProps) {
  const [query, setQuery] = React.useState('')
  const [recentItems, setRecentItems] = React.useState<DocumentItem[]>([])
  const [results, setResults] = React.useState<DocumentItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [confirmState, setConfirmState] = React.useState<ConfirmState | null>(null)

  const currentClient = normalize(currentClientName)

  const fields = React.useMemo(() => {
    const base = ['id', numberField, clientField, poField].filter(Boolean)
    if (linkedInvoiceField) base.push(linkedInvoiceField)
    return base.join(', ')
  }, [numberField, clientField, poField, linkedInvoiceField])

  const loadRecent = React.useCallback(async () => {
    if (!table || !fields) return
    setLoading(true)
    const { data } = await supabase
      .from(table)
      .select(fields)
      .order('created_at', { ascending: false })
      .limit(5)

    const next = (data || []).map((item: any) => ({
      ...item,
      _sameClient: currentClient && normalize(item[clientField]) === currentClient,
    }))

    next.sort((a: DocumentItem, b: DocumentItem) => 
      scoreMatch({ query: '', numberValue: b[numberField], clientValue: b[clientField], poValue: b[poField], sameClient: !!b._sameClient })
      - scoreMatch({ query: '', numberValue: a[numberField], clientValue: a[clientField], poValue: a[poField], sameClient: !!a._sameClient }))

    setRecentItems(next)
    setLoading(false)
  }, [table, fields, currentClient, clientField, numberField, poField])

  const runSearch = React.useCallback(async (term: string) => {
    const q = normalize(term)
    if (!q) {
      setResults([])
      return
    }
    setLoading(true)
    const orParts = [
      numberField ? `${numberField}.ilike.%${q}%` : null,
      clientField ? `${clientField}.ilike.%${q}%` : null,
      poField ? `${poField}.ilike.%${q}%` : null,
    ].filter(Boolean).join(',')

    const { data } = await supabase
      .from(table)
      .select(fields)
      .or(orParts)
      .limit(15)

    const next = (data || []).map((item: any) => ({
      ...item,
      _sameClient: currentClient && normalize(item[clientField]) === currentClient,
    }))

    next.sort((a: DocumentItem, b: DocumentItem) => scoreMatch({
      query: term,
      numberValue: b[numberField],
      clientValue: b[clientField],
      poValue: b[poField],
      sameClient: !!b._sameClient,
    }) - scoreMatch({
      query: term,
      numberValue: a[numberField],
      clientValue: a[clientField],
      poValue: a[poField],
      sameClient: !!a._sameClient,
    }))

    setResults(next)
    setLoading(false)
  }, [table, fields, numberField, clientField, poField, currentClient])

  React.useEffect(() => {
    if (!open) return
    setQuery('')
    setResults([])
    void loadRecent()
  }, [open, loadRecent])

  React.useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      void runSearch(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [open, query, runSearch])

  const itemsToShow = query.trim() ? results : recentItems

  const handleSelect = (item: DocumentItem) => {
    if (!item) return
    const linkedTo = linkedInvoiceField ? item[linkedInvoiceField] : null
    if (linkedTo && currentInvoiceId && linkedTo !== currentInvoiceId) {
      setConfirmState({
        type: 'reassign',
        item,
        linkedTo,
      })
      return
    }
    if (currentClient && normalize(item[clientField]) && normalize(item[clientField]) !== currentClient) {
      setConfirmState({
        type: 'client-mismatch',
        item,
      })
      return
    }
    onAttach?.(item)
  }

  const confirmAttach = () => {
    const pending = confirmState?.item
    setConfirmState(null)
    if (pending) onAttach?.(pending)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[var(--bd-overlay-sheet-max-height)] rounded-t-[26px] px-0 pb-5">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200" />
          <SheetHeader className="border-b border-border px-4 pb-3 pt-3 text-left">
            <SheetTitle className="text-base font-extrabold text-foreground">{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>

          <div className="max-h-[calc(var(--bd-overlay-sheet-max-height)-92px)] overflow-y-auto px-4 pt-4">
            <div className="mb-4 flex items-center gap-2 rounded-[14px] border border-border bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              {query ? (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setQuery('')}>
                  ×
                </Button>
              ) : null}
            </div>

            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>{query.trim() ? 'Results' : 'Recent'}</span>
              {loading ? <span className="normal-case text-xs text-muted-foreground">Loading…</span> : null}
            </div>

            {itemsToShow.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                {query.trim() ? 'No matches found.' : 'No recent items yet.'}
              </div>
            ) : (
              <div className="space-y-2">
                {itemsToShow.slice(0, 5).map((item) => {
                  const number = item[numberField] || item.id
                  const client = item[clientField] || 'No client'
                  const po = item[poField]
                  const linkedTo = linkedInvoiceField ? item[linkedInvoiceField] : null
                  const sameClient = item._sameClient
                  const linkedToCurrent = linkedTo && currentInvoiceId && linkedTo === currentInvoiceId

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={linkedToCurrent}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-[18px] border border-border bg-background px-3 py-3 text-left transition hover:bg-muted/30',
                        linkedToCurrent && 'cursor-default opacity-60 hover:bg-background',
                      )}
                    >
                      <div className="mt-1 grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                        <Link2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-foreground">{number}</div>
                          {sameClient ? <Badge variant="outline">Same client</Badge> : null}
                          {linkedTo ? <Badge variant="outline">Already linked</Badge> : null}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{client}</div>
                        {po ? <div className="mt-0.5 text-xs text-muted-foreground">PO {po}</div> : null}
                        {linkedTo ? <div className="mt-1 text-[11px] text-muted-foreground">Linked invoice: {linkedTo}</div> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmActionDialog
        open={Boolean(confirmState)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmState(null)
        }}
        title={confirmState?.type === 'reassign' ? 'Reassign linked document?' : 'Client mismatch'}
        description={
          confirmState?.type === 'reassign'
            ? 'This document is already linked to another invoice. Reassigning will detach it from the previous invoice.'
            : 'This document belongs to a different client. Please confirm you want to attach it anyway.'
        }
        confirmLabel={confirmState?.type === 'reassign' ? 'Reassign' : 'Attach anyway'}
        variant={confirmState?.type === 'reassign' ? 'destructive' : 'default'}
        onConfirm={confirmAttach}
      />
    </>
  )
}
