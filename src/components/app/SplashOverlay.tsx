import { cn } from '@/lib/utils'

type SplashOverlayProps = {
  visible: boolean
  tip: string
}

export default function SplashOverlay({ visible, tip }: SplashOverlayProps) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'fixed inset-0 z-[9999] flex items-center justify-center bg-[linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] transition-[opacity,visibility] duration-[260ms] ease-in-out',
        visible ? 'pointer-events-auto visible opacity-100' : 'pointer-events-none invisible opacity-0',
      )}
    >
      <div className="w-[min(92vw,390px)] rounded-[28px] border border-zinc-900/5 bg-white/85 px-6 pb-6 pt-7 text-center shadow-[0_18px_50px_rgba(24,24,27,0.07)] backdrop-blur-[10px]">
        <div className="relative mb-[18px] h-[148px] overflow-hidden rounded-[22px] border border-zinc-900/5 bg-[linear-gradient(180deg,#ffffff_0%,#f8f8f7_100%)]">
          {/* Paper and runner animations omitted for brevity */}
        </div>
        <div className="mb-2 text-2xl font-semibold tracking-[-0.02em] text-zinc-900">
          BigDrops
        </div>
        <div className="mx-auto min-h-[42px] max-w-[260px] text-[13px] leading-[1.6] text-zinc-500">
          {tip}
        </div>
      </div>
    </div>
  )
}
