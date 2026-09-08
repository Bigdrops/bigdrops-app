import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, ClipboardList, FileText, FolderKanban, Truck, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'
import {
  formatCurrency,
  formatDateShort,
  type CsrRecord,
  type InvoiceRecord,
  type ProjectRecord,
  type QuotationRecord,
  type WaybillRecord,
} from '@/domain/clientWorkspace'
import { cn } from '@/lib/utils'

// ── Group shell ──────────────────────────────────────────────────────

interface HistoryGroupProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  count: number | null
  loading: boolean
  error: string
  onRetry: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

export const HistoryGroup: React.FC<HistoryGroupProps> = ({
  title,
  icon: Icon,
  count,
  loading,
  error,
  onRetry,
  children,
  footer,
}) => {
  const [open, setOpen] = React.useState(true)

  return (
    <section aria-label={title} className="overflow-hidden rounded-2xl border border-bd-border bg-bd-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-bd-surface-muted text-bd-text-muted">
          <Icon className="size-4" />
        </span>
        <span className="flex-1 truncate text-[11px] font-black uppercase tracking-wider text-foreground">
          {title}
        </span>
        {typeof count === 'number' && (
          <span className="shrink-0 rounded-full bg-bd-surface-muted px-2 py-0.5 text-[11px] font-black tabular-nums text-bd-text-muted">
            {count}
          </span>
        )}
        <ChevronDown className={cn('size-4 shrink-0 text-bd-text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-bd-border/60">
          {loading ? (
            <div className="px-4 py-6">
              <CenteredSpinner />
            </div>
          ) : error ? (
            <div className="flex items-center justify-between gap-2 px-4 py-4">
              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-[hsl(var(--bd-status-danger-text))]">
                {error}
              </p>
              <Button size="sm" variant="outline" className="min-h-[44px] shrink-0 rounded-full px-4" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {children}
              {footer}
            </>
          )}
        </div>
      )}
    </section>
  )
}

// ── Status pills ─────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  paid: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))] ring-[hsl(var(--bd-status-success-border))]',
  unpaid: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))] ring-[hsl(var(--bd-status-info-border))]',
  partially_paid: 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))] ring-[hsl(var(--bd-status-warning-border))]',
  converted: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))] ring-[hsl(var(--bd-status-success-border))]',
  overdue: 'bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))] ring-[hsl(var(--bd-status-danger-border))]',
  cancelled: 'bg-[hsl(var(--bd-status-neutral-bg))] text-[hsl(var(--bd-status-neutral-text))] ring-[hsl(var(--bd-status-neutral-border))]',
  open: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))] ring-[hsl(var(--bd-status-info-border))]',
  confirmed: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))] ring-[hsl(var(--bd-status-success-border))]',
  archived: 'bg-[hsl(var(--bd-status-neutral-bg))] text-[hsl(var(--bd-status-neutral-text))] ring-[hsl(var(--bd-status-neutral-border))]',
  active: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))] ring-[hsl(var(--bd-status-success-border))]',
  completed: 'bg-[hsl(var(--bd-status-neutral-bg))] text-[hsl(var(--bd-status-neutral-text))] ring-[hsl(var(--bd-status-neutral-border))]',
  on_hold: 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))] ring-[hsl(var(--bd-status-warning-border))]',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('inline-block h-4 shrink-0 rounded-full px-2 text-[9px] font-black uppercase leading-4 tracking-widest ring-1 ring-inset', STATUS_PILL[status] ?? STATUS_PILL.archived)}>
      {status}
    </span>
  )
}

// ── Document rows ────────────────────────────────────────────────────

interface DocRowProps {
  id: string
  path: string
  number: string
  date: string | null | undefined
  status: string
  total: number | null | undefined
  icon: React.ComponentType<{ className?: string }>
}

export const HistoryDocRow: React.FC<DocRowProps> = ({ path, number, date, status, total, icon: Icon }) => {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="flex min-h-[68px] w-full items-center gap-3 border-b border-bd-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-bd-surface-muted/50 active:bg-bd-surface-muted"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bd-surface-muted text-bd-text-muted">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-black uppercase tracking-wider text-foreground">
            {number}
          </span>
          <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{formatDateShort(date)}</span>
        </span>
        <span className="mt-1.5 flex min-w-0 items-center gap-2">
          <StatusPill status={status} />
          {typeof total === 'number' && total > 0 && (
            <>
              <span className="text-[10px] text-muted-foreground/30">•</span>
              <span className="truncate text-xs font-bold text-foreground">{formatCurrency(total)}</span>
            </>
          )}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}

// ── Type-specific lists ──────────────────────────────────────────────

const PREVIEW_COUNT = 3

