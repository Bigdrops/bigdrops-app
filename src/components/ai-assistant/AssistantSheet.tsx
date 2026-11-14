import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowUp, Loader2, Search, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getBoluSuggestions } from '@/lib/ai-assistant/bolu-context'
import { formatNaira } from '@/lib/formatters/money'
import type { BoluRuntimeState, createBoluRuntime } from '@/lib/ai-assistant/bolu-runtime'

type BoluRuntime = ReturnType<typeof createBoluRuntime>

type AssistantSheetProps = {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  runtime: BoluRuntime
  state: BoluRuntimeState | null
}

export function AssistantSheet({ open, onOpenChange, runtime, state }: AssistantSheetProps) {
  const [draft, setDraft] = useState('')
  const [pickerQuery, setPickerQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const listEndRef = useRef<HTMLDivElement | null>(null)
  const status = state?.status ?? 'idle'
  const suggestions = state ? getBoluSuggestions(state.context) : []

  useEffect(() => {
    if (!open) return
    listEndRef.current?.scrollIntoView({ block: 'end' })
  }, [open, state?.messages, status])

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || status !== 'idle') return
    setDraft('')
    void runtime.submit(text)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[88dvh] flex-col gap-0 p-0 sm:max-h-[760px]">
        <SheetHeader className="border-b border-bd-border px-4 pb-3 pt-4">
          <SheetTitle className="text-base">Bolu</SheetTitle>
          <SheetDescription className="text-[11px] text-bd-text-muted">
            Read-only business intelligence · page context: {state?.context.origin.page ?? 'current page'}
          </SheetDescription>
        </SheetHeader>

        {state?.pendingContext ? (
          <div className="flex items-center justify-between gap-3 border-b border-bd-border bg-bd-surface-muted px-4 py-2">
            <p className="text-xs text-bd-text-muted">
              New context available: {state.pendingContext.origin.page}
              {state.pendingContext.record ? ` · ${state.pendingContext.record.kind}` : ''}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => runtime.applyContext()}>
              Use this context
            </Button>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {state?.context.record ? (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-bd-border bg-bd-surface-muted px-3 py-2 text-xs">
              <span className="text-bd-text-muted">
                Using selected {state.context.record.kind} · persisted record
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
                Change
              </Button>
            </div>
          ) : null}

          <ul className="space-y-4">
            {(state?.messages ?? []).map((message) => (
              <li key={message.id} className="space-y-2">
                <div
                  className={message.role === 'user'
                    ? 'ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[hsl(var(--primary))] px-3 py-2 text-[13px] leading-relaxed text-white'
                    : 'mr-auto max-w-[94%] whitespace-pre-wrap text-[13px] leading-relaxed text-bd-text'}
                >
                  {message.content}
                </div>
                {message.records?.kind === 'records' && message.records.records.length ? (
                  <div className="ml-1 mr-auto max-w-[96%] space-y-2" aria-label="Matching business records">
                    {message.records.records.map((record) => (
                      <button
                        key={`${record.kind}-${record.id}`}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-bd-border bg-bd-card-bg px-3 py-2 text-left transition hover:bg-bd-surface-muted"
                        onClick={() => void runtime.selectRecord({ kind: record.kind, id: record.id, persistence: 'persisted' })}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-bd-text">
                            {record.number}{record.clientName ? ` · ${record.clientName}` : ''}
                          </span>
                          <span className="block truncate text-[11px] text-bd-text-muted">
                            {[
                              record.date,
                              record.status,
                              record.total == null ? null : `Total ${formatNaira(record.total)}`,
                              record.balanceDue == null ? null : `Due ${formatNaira(record.balanceDue)}`,
                            ].filter(Boolean).join(' · ') || record.title || record.kind}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-semibold text-[hsl(var(--primary))]">Select</span>
                      </button>
                    ))}
                    {message.records.hasMore ? (
                      <p className="text-[11px] text-bd-text-muted">Showing the closest matches. Refine the search for more specific results.</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {state?.messages.length === 1 && suggestions.length ? (
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Suggested questions">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={status !== 'idle'}
                  onClick={() => void runtime.suggest(suggestion.id)}
                >
                  {suggestion.label}
                </Button>
              ))}
            </div>
          ) : null}

          {status !== 'idle' ? (
            <div className="mt-4 flex items-center gap-2 text-xs text-bd-text-muted" role="status" aria-live="polite">
              <Loader2 className="size-3.5 animate-spin" />
              {status === 'searching' ? 'Searching business records…' : 'Bolu is reviewing the available information…'}
            </div>
          ) : null}
          {state?.streamingContent ? (
            <div className="mr-auto mt-3 max-w-[94%] whitespace-pre-wrap text-[13px] leading-relaxed text-bd-text" aria-live="polite">
              {state.streamingContent}
            </div>
          ) : null}
          {state?.error ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-2" role="alert">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-bd-status-danger-text" />
              <p className="text-[11px] leading-relaxed text-bd-status-danger-text">{state.error}</p>
            </div>
          ) : null}
          <div ref={listEndRef} />
        </div>

        <div className="border-t border-bd-border px-3 py-3">
          {pickerOpen ? (
            <form
              className="mb-3 flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                if (pickerQuery.trim().length >= 2) {
                  void runtime.searchRecords(pickerQuery, state?.context.origin.module === 'quotation' ? 'quotation' : 'invoice')
                }
              }}
            >
              <Search className="size-4 shrink-0 text-bd-text-muted" />
              <Input
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
                placeholder={state?.context.origin.module === 'quotation' ? 'Search quotation number or customer' : 'Search invoice number or customer'}
                aria-label="Search business records"
              />
              <Button type="submit" size="icon" variant="outline" aria-label="Search records" disabled={status !== 'idle'}>
                <Search className="size-4" />
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPickerOpen(false)}>Close</Button>
            </form>
          ) : null}
          <div className="mb-2 flex justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => setPickerOpen((value) => !value)}>
              {pickerOpen ? 'Hide record search' : 'Find a record'}
            </Button>
          </div>
          <form className="flex items-end gap-2" onSubmit={submit}>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit()
                }
              }}
              placeholder="Ask Bolu about your records"
              aria-label="Message Bolu"
              className="flex-1"
              disabled={status !== 'idle'}
            />
            {status !== 'idle' ? (
              <Button type="button" size="icon-lg" variant="outline" className="shrink-0" onClick={() => runtime.stop()} aria-label="Stop Bolu">
                <Square className="size-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon-lg" className="shrink-0" disabled={!draft.trim()} aria-label="Send message">
                <ArrowUp className="size-4" />
              </Button>
            )}
          </form>
          <p className="mt-2 text-[10px] text-bd-text-muted">Bolu can read records only. He cannot create or change business data.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
