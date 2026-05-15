import { ChevronDown, ExternalLink } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { openInAI, type AITarget } from '@/lib/openInAI'

interface Props {
  prompt: string
  onClaudeCopy?: () => void
}

const TARGETS: { key: AITarget; label: string }[] = [
  { key: 'chatgpt', label: 'ChatGPT' },
  { key: 'gemini', label: 'Gemini' },
  { key: 'claude', label: 'Claude' },
]

export function OpenInAIDropdown({ prompt, onClaudeCopy }: Props) {
  const handleSelect = (target: AITarget) => {
    if (target === 'claude' && onClaudeCopy) {
      onClaudeCopy()
    }
    openInAI(target, prompt)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-feedback-success))] bg-[hsl(var(--bd-status-success-bg))] hover:brightness-95 px-[var(--bd-space-md)] transition-colors"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open in AI
          <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {TARGETS.map(({ key, label }) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handleSelect(key)}
            className="text-xs font-semibold"
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
