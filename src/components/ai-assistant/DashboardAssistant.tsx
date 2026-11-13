import { useState } from 'react'

import { AssistantSheet } from '@/components/ai-assistant/AssistantSheet'

/**
 * The dashboard header entry point. It replaces a button that had no handler,
 * so a tap did nothing at all.
 */
export function DashboardAssistant() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Ask AI assistant"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] text-[10px] font-[800] tracking-[.01em] text-white shadow-[0_2px_6px_rgba(30,28,24,0.05),inset_0_1px_rgba(255,255,255,0.35)] transition active:scale-95"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
      >
        AI
      </button>
      <AssistantSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
