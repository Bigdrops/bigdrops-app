import { useBoluAssistant } from '@/components/ai-assistant/BoluAssistantProvider'

/** Dashboard entry point for the shared Bolu assistant runtime. */
export function DashboardAssistant() {
  const { open } = useBoluAssistant()

  return (
    <button
      type="button"
      aria-label="Ask Bolu, business assistant"
      aria-haspopup="dialog"
      className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] text-[10px] font-[800] tracking-[.01em] text-white shadow-[0_2px_6px_rgba(30,28,24,0.05),inset_0_1px_rgba(255,255,255,0.35)] transition active:scale-95"
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
      onClick={() => open('dashboard')}
    >
      AI
    </button>
  )
}
