import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { BxLogo } from '@/components/layout/bx-logo'
import { useLoadingTip } from '@/hooks/useLoadingTip'
import {
  getPhotoHeroVars,
  type PhotoHeroAppearance,
} from '@/components/onboarding/photo-hero-v2-theme'

type PageLoaderProps = {
  children?: ReactNode
  variant?: 'default' | 'startup'
  tipPathname?: string
}

function resolveStartupAppearance(): PhotoHeroAppearance {
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (root.classList.contains('dark')) return 'dark'
    if (root.classList.contains('light')) return 'light'
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }

  return 'dark'
}

function StartupPageLoader({
  children,
  tipPathname,
}: {
  children?: ReactNode
  tipPathname: string
}) {
  const [appearance, setAppearance] = useState<PhotoHeroAppearance>(() => resolveStartupAppearance())
  const vars = useMemo(() => getPhotoHeroVars('slate-navy', appearance), [appearance])
  const { tip } = useLoadingTip({ pathname: tipPathname, active: true })
  const tipMessage = tip?.message?.trim() || 'Loading guidance...'

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setAppearance(resolveStartupAppearance())
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return (
    <div
      className="bd-startup-loader"
      data-appearance={appearance}
      style={vars as CSSProperties}
    >
      <style>{`
        .bd-startup-loader{
          --loader-bg:var(--bg);
          --loader-ink:var(--ink);
          --loader-ink-2:var(--ink-2);
          --loader-accent:var(--primary);
          --loader-hot:var(--accent);
          --loader-glass:var(--glass-bg);
          --loader-line:var(--glass-line);
          --loader-shadow:var(--glass-shadow);
          min-height:100dvh;
          position:relative;
          overflow:hidden;
          display:grid;
          grid-template-rows:minmax(0,1fr) auto;
          place-items:center;
          gap:24px;
          padding:calc(24px + env(safe-area-inset-top,0px)) max(18px,env(safe-area-inset-left,0px)) calc(24px + env(safe-area-inset-bottom,0px)) max(18px,env(safe-area-inset-right,0px));
          background:
            radial-gradient(ellipse at 14% 16%,color-mix(in srgb,var(--field-c) 34%,transparent),transparent 31%),
            radial-gradient(ellipse at 84% 18%,color-mix(in srgb,var(--field-a) 32%,transparent),transparent 30%),
            radial-gradient(ellipse at 50% 70%,color-mix(in srgb,var(--field-b) 20%,transparent),transparent 34%),
            var(--scene-intro);
          color:var(--loader-ink);
          isolation:isolate;
          font-family:var(--bd-font-family,Manrope,system-ui,sans-serif);
          -webkit-font-smoothing:antialiased;
          text-rendering:optimizeLegibility;
        }
        .bd-startup-loader::before{
          content:"";
          position:absolute;
          inset:0;
          background:
            var(--vignette);
          background-size:auto;
          mask-image:linear-gradient(180deg,transparent 0%,#000 18%,#000 82%,transparent 100%);
          -webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 18%,#000 82%,transparent 100%);
          pointer-events:none;
          z-index:0;
        }
        .bd-startup-loader::after{
          content:"";
          position:absolute;
          left:50%;
          top:45%;
          width:clamp(170px,34vmin,270px);
          height:clamp(124px,25vmin,188px);
          transform:translate(-50%,-50%);
          border-radius:50%;
          background:radial-gradient(closest-side,color-mix(in srgb,var(--loader-accent) 18%,var(--loader-bg) 36%) 0%,color-mix(in srgb,var(--loader-bg) 34%,transparent) 50%,transparent 76%);
          filter:blur(2px);
          z-index:0;
        }
        .bd-startup-loader-main{
          position:relative;
          z-index:1;
          display:grid;
          place-items:center;
          align-self:center;
          gap:12px;
          transform:translateY(2vh);
        }
        .bd-startup-logo-card{
          display:grid;
          width:clamp(58px,9vmin,82px);
          height:clamp(58px,9vmin,82px);
          place-items:center;
          overflow:hidden;
          border-radius:28%;
          border:1px solid color-mix(in srgb,var(--loader-ink) 17%,transparent);
          background:color-mix(in srgb,var(--loader-glass) 78%,var(--surface-raised) 22%);
          box-shadow:
            0 20px 68px color-mix(in srgb,var(--secondary) 27%,transparent),
            0 10px 28px var(--loader-shadow);
        }
        .bd-startup-logo-card img{
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:inherit;
        }
        .bd-startup-word{
          margin:0;
          color:var(--loader-ink);
          font-size:clamp(17px,2.6vmin,24px);
          font-weight:850;
          letter-spacing:.04em;
          text-shadow:var(--mini-shadow);
        }
        .bd-startup-tip{
          position:relative;
          z-index:1;
          width:min(560px,100%);
          display:grid;
          justify-items:center;
          gap:5px;
          padding:12px 16px;
          border:1px solid var(--loader-line);
          border-radius:18px;
          background:var(--loader-glass);
          -webkit-backdrop-filter:blur(16px) saturate(150%);
          backdrop-filter:blur(16px) saturate(150%);
          box-shadow:0 18px 44px var(--loader-shadow);
          text-align:center;
        }
        .bd-startup-tip-label{
          color:var(--loader-ink-2);
          font-size:9px;
          font-weight:850;
          letter-spacing:.16em;
          text-transform:uppercase;
        }
        .bd-startup-tip-text{
          margin:0;
          max-width:52ch;
          color:var(--loader-ink);
          font-size:13px;
          font-weight:650;
          line-height:1.5;
          text-wrap:balance;
        }
        .bd-startup-loader-extra{
          position:relative;
          z-index:1;
          color:var(--loader-ink);
        }
        @media (max-width:560px),(max-height:740px){
          .bd-startup-loader{gap:18px;padding-top:calc(18px + env(safe-area-inset-top,0px));padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))}
          .bd-startup-loader-main{transform:translateY(1vh)}
          .bd-startup-tip{padding:10px 14px;gap:3px}
          .bd-startup-tip-text{font-size:12px;line-height:1.38;max-width:44ch}
        }
        @media (prefers-reduced-transparency: reduce){
          .bd-startup-tip{background:var(--surface);-webkit-backdrop-filter:none;backdrop-filter:none}
        }
        @media (prefers-reduced-motion: reduce){
          .bd-startup-loader *, .bd-startup-loader::before, .bd-startup-loader::after{
            animation-duration:.01ms!important;
            animation-iteration-count:1!important;
            transition-duration:.01ms!important;
          }
        }
      `}</style>
      <div className="bd-startup-loader-main">
        <div className="bd-startup-logo-card">
          <BxLogo className="h-full w-full rounded-[inherit]" />
        </div>
        <p className="bd-startup-word" aria-hidden="true">BOURXE</p>
      </div>
      <div className="bd-startup-tip" role="status" aria-live="polite">
        <span className="bd-startup-tip-label">Quick tip</span>
        <p key={tip ? tip.id : 'fallback'} className="bd-startup-tip-text">
          {tipMessage}
        </p>
      </div>
      {children ? <div className="bd-startup-loader-extra">{children}</div> : null}
    </div>
  )
}

export default function PageLoader({
  children,
  variant = 'default',
  tipPathname = '/',
}: PageLoaderProps = {}) {
  if (variant === 'startup') {
    return <StartupPageLoader tipPathname={tipPathname}>{children}</StartupPageLoader>
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="h-14 w-14 rounded-[18px] border border-zinc-900/10 bg-card shadow-[0_6px_18px_rgba(24,24,27,0.05)]" />
      {children}
    </div>
  )
}
