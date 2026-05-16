import { ExternalLink } from 'lucide-react'

interface Props {
  prompt: string
  onClaudeCopy?: () => void
}

export function OpenInAIDropdown({ prompt }: Props) {
  const href = `https://gemini.google.com/app?q=${encodeURIComponent(prompt)}`

  const handleClick = () => {
    try {
      navigator.clipboard.writeText(prompt)
    } catch {
      // clipboard unavailable
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="inline-flex items-center gap-1 h-8 rounded-lg px-3 text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(217_91%_35%)] bg-[hsl(217_91%_60%/0.15)] hover:bg-[hsl(217_91%_60%/0.25)] transition-colors no-underline"
    >
      <ExternalLink className="h-3 w-3" />
      Open in Gemini
    </a>
  )
}