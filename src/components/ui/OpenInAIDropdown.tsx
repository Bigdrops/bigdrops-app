import * as React from 'react'
import { ExternalLink, ChevronDown } from 'lucide-react'
import { AI_PROVIDERS } from '@/lib/openInAI'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  prompt: string
  onProviderSelect?: (providerName: string, providerLabel: string) => void
  className?: string
}

export function OpenInAIDropdown({ prompt, onProviderSelect, className }: Props) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (provider: (typeof AI_PROVIDERS)[number]) => {
    void navigator.clipboard.writeText(prompt).catch(() => {})
    window.open(provider.buildUrl(prompt), '_blank', 'noopener,noreferrer')
    onProviderSelect?.(provider.name, provider.label)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Open in AI provider picker"
          aria-haspopup="menu"
          className={cn(
            "h-8 rounded-lg px-2 text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(217_91%_35%)] bg-[hsl(217_91%_60%/0.15)] hover:bg-[hsl(217_91%_60%/0.25)] transition-colors",
            className
          )}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open in AI
          <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1 z-50 rounded-md shadow-md border bg-popover">
        {AI_PROVIDERS.map((provider) => (
          <button
            key={provider.name}
            type="button"
            role="menuitem"
            onClick={() => handleSelect(provider)}
            className="flex w-full items-center px-2 py-1.5 text-xs text-left rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border-b border-border last:border-b-0"
          >
            {provider.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
