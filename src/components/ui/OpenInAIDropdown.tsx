import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  prompt: string
  onClaudeCopy?: () => void
}

export function OpenInAIDropdown({ prompt }: Props) {
  const handleOpen = () => {
    try {
      navigator.clipboard.writeText(prompt)
    } catch {
      // clipboard unavailable
    }
    window.open(
      `https://gemini.google.com/app?q=${encodeURIComponent(prompt)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleOpen}
      className="h-8 rounded-lg text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(217_91%_35%)] bg-[hsl(217_91%_60%/0.15)] hover:bg-[hsl(217_91%_60%/0.25)] px-[var(--bd-space-md)] transition-colors gap-1"
    >
      <ExternalLink className="h-3 w-3" />
      Open in Gemini
    </Button>
  )
}