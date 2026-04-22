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
      <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-[#a7937e]">
        <SearchIcon />
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Search items"
        className="w-full rounded-xl border border-[#d4c2ad] bg-[#fbf5ec] py-[8px] pl-8 pr-8 text-[13px] text-[#2c2218] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-all duration-150 placeholder:text-[#ad9984] focus:border-[#a07a52] focus:bg-[#fffaf2] focus:ring-[3px] focus:ring-[#b79269]/15"
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-[#d2bfaa] bg-[#eadccd] text-[#5e4a36] transition-colors duration-150 hover:bg-[#e2d2bf]"
        >
          <ClearIcon />
        </button>
      ) : null}
    </div>
  )
}
