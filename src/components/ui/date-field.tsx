import * as React from "react"

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  addMonths,
  formatIsoDisplay,
  getMonthGrid,
  getWeekdayLabels,
  isOutOfRange,
  parseIsoDate,
  todayIso,
  toIsoDate,
} from "@/components/ui/date-helpers"

export type { CalendarDay, IsoDate } from "@/components/ui/date-helpers"
export {
  addMonths,
  compareIso,
  formatIsoDisplay,
  getMonthGrid,
  getWeekdayLabels,
  isIsoDateString,
  parseIsoDate,
  toIsoDate,
} from "@/components/ui/date-helpers"

/**
 * Shared app-controlled date field.
 *
 * Replaces the native date input where the Android/WebView native
 * picker dialog renders malformed (oversized empty surface, displaced
 * selection, stranded actions, wrong theme). The native dialog is
 * OS-rendered and cannot be styled reliably from web CSS, so this component
 * renders its own bottom-sheet month calendar using BIGDROPS theme tokens.
 *
 * Value contract is identical to the native input: `''` or `YYYY-MM-DD`.
 * Stored and submitted date semantics are unchanged. Display is derived by
 * splitting the ISO string (never `new Date(value)`), so no timezone shift
 * can alter the shown or emitted date.
 */

export interface DateFieldProps {
  value: string
  onChange: (next: string) => void
  /** Accessible name, e.g. "Quotation Date". Rendered as SheetTitle and aria-label. */
  label: string
  className?: string
  placeholder?: string
  disabled?: boolean
  /** Marks the trigger with an error border. Visual only; validation stays app-level. */
  invalid?: boolean
  /** Inclusive bounds as `YYYY-MM-DD`. Out-of-range days are disabled. */
  min?: string
  max?: string
  id?: string
}

function MonthCalendar({
  initial,
  min,
  max,
  onCancel,
  onClear,
  onSet,
}: {
  initial: string
  min?: string
  max?: string
  onCancel: () => void
  onClear: () => void
  onSet: (next: string) => void
}) {
  const today = React.useMemo(() => todayIso(), [])
  const start = parseIsoDate(initial) ?? parseIsoDate(today) ?? { y: 2000, m: 1, d: 1 }
  const [view, setView] = React.useState({ y: start.y, m: start.m })
  const [pending, setPending] = React.useState(initial)

  const weeks = React.useMemo(() => getMonthGrid(view.y, view.m), [view])
  const weekdayLabels = React.useMemo(() => getWeekdayLabels(), [])
  const monthLabel = React.useMemo(
    () => new Date(view.y, view.m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    [view],
  )

  const go = (delta: number) => {
    setView((v) => {
      const next = addMonths(v.y, v.m, delta)
      return { y: next.y, m: next.m }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous month"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-bd-overlay-text transition hover:bg-bd-overlay-muted active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 truncate text-center text-[15px] font-bold text-bd-overlay-text" aria-live="polite">
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next month"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-bd-overlay-text transition hover:bg-bd-overlay-muted active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div role="grid" aria-label="Choose a day" className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label, i) => (
          <div
            key={i}
            className="flex h-8 items-center justify-center text-[11px] font-bold uppercase text-bd-overlay-muted"
            aria-hidden="true"
          >
            {label}
          </div>
        ))}
        {weeks.flat().map((day) => {
          const iso = toIsoDate(day.y, day.m, day.d)
          const selected = pending !== "" && iso === pending
          const isToday = iso === today
          const disabled = isOutOfRange(iso, min, max)
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              disabled={disabled}
              aria-label={new Date(day.y, day.m - 1, day.d).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              aria-current={selected ? "date" : undefined}
              onClick={() => setPending(iso)}
              className={cn(
                "flex h-10 w-full items-center justify-center rounded-full text-[14px] tabular-nums transition active:scale-95",
                !day.inMonth && "opacity-30",
                disabled && "cursor-not-allowed opacity-25",
                selected
                  ? "bg-bd-button-primary-bg font-bold text-bd-button-primary-text shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                  : "font-medium text-bd-overlay-text hover:bg-bd-overlay-muted",
                !selected && isToday && "ring-1 ring-bd-button-primary-bg",
              )}
            >
              {day.d}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-bd-overlay-border pt-3">
        <button
          type="button"
          onClick={onClear}
          className="flex h-11 items-center justify-center rounded-[var(--bd-radius-md)] text-[13px] font-bold uppercase tracking-wide text-bd-overlay-text transition hover:bg-bd-overlay-muted active:scale-[0.98]"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 items-center justify-center rounded-[var(--bd-radius-md)] text-[13px] font-bold uppercase tracking-wide text-bd-overlay-text transition hover:bg-bd-overlay-muted active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSet(pending)}
          disabled={pending === "" || isOutOfRange(pending, min, max)}
          className="flex h-11 items-center justify-center rounded-[var(--bd-radius-md)] bg-bd-button-primary-bg text-[13px] font-bold uppercase tracking-wide text-bd-button-primary-text shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition active:scale-[0.98] disabled:opacity-40"
        >
          Set
        </button>
      </div>
    </div>
  )
}

function DateField({ value, onChange, label, className, placeholder, disabled, invalid, min, max, id }: DateFieldProps) {
  const [open, setOpen] = React.useState(false)
  const initialRef = React.useRef(value)
  const display = formatIsoDisplay(value ?? "", placeholder)

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={() => {
          initialRef.current = value ?? ""
          setOpen(true)
        }}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-[var(--bd-radius-md)] border border-bd-border bg-bd-surface px-3 text-left text-[14px] shadow-none transition focus-visible:border-bd-button-primary-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-button-primary-bg/15 disabled:cursor-not-allowed disabled:opacity-50",
          value ? "font-medium text-bd-text" : "text-bd-text-muted",
          invalid && "border-red-400",
          className,
        )}
      >
        <span className="truncate tabular-nums">{display}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-bd-text-muted" aria-hidden="true" />
      </button>

      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false)
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-label={label}
          className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3"
        >
          <SheetTitle className="mb-2 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] text-bd-overlay-muted">
            {label}
          </SheetTitle>
          {open && (
            <MonthCalendar
              initial={initialRef.current}
              min={min}
              max={max}
              onCancel={() => setOpen(false)}
              onClear={() => {
                if (initialRef.current !== "") onChange("")
                setOpen(false)
              }}
              onSet={(next) => {
                if (next !== initialRef.current) onChange(next)
                setOpen(false)
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

export { DateField }
