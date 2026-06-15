import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { AI_PROVIDERS } from '@/lib/openInAI'
import { cn } from '@/lib/utils'

interface OpenInAIDropdownProps {
  prompt: string
  onProviderSelect?: (providerName: string, providerLabel: string) => void
  onCloseAfterSelect?: () => void
  className?: string
  disabled?: boolean
}

export function OpenInAIDropdown({
  prompt,
  onProviderSelect,
  onCloseAfterSelect,
  className,
  disabled = false,
}: OpenInAIDropdownProps) {
  const [value, setValue] = React.useState("")

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "") return

    const provider = AI_PROVIDERS.find(p => p.name === e.target.value)
    if (!provider) return

    void navigator.clipboard.writeText(prompt).catch(() => {})
    window.open(provider.buildUrl(prompt), '_blank', 'noopener,noreferrer')
    onProviderSelect?.(provider.name, provider.label)
    onCloseAfterSelect?.()

    setTimeout(() => setValue(""), 0)
  }

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label="Open in AI provider picker"
        className="h-8 min-h-[44px] min-w-[44px] appearance-none rounded-lg pl-2 pr-7 text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(217_91%_35%)] bg-[hsl(217_91%_60%/0.15)] hover:bg-[hsl(217_91%_60%/0.25)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="" disabled hidden>
          Open in AI ↗
        </option>
        {AI_PROVIDERS.map((provider) => (
          <option key={provider.name} value={provider.name}>
            {provider.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 opacity-60" />
    </div>
  )
}