function usePreview<T>(items: T[], expanded: boolean) {
  return expanded ? items : items.slice(0, PREVIEW_COUNT)
}

export const DOC_ICONS = {
  invoice: FileText,
  quotation: ClipboardList,
  csr: Wrench,
  waybill: Truck,
  project: FolderKanban,
}

// ── Segmented filter control ──────────────────────────────────────────

export function SegmentedControl({
  options,
  value,
  onChange,
  label,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-0.5 rounded-[var(--bd-radius-md)] bg-bd-surface-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="tab"
          aria-selected={value === opt}
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-[calc(var(--bd-radius-md)-2px)] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition-colors ${
            value === opt
              ? 'bg-bd-card-bg text-foreground shadow-sm'
              : 'text-bd-text-muted hover:text-foreground'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function ShowAllButton({ label, onToggle }: { label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex min-h-[48px] w-full items-center justify-center text-xs font-black uppercase tracking-wider text-[hsl(var(--bd-button-primary-bg))] transition-colors hover:bg-bd-surface-muted/50"
    >
      {label}
    </button>
  )
}

interface LazyListProps {
  totalCount: number | null
  allLoaded: boolean
  loadingAll: boolean
  onLoadAll: (() => void) | null
}

function ListFooter({
  visibleCount,
  loadedCount,
  totalCount,
  expanded,
  allLoaded,
  loadingAll,
  onToggle,
  onLoadAll,
}: LazyListProps & {
  visibleCount: number
  loadedCount: number
  expanded: boolean
  onToggle: () => void
}) {
  const total = totalCount ?? loadedCount
  if (total <= PREVIEW_COUNT) return null
  if (!expanded) {
    return <ShowAllButton label={`Show all ${total}`} onToggle={onToggle} />
  }
  if (!allLoaded) {
    if (loadingAll) {
      return (
        <div className="px-4 py-4">
          <CenteredSpinner />
        </div>
      )
    }
    return <ShowAllButton label={`Load all ${total}`} onToggle={() => onLoadAll?.()} />
  }
  void visibleCount
  return <ShowAllButton label="Show less" onToggle={onToggle} />
}

export function InvoiceList({ invoices, filter = 'All' }: { invoices: InvoiceRecord[]; filter?: string }) {
  const [expanded, setExpanded] = React.useState(false)
  const filtered = React.useMemo(() => {
    if (filter === 'All') return invoices
    if (filter === 'Paid') return invoices.filter((inv) => Number(inv.balance_due || 0) <= 0)
    if (filter === 'Unpaid') return invoices.filter((inv) => Number(inv.balance_due || 0) > 0)
    return invoices
  }, [invoices, filter])
  const visible = usePreview(filtered, expanded)
  if (filtered.length === 0) return <EmptyRow label={filter === 'All' ? 'No invoices yet' : `No ${filter.toLowerCase()} invoices`} />
  return (
    <div>
      {visible.map((inv) => (
        <HistoryDocRow
          key={inv.id}
          id={inv.id}
          path={`/invoices/${inv.id}`}
          number={inv.invoice_number || inv.invoice_title || 'Invoice'}
          date={inv.issue_date}
          status={String(inv.computed_status || inv.status || 'open').toLowerCase()}
          total={Number(inv.total || 0)}
          icon={DOC_ICONS.invoice}
        />
      ))}
      <ListFooter
        visibleCount={visible.length}
        loadedCount={filtered.length}
        totalCount={filtered.length}
        expanded={expanded}
        allLoaded
        loadingAll={false}
        onToggle={() => setExpanded((v) => !v)}
        onLoadAll={null}
      />
    </div>
  )
}

function useLazyList<T>(items: T[], totalCount: number | null, allLoaded: boolean) {
  const [expanded, setExpanded] = React.useState(false)
  const visible = usePreview(items, expanded)
  const empty = items.length === 0 && (allLoaded || (totalCount ?? 0) === 0)
  return { expanded, setExpanded, visible, empty }
}

export function QuotationList({
  quotations,
  totalCount,
  allLoaded,
  loadingAll,
  onLoadAll,
  filter = 'All',
}: {
  quotations: QuotationRecord[]
} & LazyListProps & { filter?: string }) {
  const filtered = React.useMemo(() => {
    if (filter === 'All') return quotations
    if (filter === 'Converted') return quotations.filter((q) => String(q.status || '').toLowerCase() === 'converted')
    if (filter === 'Open') return quotations.filter((q) => String(q.status || '').toLowerCase() !== 'converted')
    return quotations
  }, [quotations, filter])
  const { expanded, setExpanded, visible, empty } = useLazyList(filtered, totalCount, allLoaded)
  if (empty) return <EmptyRow label={filter === 'All' ? 'No quotations yet' : `No ${filter.toLowerCase()} quotations`} />
  return (
    <div>
      {visible.map((q) => (
        <HistoryDocRow
          key={q.id}
          id={q.id}
          path={`/quotations/${q.id}`}
          number={q.quotation_number || 'Quotation'}
          date={q.issue_date}
          status={String(q.status || 'open').toLowerCase()}
          total={Number(q.total || 0)}
          icon={DOC_ICONS.quotation}
        />
      ))}
      <ListFooter
        visibleCount={visible.length}
        loadedCount={filtered.length}
        totalCount={totalCount}
        expanded={expanded}
        allLoaded={allLoaded}
        loadingAll={loadingAll}
        onToggle={() => setExpanded((v) => !v)}
        onLoadAll={onLoadAll}
      />
    </div>
  )
}

export function CsrList({
  csrs,
  totalCount,
  allLoaded,
  loadingAll,
  onLoadAll,
}: {
  csrs: CsrRecord[]
} & LazyListProps) {
  const { expanded, setExpanded, visible, empty } = useLazyList(csrs, totalCount, allLoaded)
  if (empty) return <EmptyRow label="No service reports yet" />
  return (
    <div>
      {visible.map((c) => (
        <HistoryDocRow
          key={c.id}
          id={c.id}
          path={`/csr/${c.id}`}
          number={c.csr_number || c.title || 'CSR'}
          date={c.date || c.created_at}
          status={String(c.status || 'open').toLowerCase()}
          total={null}
          icon={DOC_ICONS.csr}
        />
      ))}
      <ListFooter
        visibleCount={visible.length}
        loadedCount={csrs.length}
        totalCount={totalCount}
        expanded={expanded}
        allLoaded={allLoaded}
        loadingAll={loadingAll}
        onToggle={() => setExpanded((v) => !v)}
        onLoadAll={onLoadAll}
      />
    </div>
  )
}

export function WaybillList({
  waybills,
  totalCount,
  allLoaded,
  loadingAll,
  onLoadAll,
}: {
  waybills: WaybillRecord[]
} & LazyListProps) {
  const { expanded, setExpanded, visible, empty } = useLazyList(waybills, totalCount, allLoaded)
  if (empty) return <EmptyRow label="No waybills yet" />
  return (
    <div>
      {visible.map((w) => (
        <HistoryDocRow
          key={w.id}
          id={w.id}
          path={`/waybills/${w.id}`}
          number={w.waybill_number || 'Waybill'}
          date={w.date || w.created_at}
          status={String(w.status || 'open').toLowerCase()}
          total={null}
          icon={DOC_ICONS.waybill}
        />
      ))}
      <ListFooter
        visibleCount={visible.length}
        loadedCount={waybills.length}
        totalCount={totalCount}
        expanded={expanded}
        allLoaded={allLoaded}
        loadingAll={loadingAll}
        onToggle={() => setExpanded((v) => !v)}
        onLoadAll={onLoadAll}
      />
    </div>
  )
}

export function ProjectList({
  projects,
  totalCount,
  allLoaded,
  loadingAll,
  onLoadAll,
}: {
  projects: ProjectRecord[]
} & LazyListProps) {
  const navigate = useNavigate()
  const { expanded, setExpanded, visible, empty } = useLazyList(projects, totalCount, allLoaded)
  if (empty) return <EmptyRow label="No projects yet" />
  return (
    <div>
      {visible.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => navigate(`/projects/${p.id}`)}
          className="flex min-h-[68px] w-full items-center gap-3 border-b border-bd-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-bd-surface-muted/50 active:bg-bd-surface-muted"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bd-surface-muted text-bd-text-muted">
            <FolderKanban className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-black tracking-tight text-foreground">
              {p.name}
            </span>
            <span className="mt-1.5 flex items-center gap-2">
              <StatusPill status={String(p.status || 'active').toLowerCase()} />
              {typeof p.project_value === 'number' && p.project_value > 0 && (
                <>
                  <span className="text-[10px] text-muted-foreground/30">•</span>
                  <span className="truncate text-xs font-bold text-foreground">{formatCurrency(p.project_value)}</span>
                </>
              )}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </button>
      ))}
      <ListFooter
        visibleCount={visible.length}
        loadedCount={projects.length}
        totalCount={totalCount}
        expanded={expanded}
        allLoaded={allLoaded}
        loadingAll={loadingAll}
        onToggle={() => setExpanded((v) => !v)}
        onLoadAll={onLoadAll}
      />
    </div>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <p className="px-4 py-4 text-xs font-semibold text-muted-foreground">{label}</p>
}
