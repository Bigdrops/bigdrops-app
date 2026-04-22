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
      <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-[#b8b2a8]">
        <SearchIcon />
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Search items"
        className="w-full rounded-lg border border-[#dedad2] bg-[#f5f3ef] py-[7px] pl-8 pr-8 text-[13px] text-[#1a1814] outline-none transition-all duration-150 placeholder:text-[#b8b2a8] focus:border-[#4338ca] focus:bg-white focus:ring-[3px] focus:ring-[#4338ca]/10"
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#e4e0d8] text-[#57534a] transition-colors duration-150 hover:bg-[#dedad2]"
        >
          <ClearIcon />
        </button>
      ) : null}
    </div>
  )
}
