type Option = { key: string; label: string }

type MobileSegmentedControlProps = {
  options: Option[]
  value: string
  onChange: (value: string) => void
}

export default function MobileSegmentedControl({ options, value, onChange }: MobileSegmentedControlProps) {
  return (
    <div className="mt-3.5 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-muted p-1">
      {options.map((option) => {
        const active = option.key === value
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={active
              ? 'grid h-9 place-items-center rounded-xl bg-background text-[13px] font-semibold text-foreground shadow-sm'
              : 'grid h-9 place-items-center rounded-xl bg-transparent text-[13px] font-semibold text-muted-foreground'}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
