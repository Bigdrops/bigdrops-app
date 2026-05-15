import { ExternalLink, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { openInAI, AITarget } from '@/lib/openInAI'

const AI_OPTIONS: { label: string; value: AITarget }[] = [
  { label: 'ChatGPT', value: 'chatgpt' },
  { label: 'Gemini', value: 'gemini' },
  { label: 'Claude', value: 'claude' },
]

interface Props {
  prompt: string
  onClaudeCopy?: () => void
}

export function OpenInAIDropdown({ prompt, onClaudeCopy }: Props) {
  const handle = (value: AITarget) => {
    if (value === 'claude') onClaudeCopy?.()
    openInAI(value, prompt)
  }

  return (
    <DropdownMenu modal={false}>  {/* modal=false prevents Sheet focus-trap conflict */}
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-feedback-info,220_90%_45%))] bg-[hsl(var(--bd-status-info-bg,220_90%_96%))] hover:brightness-95 px-[var(--bd-space-md)] transition-colors gap-1"
        >
          <ExternalLink className="h-3 w-3" />
          Open in AI
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[200]">
        {AI_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => handle(opt.value)}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}