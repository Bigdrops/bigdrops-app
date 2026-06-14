import * as React from 'react'
import { ExternalLink, ChevronDown } from 'lucide-react'
import { AI_PROVIDERS } from '@/lib/openInAI'
import { feedback } from '@/lib/feedback'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface Props {
  prompt: string
}

export function OpenInAIDropdown({ prompt }: Props) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (provider: (typeof AI_PROVIDERS)[number]) => {
    setOpen(false)
    try {
      navigator.clipboard.writeText(prompt)
    } catch {
      // clipboard unavailable — open tab anyway
    }
    window.open(provider.buildUrl(prompt), '_blank', 'noopener,noreferrer')
    feedback.info(`Opening ${provider.label} — prompt ready to paste if needed`)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-2 text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(217_91%_35%)] bg-[hsl(217_91%_60%/0.15)] hover:bg-[hsl(217_91%_60%/0.25)] transition-colors"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open in AI
          <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {AI_PROVIDERS.map((provider) => (
          <DropdownMenuItem
            key={provider.name}
            onSelect={() => handleSelect(provider)}
            className="text-xs cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 mr-2 opacity-70" />
            {provider.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}