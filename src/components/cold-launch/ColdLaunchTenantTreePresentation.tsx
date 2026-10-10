import * as React from 'react'
import { RotateCw } from 'lucide-react'
import { useLoadingTip } from '@/hooks/useLoadingTip'
import {
  PreviewTree,
  type PreviewNetworkState,
} from '@/components/cold-launch/PreviewTree'
import {
  getPhotoHeroVars,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import bigdropsLogo from '../../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'

export type ColdLaunchTenantTreeVariant = 'original' | 'enhanced'

export type ColdLaunchTenantTreePresentationProps = {
  family?: PhotoHeroFamilyId
  appearance?: PhotoHeroAppearance
  variant?: ColdLaunchTenantTreeVariant
  networkState?: PreviewNetworkState
  isRunning?: boolean
  tipPathname?: string
  showConnectionFeedback?: boolean
  previewControls?: React.ReactNode
  closeButton?: React.ReactNode
  previewLabel?: React.ReactNode
  onRetry?: () => void
}

function ColdLaunchTips({ pathname }: { pathname: string }) {
  const { tip } = useLoadingTip({ pathname, active: true })
  const tipMessage = tip?.message?.trim() || 'Loading guidance...'

  return (
    <div className="clp-comm-tips">
      <div role="status" aria-live="polite" className="clp-tip-body">
        <span className="clp-tip-label">Quick tip</span>
        <p key={tip ? tip.id : 'fallback'} className="clp-tip-text">
          {tipMessage}
        </p>
      </div>
    </div>
  )
}

function resolveAmbientAppearance(): PhotoHeroAppearance {
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

/**
 * Approved Cold Launch V1 Tenant Tree presentation.
 *
 * This component is intentionally presentation-only. It does not own startup
 * readiness, session state, tenant selection, or preview routing. Preview tools
 * are passed as optional slots so production can render the same scene without
 * developer controls.
 */
export default function ColdLaunchTenantTreePresentation({
  family = 'slate-navy',
  appearance,
  variant = 'original',
  networkState = 'normal',
  isRunning = true,
  tipPathname = '/',
  showConnectionFeedback = false,
  previewControls = null,
  closeButton = null,
  previewLabel = null,
  onRetry,
}: ColdLaunchTenantTreePresentationProps) {
  const [brandTop, setBrandTop] = React.useState(0.44)
  const [ambientAppearance, setAmbientAppearance] =
    React.useState<PhotoHeroAppearance>(() => resolveAmbientAppearance())
  const resolvedAppearance = appearance ?? ambientAppearance
  const vars = React.useMemo(
    () => getPhotoHeroVars(family, resolvedAppearance),
    [family, resolvedAppearance],
  )
  const hasConnectionIssue = networkState === 'error' || networkState === 'retrying'

  React.useEffect(() => {
    if (appearance) return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setAmbientAppearance(resolveAmbientAppearance())
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [appearance])

  const setBrandRatio = React.useCallback((ratio: number) => {
    setBrandTop((prev) => (Math.abs(prev - ratio) < 0.002 ? prev : ratio))
  }, [])

  return (
    <main
      className={`clp ${isRunning ? 'clp-run' : ''}`}
      style={vars as React.CSSProperties}
      data-appearance={resolvedAppearance}
      data-variant={variant}
      data-network-state={networkState}
      data-controls={previewControls ? 'preview' : 'none'}
    >
      <style>{`
        .clp{
          --clp-top:82px;
          --clp-comm:218px;
          --clp-bg:var(--bg);
          --clp-surface:var(--surface);
          --clp-surface-raised:var(--surface-raised);
          --clp-surface-muted:var(--surface-muted);
          --clp-ink:var(--ink);
          --clp-ink-2:var(--ink-2);
          --clp-ink-3:var(--ink-3);
          --clp-on-fill:var(--cta-ink);
          --clp-accent:var(--primary);
          --clp-hot:var(--accent);
          --clp-secondary:var(--secondary);
          --clp-attention:var(--danger);
          --clp-line:color-mix(in srgb,var(--clp-accent) 26%,transparent);
          --clp-line-strong:color-mix(in srgb,var(--clp-accent) 42%,var(--line-strong));
          --clp-glass:var(--glass-bg);
          --clp-glass-line:var(--glass-line);
          --clp-glass-ink:var(--glass-ink);
          --clp-glass-shadow:var(--glass-shadow);
          --clp-node-surface:color-mix(in srgb,var(--clp-glass) 78%,var(--clp-surface-raised) 22%);
          --clp-node-muted:color-mix(in srgb,var(--clp-glass) 58%,var(--clp-surface) 42%);
          --clp-node-stroke:color-mix(in srgb,var(--clp-accent) 34%,var(--clp-ink) 18%);
          --clp-node-shadow:color-mix(in srgb,var(--clp-accent) 22%,var(--clp-glass-shadow));
          --clp-control-active:var(--cta-bg);
          --clp-control-active-ink:var(--cta-ink);
          --clp-lower-bg:linear-gradient(180deg,transparent,color-mix(in srgb,var(--clp-bg) 58%,transparent) 35%,color-mix(in srgb,var(--clp-bg) 92%,transparent));
          position:fixed;
          inset:0;
          z-index:9999;
          overflow:hidden;
          background:var(--scene-intro);
          color:var(--clp-ink);
          font-family:var(--bd-font-family,Manrope,system-ui,sans-serif);
          isolation:isolate;
          -webkit-font-smoothing:antialiased;
          text-rendering:optimizeLegibility;
        }
        .clp[data-appearance="dark"]{
          --clp-node-surface:color-mix(in srgb,var(--clp-glass) 72%,var(--clp-accent) 28%);
          --clp-node-muted:color-mix(in srgb,var(--clp-glass) 82%,var(--clp-surface-raised) 18%);
          --clp-node-stroke:color-mix(in srgb,var(--clp-accent) 38%,rgba(255,255,255,.34));
          --clp-lower-bg:linear-gradient(180deg,transparent,rgba(6,10,18,.42) 34%,rgba(3,6,12,.88));
        }
        .clp[data-appearance="light"]{
          --clp-line:color-mix(in srgb,var(--clp-accent) 30%,rgba(15,23,42,.12));
          --clp-line-strong:color-mix(in srgb,var(--clp-accent) 38%,rgba(15,23,42,.26));
          --clp-node-stroke:color-mix(in srgb,var(--clp-accent) 28%,rgba(15,23,42,.28));
          --clp-node-shadow:color-mix(in srgb,var(--clp-accent) 18%,rgba(15,23,42,.14));
        }
        .clp::before{
          content:"";
          position:absolute;
          inset:-22vh -22vw;
          background:
            radial-gradient(ellipse at 14% 16%,color-mix(in srgb,var(--field-c) 38%,transparent),transparent 31%),
            radial-gradient(ellipse at 84% 20%,color-mix(in srgb,var(--field-a) 34%,transparent),transparent 28%),
            radial-gradient(ellipse at 50% 47%,color-mix(in srgb,var(--field-b) 24%,transparent),transparent 30%),
            radial-gradient(ellipse at 48% 104%,color-mix(in srgb,var(--deep-b) 34%,transparent),transparent 42%),
            var(--scene-intro);
          z-index:0;
        }
        .clp::after{
          content:"";
          position:absolute;
          inset:0;
          background:
            var(--vignette),
            linear-gradient(rgba(128,128,128,.10) 1px,transparent 1px),
            linear-gradient(90deg,rgba(128,128,128,.08) 1px,transparent 1px);
          background-size:auto,34px 34px,34px 34px;
          mask-image:linear-gradient(180deg,transparent 0%,#000 20%,#000 78%,transparent 100%);
          -webkit-mask-image:linear-gradient(180deg,transparent 0%,#000 20%,#000 78%,transparent 100%);
          pointer-events:none;
          z-index:3;
        }
        .clp[data-controls="none"]{--clp-top:clamp(42px,7vh,72px)}
        .clp .clp-tree-wrap{position:absolute;left:0;right:0;top:var(--clp-top);bottom:var(--clp-comm);z-index:1;pointer-events:none}
        .clp .clp-tree{display:block;width:100%;height:100%;overflow:visible}
        .clp .clp-ring{fill:none;stroke:var(--clp-line-strong);stroke-width:1.2;stroke-dasharray:3 9;opacity:.72}
        .clp .clp-ring-soft{stroke:color-mix(in oklab,var(--clp-accent) 30%,transparent)}
        .clp-run .clp-ring{animation:clp-ring-in 6s cubic-bezier(.23,1,.32,1) both}
        @keyframes clp-ring-in{0%{opacity:0}12%,100%{opacity:.72}}
        .clp .clp-edge{fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:.78}
        .clp .clp-edge-primary{stroke:color-mix(in srgb,var(--clp-secondary) 72%,var(--clp-accent));stroke-width:2.75}
        .clp .clp-edge-secondary{stroke:color-mix(in srgb,var(--clp-accent) 82%,var(--clp-ink) 8%);stroke-width:2.35}
        .clp .clp-edge-extension{stroke:color-mix(in srgb,var(--clp-secondary) 54%,transparent);stroke-width:1.25;stroke-dasharray:.02 .045}
        .clp .clp-edge-hot,.clp .clp-edge-handoff{stroke:var(--clp-hot);stroke-width:3}
        .clp-run .clp-edge{stroke-dasharray:1;stroke-dashoffset:1;animation:clp-draw 6.5s cubic-bezier(.23,1,.32,1) both}
        @keyframes clp-draw{0%{stroke-dashoffset:1;opacity:0}8%{opacity:.92}28%,100%{stroke-dashoffset:0;opacity:.78}}
        .clp .clp-signal{fill:none;stroke:var(--clp-hot);stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:.08 .92;stroke-dashoffset:1;opacity:0;filter:url(#clp-glow)}
        .clp .clp-signal-primary{stroke:var(--clp-secondary);stroke-width:3.8}
        .clp .clp-signal-secondary{stroke:var(--clp-hot);stroke-width:3.5}
        .clp .clp-signal-extension{stroke:color-mix(in oklab,var(--clp-hot) 72%,transparent);stroke-width:2.45;stroke-dasharray:.055 .945}
        .clp .clp-signal-handoff{stroke:var(--clp-hot);stroke-width:3.6;stroke-dasharray:.065 .935}
        .clp[data-variant="original"] .clp-signal{display:none;stroke-width:2.6;filter:none}
        .clp[data-variant="enhanced"].clp-run .clp-signal{animation:clp-signal-travel 5.8s linear infinite}
        @keyframes clp-signal-travel{0%{stroke-dashoffset:1;opacity:0}8%{opacity:.9}34%{opacity:.9}56%,100%{stroke-dashoffset:-1;opacity:0}}
        .clp .clp-pulse{fill:none;stroke:var(--clp-hot);stroke-width:3.2;stroke-linecap:round;stroke-dasharray:.06 .94;stroke-dashoffset:.1;opacity:0;filter:url(#clp-glow)}
        .clp-run .clp-pulse{animation:clp-handoff 3s linear .45s infinite}
        @keyframes clp-handoff{0%{stroke-dashoffset:.1;opacity:0}12%{opacity:1}72%{opacity:1}100%{stroke-dashoffset:-.9;opacity:0}}
        .clp .clp-node{opacity:1}
        .clp-run .clp-node{animation:clp-pop 6s cubic-bezier(.23,1,.32,1) both}
        @keyframes clp-pop{0%{opacity:0;transform:translate(var(--fx,0px),var(--fy,0px)) scale(.92)}12%{opacity:1}30%,100%{opacity:1;transform:none}}
        .clp .clp-pill{fill:var(--clp-node-surface);stroke:var(--clp-node-stroke);stroke-width:1.45;filter:drop-shadow(0 14px 22px var(--clp-node-shadow))}
        .clp .clp-group-pill{fill:var(--clp-node-muted);stroke:color-mix(in srgb,var(--clp-accent) 38%,var(--clp-ink) 18%);stroke-width:1.7}
        .clp .clp-dot{fill:var(--clp-node-surface);stroke:color-mix(in srgb,var(--clp-secondary) 78%,var(--clp-ink) 8%);stroke-width:1.6}
        .clp .clp-n-hot .clp-pill{stroke:var(--clp-hot);stroke-width:2.1}
        .clp-run .clp-n-hot .clp-pill{animation:clp-node-wake 5.8s linear var(--wake-delay,0s) infinite}
        @keyframes clp-node-wake{0%,16%,100%{stroke-opacity:.8;filter:none}20%{stroke-opacity:1;filter:drop-shadow(0 0 9px color-mix(in oklab,var(--clp-hot) 52%,transparent))}28%{stroke-opacity:.9;filter:none}}
        .clp .clp-node text{font-family:'DM Mono',ui-monospace,monospace;fill:var(--clp-glass-ink)}
        .clp .clp-code{font-weight:650;letter-spacing:0}
        .clp .clp-glabel{font-weight:800;letter-spacing:.01em;fill:var(--clp-ink)}
        .clp .clp-gsub{fill:var(--clp-ink-2)}
        .clp .clp-n-hot .clp-code{fill:var(--clp-hot)}
        .clp[data-network-state="error"] .clp-affected-edge{stroke:color-mix(in oklab,var(--clp-attention) 42%,var(--clp-secondary));stroke-dasharray:.009 .015;opacity:.32!important;filter:none}
        .clp[data-network-state="error"] .clp-affected-signal{animation:clp-signal-fail 4.6s cubic-bezier(.65,0,.35,1) var(--break-delay,0s) infinite!important;stroke:color-mix(in oklab,var(--clp-attention) 50%,var(--clp-hot));stroke-width:2.4;filter:none}
        .clp[data-network-state="error"] .clp-affected-node{opacity:.5!important}
        .clp[data-network-state="error"] .clp-affected-node .clp-pill,.clp[data-network-state="error"] .clp-affected-node .clp-dot{animation:none!important;stroke:color-mix(in oklab,var(--clp-attention) 42%,var(--clp-ink-3))!important;filter:none!important}
        .clp[data-network-state="retrying"] .clp-affected-edge{stroke:color-mix(in oklab,var(--clp-hot) 74%,var(--clp-attention));opacity:.5!important}
        .clp[data-network-state="retrying"] .clp-affected-signal{animation:none!important;opacity:0!important}
        .clp[data-network-state="retrying"] .clp-recovery-signal{animation:clp-recovery-wave 2.2s cubic-bezier(.23,1,.32,1) var(--recover-delay,0s) both}
        .clp[data-network-state="retrying"] .clp-affected-node .clp-pill,.clp[data-network-state="retrying"] .clp-affected-node .clp-dot{animation:clp-recover-node 2.2s cubic-bezier(.23,1,.32,1) var(--recover-delay,0s) both!important}
        .clp .clp-recovery-signal{fill:none;stroke:var(--clp-hot);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:.09 .91;stroke-dashoffset:1;opacity:0;pointer-events:none;filter:url(#clp-glow)}
        @keyframes clp-signal-fail{0%{stroke-dashoffset:.74;opacity:0}20%{opacity:.5}54%{stroke-dashoffset:.5;opacity:.4}76%,100%{stroke-dashoffset:.44;opacity:0}}
        @keyframes clp-recovery-wave{0%{stroke-dashoffset:1;opacity:0}10%{opacity:1}72%{opacity:1}100%{stroke-dashoffset:-1;opacity:0}}
        @keyframes clp-recover-node{0%,45%{stroke-opacity:.4;filter:none}62%{stroke-opacity:1;filter:drop-shadow(0 0 12px color-mix(in oklab,var(--clp-hot) 64%,transparent))}100%{stroke-opacity:.9;filter:none}}
        .clp-brand{position:absolute;left:0;right:0;top:var(--clp-top);bottom:var(--clp-comm);z-index:20;pointer-events:none}
        .clp-brand-inner{position:absolute;left:50%;transform:translate(-50%,-50%);display:grid;place-items:center}
        .clp-brand::before{content:"";position:absolute;left:50%;top:50%;width:clamp(180px,44vmin,286px);height:clamp(126px,28vmin,190px);transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--clp-accent) 18%,var(--clp-bg) 36%) 0%,color-mix(in srgb,var(--clp-bg) 34%,transparent) 48%,transparent 76%);filter:blur(2px);z-index:-1}
        .clp-logo{width:clamp(58px,8.4vmin,92px);height:clamp(58px,8.4vmin,92px);border-radius:28%;box-shadow:0 0 0 1px color-mix(in srgb,var(--clp-ink) 17%,transparent),0 20px 68px color-mix(in srgb,var(--clp-secondary) 27%,transparent);animation:clp-idle 3.4s cubic-bezier(.77,0,.175,1) 6s infinite}
        .clp-logo img{width:100%;height:100%;border-radius:inherit;object-fit:cover}
        .clp-word{margin-top:10px;text-align:center;font-weight:850;font-size:clamp(17px,2.7vmin,28px);letter-spacing:.04em;color:var(--clp-ink);text-shadow:var(--mini-shadow)}
        @keyframes clp-idle{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
        .clp-controls{position:absolute;left:10px;right:64px;top:10px;z-index:40;display:flex;flex-wrap:wrap;row-gap:6px;column-gap:6px;align-items:center;max-width:calc(100% - 74px)}
        .clp-control-group{display:flex;gap:4px;align-items:center;border:1px solid var(--clp-glass-line);background:var(--clp-glass);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);box-shadow:0 18px 44px var(--clp-glass-shadow);border-radius:14px;padding:4px;max-width:100%;overflow-x:auto;scrollbar-width:none}
        .clp-control-group::-webkit-scrollbar{display:none}
        .clp-ctrl{min-height:44px;min-width:44px;border-radius:10px;padding:0 10px;color:var(--clp-ink-2);font:750 10px/1 var(--bd-font-family,Manrope,system-ui,sans-serif);letter-spacing:.01em;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:7px}
        .clp-ctrl[aria-selected="true"],.clp-ctrl[aria-pressed="true"]{background:var(--clp-control-active);color:var(--clp-control-active-ink)}
        .clp-swatch{width:10px;height:10px;border-radius:999px;background:var(--swatch);box-shadow:0 0 0 2px color-mix(in srgb,var(--clp-ink) 18%,transparent),0 0 16px var(--swatch)}
        .clp-ico{width:14px;height:14px}
        .clp-ctrl:focus-visible,.clp-close:focus-visible,.clp-retry:focus-visible{outline:2px solid var(--clp-hot);outline-offset:2px}
        .clp-close{position:absolute;right:10px;top:10px;z-index:45;display:grid;width:44px;height:44px;place-items:center;border-radius:14px;border:1px solid var(--clp-glass-line);background:var(--clp-glass);color:var(--clp-ink);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);box-shadow:0 18px 44px var(--clp-glass-shadow)}
        .clp-preview-label{position:absolute;left:14px;bottom:12px;z-index:30;max-width:min(360px,calc(100vw - 28px));color:var(--clp-ink-2);font-size:9.5px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}
        .clp-lower{position:absolute;left:0;right:0;bottom:0;height:var(--clp-comm);z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:10px;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));background:var(--clp-lower-bg);pointer-events:none}
        .clp-lower>*{pointer-events:auto}
        .clp-comm-tips{width:100%;display:grid;justify-items:center;order:2}
        .clp-tip-body{display:grid;gap:5px;justify-items:center;max-width:560px;padding:10px 16px;border:1px solid var(--clp-glass-line);border-radius:18px;background:var(--clp-glass);-webkit-backdrop-filter:blur(16px) saturate(150%);backdrop-filter:blur(16px) saturate(150%);box-shadow:0 18px 44px var(--clp-glass-shadow)}
        .clp-tip-label{color:var(--clp-ink-2);font-size:9px;font-weight:850;letter-spacing:.16em;text-transform:uppercase;font-family:var(--bd-font-family,Manrope,system-ui,sans-serif)}
        .clp-tip-text{margin:0;color:var(--clp-ink);font-size:13px;font-weight:650;line-height:1.5;max-width:52ch;text-wrap:balance;animation:clp-tip-fade .45s cubic-bezier(.23,1,.32,1) both}
        @keyframes clp-tip-fade{0%{opacity:1;transform:translateY(4px)}100%{opacity:1;transform:none}}
        .clp-comm-error{width:min(480px,100%);display:grid;gap:6px;justify-items:center;text-align:center;order:1}
        .clp-comm-eyebrow{color:var(--clp-attention);font-size:9.5px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}
        .clp-comm-text{margin:0;max-width:52ch;color:var(--clp-ink);font-size:13.5px;font-weight:700;line-height:1.45;text-wrap:balance}
        .clp-retry{margin:4px auto 0;display:inline-flex;min-height:44px;align-items:center;gap:8px;border-radius:999px;background:var(--clp-control-active);color:var(--clp-control-active-ink);padding:0 20px;font-size:13px;font-weight:850}
        .clp-retry:disabled{opacity:.75}
        .clp[data-network-state="retrying"] .clp-retry svg{animation:clp-retry-spin .9s linear infinite}
        @keyframes clp-retry-spin{to{transform:rotate(360deg)}}
        @media (min-width: 560px){.clp{--clp-top:92px;--clp-comm:204px}.clp-lower{gap:9px}}
        @media (min-width: 900px){.clp{--clp-comm:194px}.clp-lower{gap:8px}}
        @media (max-width:560px),(max-height:740px){
          .clp{--clp-top:154px;--clp-comm:198px}
          .clp[data-controls="none"]{--clp-top:calc(44px + env(safe-area-inset-top,0px))}
          .clp-controls{right:58px;gap:4px}
          .clp-controls .clp-control-group{max-width:calc(100vw - 78px)}
          .clp-control-group{padding:3px;border-radius:12px}
          .clp-ctrl{min-height:44px;padding:0 8px;font-size:9px}
          .clp-lower{gap:7px;padding-top:8px}
          .clp-comm-error{gap:4px}
          .clp-comm-text{font-size:12.5px;line-height:1.38}
          .clp-tip-body{gap:3px}
          .clp-tip-text{font-size:12px;line-height:1.38;max-width:44ch}
          .clp-retry{min-height:42px;padding:0 16px}
          .clp-preview-label{display:none}
        }
        @media (max-width: 360px){.clp-word{font-size:16px}}
        @media (min-width: 560px){.clp-controls{left:18px;top:16px;right:76px}.clp-close{right:18px;top:16px}}
        @media (max-width: 620px){.clp-controls{display:grid;grid-template-columns:minmax(0,1fr);align-items:start}.clp-control-group{width:100%}}
        @media (min-width: 900px){.clp-preview-label{left:22px;bottom:18px}}
        @media (prefers-reduced-transparency: reduce){.clp{--clp-glass:var(--clp-surface)}.clp-control-group,.clp-close,.clp-tip-body{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}}
        @media (prefers-reduced-motion: reduce){
          .clp *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
          .clp .clp-ring,.clp .clp-edge,.clp .clp-node,.clp .clp-pill,.clp .clp-dot{opacity:1!important;transform:none!important;stroke-dashoffset:0!important}
          .clp .clp-signal,.clp .clp-pulse{display:none!important}
          .clp .clp-tip-text{animation:none!important}
          .clp[data-network-state="error"] .clp-affected-edge{opacity:.4!important;stroke:color-mix(in oklab,var(--clp-attention) 48%,var(--clp-secondary))!important;stroke-dasharray:.009 .015!important}
          .clp[data-network-state="error"] .clp-affected-node{opacity:.5!important}
          .clp[data-network-state="retrying"] .clp-affected-edge{opacity:.85!important;stroke:var(--clp-hot)!important}
          .clp[data-network-state="retrying"] .clp-recovery-signal{display:none!important}
        }
      `}</style>

      <PreviewTree
        enhanced={variant === 'enhanced'}
        state={networkState}
        onBrandRatio={setBrandRatio}
      />

      <div className="clp-brand" aria-hidden="true">
        <div className="clp-brand-inner" style={{ top: `${(brandTop * 100).toFixed(2)}%` }}>
          <div className="clp-logo">
            <img src={bigdropsLogo} alt="" />
          </div>
          <div className="clp-word">BOURXE</div>
        </div>
      </div>

      {previewControls}
      {closeButton}

      <section className="clp-lower" aria-label="Launch guidance and connection feedback">
        {showConnectionFeedback && hasConnectionIssue ? (
          <div className="clp-comm-error" role="status" aria-live="polite">
            <span className="clp-comm-eyebrow">Connection issue</span>
            <p className="clp-comm-text">
              {networkState === 'retrying'
                ? 'Retrying connection - sending a recovery wave through the affected branches.'
                : "Some connections couldn't be reached. Check your internet connection and try again."}
            </p>
            {onRetry ? (
              <button
                type="button"
                className="clp-retry"
                onClick={onRetry}
                disabled={networkState === 'retrying'}
              >
                <RotateCw className="h-4 w-4" strokeWidth={2.4} />
                {networkState === 'retrying' ? 'Retrying connection' : 'Retry connection'}
              </button>
            ) : null}
          </div>
        ) : null}
        <ColdLaunchTips pathname={tipPathname} />
      </section>

      {previewLabel}
    </main>
  )
}
