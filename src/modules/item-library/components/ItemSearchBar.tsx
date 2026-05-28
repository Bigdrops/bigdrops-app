type ItemSearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function ItemSearchBar({
  value,
  onChange,
  placeholder = 'Search items...',
  className = '',
}: ItemSearchBarProps) {
  return (
    <div className={`relative ${className}`.trim()}>
      <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-bd-text-muted">
        <SearchIcon />
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Search items"
        className="w-full rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-card-bg py-[8px] pl-8 pr-8 text-[13px] text-bd-text shadow-sm outline-none transition-all duration-150 placeholder:text-bd-text-muted/60 focus:border-bd-button-primary-bg focus:ring-2 focus:ring-bd-button-primary-bg/10"
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-bd-border bg-bd-surface-muted text-bd-text-muted transition-colors duration-150 hover:text-bd-text"
        >
          <ClearIcon />
        </button>
      ) : null}
    </div>
  )
}
