import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

/**
 * A stable, searchable selection component.
 * Designed to be used inside Popovers on desktop and Sheets on mobile.
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
}: ComboboxProps) {
  const [search, setSearch] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    const lowerSearch = search.toLowerCase()
    return options.filter((opt) => 
      opt.label.toLowerCase().includes(lowerSearch) || 
      opt.value.toLowerCase().includes(lowerSearch) ||
      (opt.description && opt.description.toLowerCase().includes(lowerSearch))
    )
  }, [options, search])

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          disabled={disabled}
          className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Options List */}
      <div className="max-h-[300px] overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-sm bd-custom-scrollbar">
        {filteredOptions.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <div className="grid gap-1">
            {filteredOptions.map((option) => {
              const isSelected = value === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted active:scale-[0.99]",
                    isSelected && "bg-muted/50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {option.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
