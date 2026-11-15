import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useBoluAssistant } from './BoluAssistantProvider'
import launcherBot from '@/assets/clerk-launcher-bot.svg'
import './boluFab.css'

export function BoluFloatingActionButton({ className = '' }: { className?: string } = {}) {
  const { open, isOpen } = useBoluAssistant()
  const location = useLocation()

  // Suppress rendering if the assistant workspace is open
  if (isOpen) return null

  // Suppress rendering on Design Lab or debug routes for strict test isolation
  const pathname = location?.pathname ?? ''
  if (pathname.startsWith('/design-lab') || pathname.startsWith('/debug')) {
    return null
  }

  const handleClick = useCallback(() => {
    open('future-fab')
  }, [open])

  const maskStyle = {
    WebkitMaskImage: `url(${launcherBot})`,
    maskImage: `url(${launcherBot})`,
  }

  return (
    <aside
      className={`bolu-ai-fab-root ${className}`.trim()}
      aria-label="Bolu Assistant Launcher"
    >
      <div className="bolu-ai-fab-float">
        <div className="bolu-ai-fab-aura" aria-hidden="true" />
        <button
          type="button"
          onClick={handleClick}
          className="bolu-ai-fab-button group"
          aria-label="Open Bolu AI assistant"
          data-testid="bolu-floating-action-button"
        >
          <span
            className="bolu-ai-fab-glyph"
            style={maskStyle}
            aria-hidden="true"
          />
          <span className="bolu-ai-fab-dot" aria-hidden="true" />
        </button>
      </div>

      <div className="bolu-ai-fab-tooltip hidden md:flex" aria-hidden="true">
        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
        <span>Ask Bolu</span>
      </div>
    </aside>
  )
}
