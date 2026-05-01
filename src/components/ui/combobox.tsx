import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"

import { useLayoutMode } from "@/hooks/useLayoutMode"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

type ComboboxStrategy = "auto" | "popover" | "drawer"
type ComboboxMobileBehavior = "drawer" | "popover"
type ComboboxDesktopBehavior = "popover" | "inline"

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  strategy?: ComboboxStrategy
  mobileBehavior?: ComboboxMobileBehavior
  desktopBehavior?: ComboboxDesktopBehavior
  title?: string
  trigger?: React.ReactNode
  hideTrigger?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  footer?: React.ReactNode
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  filterOptions?: boolean
  contentClassName?: string
  listClassName?: string
}

function ComboboxPanel({
  options,
  value,
  onSelect,
  search,
  onSearchChange,
  searchPlaceholder,
  emptyText,
  footer,
  filterOptions,
  listClassName,
}: {
  options: ComboboxOption[]
  value?: string
  onSelect: (value: string) => void
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  emptyText: string
  footer?: React.ReactNode
  filterOptions: boolean
  listClassName?: string
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    const raf = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(raf)
  }, [])

  const filteredOptions = React.useMemo(() => {
    if (!filterOptions || !search.trim()) return options

    const lowerSearch = search.toLowerCase()
    return options.filter((option) => {
      return (
        option.label.toLowerCase().includes(lowerSearch) ||
        option.value.toLowerCase().includes(lowerSearch) ||
        option.description?.toLowerCase().includes(lowerSearch)
      )
    })
  }, [filterOptions, options, search])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-[var(--bd-radius-md)] border border-[hsl(var(--bd-input-border))] bg-[hsl(var(--bd-input-bg))] pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-[hsl(var(--bd-input-focus))] focus-visible:ring-2 focus-visible:ring-ring/30"
        />
      </div>

      <div
        className={cn(
          "max-h-[min(18rem,calc(100vh-12rem))] overflow-y-auto rounded-[var(--bd-radius-md)] border border-border bg-card p-1 shadow-sm bd-custom-scrollbar",
          listClassName,
        )}
      >
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <div className="grid gap-1">
            {filteredOptions.map((option) => {
              const isSelected = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSelect(option.value)}
                  className={cn(
                    "grid min-h-11 w-full grid-cols-[minmax(0,1fr),auto] items-center gap-3 rounded-[calc(var(--bd-radius-md)-2px)] px-3 py-2 text-left text-sm transition-colors hover:bg-muted active:scale-[0.99]",
                    isSelected && "bg-muted/70",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{option.label}</div>
                    {option.description ? (
                      <div className="truncate pt-0.5 text-[11px] text-muted-foreground">{option.description}</div>
                    ) : null}
                  </div>
                  <Check className={cn("h-4 w-4 shrink-0 text-primary", !isSelected && "opacity-0")} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {footer}
    </div>
  )
}

/**
 * Searchable picker surface with a single responsive contract:
 * desktop/tablet uses popover by default, mobile uses drawer by default.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  disabled = false,
  strategy = "auto",
  mobileBehavior = "drawer",
  desktopBehavior = "popover",
  title = "Select option",
  trigger,
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange,
  footer,
  searchValue,
  onSearchValueChange,
  filterOptions = true,
  contentClassName,
  listClassName,
}: ComboboxProps) {
  const { layoutMode } = useLayoutMode()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [internalSearch, setInternalSearch] = React.useState("")

  const open = controlledOpen ?? internalOpen
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(nextOpen)
      onOpenChange?.(nextOpen)
      if (!nextOpen && searchValue === undefined) setInternalSearch("")
    },
    [controlledOpen, onOpenChange, searchValue],
  )

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  )

  const search = searchValue ?? internalSearch
  const setSearch = onSearchValueChange ?? setInternalSearch

  const resolvedStrategy =
    strategy === "auto"
      ? layoutMode === "mobile"
        ? mobileBehavior
        : desktopBehavior
      : strategy

  const panel = (
    <ComboboxPanel
      options={options}
      value={value}
      onSelect={(nextValue) => {
        onChange(nextValue)
        if (resolvedStrategy !== "inline") setOpen(false)
      }}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      footer={footer}
      filterOptions={filterOptions}
      listClassName={listClassName}
    />
  )

  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      className={cn(
        "h-10 w-full justify-between rounded-[var(--bd-radius-md)] border-[hsl(var(--bd-input-border))] bg-[hsl(var(--bd-input-bg))] px-3 text-sm font-medium text-foreground shadow-none",
        !selectedOption && "text-muted-foreground",
      )}
    >
      <span className="min-w-0 truncate text-left">{selectedOption?.label || placeholder}</span>
      <ChevronsUpDown className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
    </Button>
  )

  if (resolvedStrategy === "inline") {
    return <div className={cn("flex flex-col gap-2", className)}>{panel}</div>
  }

  if (resolvedStrategy === "drawer") {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        {!hideTrigger ? (
          <SheetTrigger asChild>
            <div className={className}>{trigger || defaultTrigger}</div>
          </SheetTrigger>
        ) : null}
        <SheetContent side="bottom" showCloseButton={false} className={cn("rounded-t-[28px] px-4 pb-8 pt-2", contentClassName)}>
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
          <SheetHeader className="mb-4 px-1 pb-0 pt-0 text-left">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {!hideTrigger ? (
        <PopoverTrigger asChild>
          <div className={className}>{trigger || defaultTrigger}</div>
        </PopoverTrigger>
      ) : null}
      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn("w-[min(var(--radix-popover-trigger-width),calc(100vw-2rem))] max-w-[26rem] p-3", contentClassName)}
      >
        {panel}
      </PopoverContent>
    </Popover>
  )
}
