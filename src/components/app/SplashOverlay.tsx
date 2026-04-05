import { cn } from '@/lib/utils'

type SplashOverlayProps = {
  visible: boolean
  tip: string
}

function PaperMark() {
  return (
    <div className="relative h-[96px] w-[96px]">
      <div className="absolute inset-0 rounded-[30px] border border-border/70 bg-card/95 shadow-xl shadow-black/5 backdrop-blur-sm" />
      <div className="absolute inset-[14px] rounded-[22px] bg-[radial-gradient(circle_at_top,hsla(var(--background),0.96),hsla(var(--card),0.92))]" />

      <div className="absolute left-[14px] top-[30px] h-[34px] w-[28px] rounded-[10px] border border-border/80 bg-background shadow-sm animate-[bd-paper-left_3.8s_ease-in-out_infinite]" />
      <div className="absolute right-[14px] top-[24px] h-[38px] w-[30px] rounded-[11px] border border-border/80 bg-background shadow-sm animate-[bd-paper-right_3.8s_ease-in-out_infinite]" />

      <div className="absolute left-1/2 top-1/2 h-[48px] w-[38px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border bg-card shadow-md animate-[bd-paper-center_3.8s_ease-in-out_infinite]">
        <div className="absolute right-[7px] top-[7px] h-[8px] w-[8px] rotate-45 rounded-[2px] border border-border/80 bg-background" />
        <div className="absolute left-[8px] top-[16px] h-[2px] w-[20px] rounded-full bg-foreground/10" />
        <div className="absolute left-[8px] top-[22px] h-[2px] w-[16px] rounded-full bg-foreground/10" />
        <div className="absolute left-[8px] top-[28px] h-[2px] w-[18px] rounded-full bg-foreground/10" />
      </div>

      <div className="absolute left-1/2 top-1/2 h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 animate-[bd-pulse-ring_2.8s_ease-out_infinite]" />
      <div className="absolute bottom-[14px] left-1/2 h-[6px] w-[6px] -translate-x-1/2 rounded-full bg-primary/80 shadow-[0_0_0_6px_hsla(var(--primary),0.12)] animate-pulse" />
    </div>
  )
}

export default function SplashOverlay({ visible, tip }: SplashOverlayProps) {
  return (
    <>
      <style>
        {`
          @keyframes bd-paper-left {
            0%, 100% { transform: translate3d(0, 0, 0) rotate(-13deg); }
            50% { transform: translate3d(-2px, -5px, 0) rotate(-9deg); }
          }

          @keyframes bd-paper-right {
            0%, 100% { transform: translate3d(0, 0, 0) rotate(12deg); }
            50% { transform: translate3d(2px, -4px, 0) rotate(16deg); }
          }

          @keyframes bd-paper-center {
            0%, 100% { transform: translate3d(-50%, -50%, 0); }
            50% { transform: translate3d(-50%, calc(-50% - 3px), 0); }
          }

          @keyframes bd-pulse-ring {
            0% { opacity: 0; transform: translate3d(-50%, -50%, 0) scale(0.9); }
            25% { opacity: 0.34; }
            100% { opacity: 0; transform: translate3d(-50%, -50%, 0) scale(1.12); }
          }
        `}
      </style>

      <div
        aria-hidden={!visible}
        className={cn(
          'fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-background px-6 transition-[opacity,visibility] duration-300 ease-out',
          visible ? 'pointer-events-auto visible opacity-100' : 'pointer-events-none invisible opacity-0',
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[18%] h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute left-[-80px] top-[14%] h-[220px] w-[220px] rounded-full bg-foreground/[0.03] blur-3xl" />
          <div className="absolute bottom-[14%] right-[-70px] h-[200px] w-[200px] rounded-full bg-foreground/[0.04] blur-3xl" />
        </div>

        <div className="relative flex w-full max-w-[360px] flex-col items-center text-center">
          <PaperMark />

          <div className="mt-7 text-[2.05rem] font-semibold tracking-[-0.035em] text-foreground sm:text-[2.25rem]">
            BigDrops
          </div>

          <div className="mt-2 min-h-[28px] max-w-[260px] text-sm leading-6 text-muted-foreground">
            {tip}
          </div>
        </div>
      </div>
    </>
  )
}