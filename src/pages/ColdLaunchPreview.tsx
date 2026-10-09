import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCw, X } from 'lucide-react'
import LoadingTips from '@/components/loading/LoadingTips'
import {
  PreviewTree,
  type PreviewNetworkState,
} from '@/components/cold-launch/PreviewTree'
import bigdropsLogo from '../../android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'

type Variant = 'original' | 'enhanced'

const VARIANTS: Array<{ key: Variant; label: string }> = [
  { key: 'original', label: 'Tree Original' },
  { key: 'enhanced', label: 'Tree + Beams' },
]

/**
 * Isolated cold-launch design preview. Preview only: it never reads startup
 * readiness state and never renders production startup components.
 *
 * Surfaces stay dark cinematic (fixed values). Accents follow the selected
 * BIGDROPS visual theme live through HSL-triplet tokens, so switching themes
 * never remounts the tree.
 */
export default function ColdLaunchPreview() {
  const navigate = useNavigate()
  const [variant, setVariant] = React.useState<Variant>('original')
  const [networkState, setNetworkState] = React.useState<PreviewNetworkState>('normal')
  const [isRunning, setIsRunning] = React.useState(true)
  const retryTimer = React.useRef<number | null>(null)
  const replayFrame = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current)
      if (replayFrame.current !== null) window.cancelAnimationFrame(replayFrame.current)
    }
  }, [])

  const close = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }, [navigate])

  const replay = React.useCallback(() => {
    setIsRunning(false)
    if (replayFrame.current !== null) window.cancelAnimationFrame(replayFrame.current)
    replayFrame.current = window.requestAnimationFrame(() => {
      replayFrame.current = window.requestAnimationFrame(() => {
        setIsRunning(true)
        replayFrame.current = null
      })
    })
  }, [])

  const setNormal = React.useCallback(() => {
    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
    setNetworkState('normal')
  }, [])

  const setError = React.useCallback(() => {
    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
    setNetworkState('error')
  }, [])

  const runPreviewRetry = React.useCallback(() => {
    if (retryTimer.current !== null) window.clearTimeout(retryTimer.current)
    setNetworkState('retrying')
    retryTimer.current = window.setTimeout(() => {
      setNetworkState('normal')
      retryTimer.current = null
    }, 2_400)
  }, [])

  const hasConnectionIssue = networkState === 'error' || networkState === 'retrying'

  return (
    <main
      className={`clp ${isRunning ? 'clp-run' : ''}`}
      data-variant={variant}
      data-network-state={networkState}
    >
      <style>{`
        .clp{
          --clp-bg:#14100c;
          --clp-surface:#221b14;
          --clp-surface-raised:#2a2118;
          --clp-surface-muted:#33291c;
          --clp-ink:#f5efe4;
          --clp-ink-2:#c9bda9;
          --clp-ink-3:#8a7d68;
          --clp-on-dark:#14100c;
          --clp-accent:hsl(var(--primary, 36 93% 51%));
          --clp-hot:hsl(var(--primary-bright, 45 96% 56%));
          --clp-secondary:hsl(var(--secondary, 24 96% 60%));
          --clp-attention:color-mix(in oklab, hsl(var(--attention, 0 84% 63%)) 82%, #ffffff);
          --clp-line:rgba(245,239,228,.09);
          --clp-line-strong:rgba(245,239,228,.17);
          --clp-dark:color-mix(in oklab,var(--clp-bg) 42%,#090807 58%);
          position:fixed;
          inset:0;
          overflow:hidden;
          background:var(--clp-dark);
          color:var(--clp-ink);
          font-family:var(--bd-font-family,Manrope,system-ui,sans-serif);
          isolation:isolate;
        }
        .clp::before{
          content:"";
          position:absolute;
          inset:-22vh -22vw;
          background:
            radial-gradient(circle at 50% 44%,color-mix(in oklab,var(--clp-hot) 15%,transparent),transparent 24%),
            radial-gradient(circle at 16% 18%,color-mix(in oklab,var(--clp-secondary) 11%,transparent),transparent 27%),
            radial-gradient(circle at 82% 28%,color-mix(in oklab,var(--clp-accent) 9%,transparent),transparent 25%),
            linear-gradient(180deg,color-mix(in oklab,var(--clp-bg) 52%,#12100e),#090807 72%,color-mix(in oklab,var(--clp-surface) 36%,#0d0b09));
          z-index:0;
        }
        .clp::after{
          content:"";
          position:absolute;
          inset:0 0 auto;
          height:min(26vh,160px);
          background:linear-gradient(180deg,rgba(8,7,6,.4),transparent);
          pointer-events:none;
          z-index:3;
        }
        .clp .clp-tree-wrap{position:absolute;inset:0;z-index:1;pointer-events:none}
        .clp .clp-tree{display:block;width:100%;height:100%;overflow:visible}
        .clp .clp-ring{fill:none;stroke:var(--clp-line-strong);stroke-width:1.2;stroke-dasharray:3 9;opacity:0}
        .clp .clp-ring-soft{stroke:color-mix(in oklab,var(--clp-accent) 30%,transparent)}
        .clp-run .clp-ring{animation:clp-ring-in 6s cubic-bezier(.23,1,.32,1) both}
        @keyframes clp-ring-in{0%{opacity:0}12%,100%{opacity:.72}}
        .clp .clp-edge{fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:0}
        .clp .clp-edge-primary{stroke:var(--clp-secondary);stroke-width:2.75}
        .clp .clp-edge-secondary{stroke:var(--clp-accent);stroke-width:2.35}
        .clp .clp-edge-extension{stroke:color-mix(in oklab,var(--clp-secondary) 54%,transparent);stroke-width:1.25;stroke-dasharray:.02 .045}
        .clp .clp-edge-hot,.clp .clp-edge-handoff{stroke:var(--clp-hot);stroke-width:3}
        .clp-run .clp-edge{stroke-dasharray:1;stroke-dashoffset:1;animation:clp-draw 6.5s cubic-bezier(.23,1,.32,1) both}
        @keyframes clp-draw{0%{stroke-dashoffset:1;opacity:0}8%{opacity:.92}28%,100%{stroke-dashoffset:0;opacity:.78}}
        .clp .clp-signal{fill:none;stroke:var(--clp-hot);stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:.08 .92;stroke-dashoffset:1;opacity:0;filter:url(#clp-glow)}
        .clp .clp-signal-primary{stroke:var(--clp-secondary);stroke-width:3.8}
        .clp .clp-signal-secondary{stroke:var(--clp-hot);stroke-width:3.5}
        .clp .clp-signal-extension{stroke:color-mix(in oklab,var(--clp-hot) 72%,transparent);stroke-width:2.45;stroke-dasharray:.055 .945}
        .clp .clp-signal-handoff{stroke:var(--clp-hot);stroke-width:3.6;stroke-dasharray:.065 .935}
        .clp[data-variant="original"] .clp-signal{stroke-width:2.6;filter:none}
        .clp-run .clp-signal{animation:clp-signal-travel 5.8s linear infinite}
        @keyframes clp-signal-travel{0%{stroke-dashoffset:1;opacity:0}8%{opacity:.9}34%{opacity:.9}56%,100%{stroke-dashoffset:-1;opacity:0}}
        .clp .clp-pulse{fill:none;stroke:var(--clp-hot);stroke-width:3.2;stroke-linecap:round;stroke-dasharray:.06 .94;stroke-dashoffset:.1;opacity:0;filter:url(#clp-glow)}
        .clp-run .clp-pulse{animation:clp-handoff 3s linear .45s infinite}
        @keyframes clp-handoff{0%{stroke-dashoffset:.1;opacity:0}12%{opacity:1}72%{opacity:1}100%{stroke-dashoffset:-.9;opacity:0}}
        .clp .clp-node{opacity:0}
        .clp-run .clp-node{animation:clp-pop 6s cubic-bezier(.23,1,.32,1) both}
        @keyframes clp-pop{0%{opacity:0;transform:translate(var(--fx,0px),var(--fy,0px)) scale(.92)}12%{opacity:1}30%,100%{opacity:1;transform:none}}
        .clp .clp-pill{fill:color-mix(in oklab,var(--clp-surface-raised) 95%,transparent);stroke:color-mix(in oklab,var(--clp-ink) 28%,transparent);stroke-width:1.5}
        .clp .clp-group-pill{fill:color-mix(in oklab,var(--clp-surface-muted) 93%,transparent);stroke:color-mix(in oklab,var(--clp-ink) 24%,transparent)}
        .clp .clp-dot{fill:var(--clp-surface-raised);stroke:color-mix(in oklab,var(--clp-secondary) 72%,transparent);stroke-width:1.6}
        .clp .clp-n-hot .clp-pill{stroke:var(--clp-hot);stroke-width:2.1}
        .clp-run .clp-n-hot .clp-pill{animation:clp-node-wake 5.8s linear var(--wake-delay,0s) infinite}
        @keyframes clp-node-wake{0%,16%,100%{stroke-opacity:.8;filter:none}20%{stroke-opacity:1;filter:drop-shadow(0 0 9px color-mix(in oklab,var(--clp-hot) 52%,transparent))}28%{stroke-opacity:.9;filter:none}}
        .clp .clp-node text{font-family:'DM Mono',ui-monospace,monospace;fill:var(--clp-ink)}
        .clp .clp-code{font-weight:650;letter-spacing:0}
        .clp .clp-glabel{font-weight:750;letter-spacing:.02em;fill:var(--clp-ink)}
        .clp .clp-gsub{fill:var(--clp-ink-2)}
        .clp .clp-n-hot .clp-code{fill:var(--clp-hot)}
        .clp[data-network-state="error"] .clp-affected-edge{
          stroke:color-mix(in oklab,var(--clp-attention) 42%,var(--clp-secondary));
          stroke-dasharray:.009 .015;
          opacity:.32!important;
          filter:none;
        }
        .clp[data-network-state="error"] .clp-affected-signal{
          animation:clp-signal-fail 4.6s cubic-bezier(.65,0,.35,1) var(--break-delay,0s) infinite!important;
          stroke:color-mix(in oklab,var(--clp-attention) 50%,var(--clp-hot));
          stroke-width:2.4;
          filter:none;
        }
        .clp[data-network-state="error"] .clp-affected-node{
          opacity:.5!important;
        }
        .clp[data-network-state="error"] .clp-affected-node .clp-pill,
        .clp[data-network-state="error"] .clp-affected-node .clp-dot{
          animation:none!important;
          stroke:color-mix(in oklab,var(--clp-attention) 42%,var(--clp-ink-3))!important;
          filter:none!important;
        }
        .clp[data-network-state="retrying"] .clp-affected-edge{
          stroke:color-mix(in oklab,var(--clp-hot) 74%,var(--clp-attention));
          opacity:.5!important;
        }
        .clp[data-network-state="retrying"] .clp-affected-signal{
          animation:none!important;
          opacity:0!important;
        }
        .clp[data-network-state="retrying"] .clp-recovery-signal{
          animation:clp-recovery-wave 2.2s cubic-bezier(.23,1,.32,1) var(--recover-delay,0s) both;
        }
        .clp[data-network-state="retrying"] .clp-affected-node .clp-pill,
        .clp[data-network-state="retrying"] .clp-affected-node .clp-dot{
          animation:clp-recover-node 2.2s cubic-bezier(.23,1,.32,1) var(--recover-delay,0s) both!important;
        }
        .clp .clp-recovery-signal{
          fill:none;
          stroke:var(--clp-hot);
          stroke-width:5;
          stroke-linecap:round;
          stroke-linejoin:round;
          stroke-dasharray:.09 .91;
          stroke-dashoffset:1;
          opacity:0;
          pointer-events:none;
          filter:url(#clp-glow);
        }
        @keyframes clp-signal-fail{0%{stroke-dashoffset:.74;opacity:0}20%{opacity:.5}54%{stroke-dashoffset:.5;opacity:.4}76%,100%{stroke-dashoffset:.44;opacity:0}}
        @keyframes clp-recovery-wave{0%{stroke-dashoffset:1;opacity:0}10%{opacity:1}72%{opacity:1}100%{stroke-dashoffset:-1;opacity:0}}
        @keyframes clp-recover-node{0%,45%{stroke-opacity:.4;filter:none}62%{stroke-opacity:1;filter:drop-shadow(0 0 12px color-mix(in oklab,var(--clp-hot) 64%,transparent))}100%{stroke-opacity:.9;filter:none}}
        .clp-brand{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:20;display:grid;place-items:center;pointer-events:none}
        .clp-brand::before{content:"";position:absolute;left:50%;top:50%;width:clamp(210px,52vmin,320px);height:clamp(150px,34vmin,230px);transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,color-mix(in oklab,var(--clp-bg) 78%,transparent) 42%,transparent);z-index:-1}
        .clp-logo{width:clamp(58px,8.4vmin,92px);height:clamp(58px,8.4vmin,92px);border-radius:28%;box-shadow:0 0 0 1px color-mix(in oklab,var(--clp-ink) 17%,transparent),0 20px 68px color-mix(in oklab,var(--clp-secondary) 27%,transparent);animation:clp-idle 3.4s cubic-bezier(.77,0,.175,1) 6s infinite}
        .clp-logo img{width:100%;height:100%;border-radius:inherit;object-fit:cover}
        .clp-word{margin-top:10px;text-align:center;font-weight:850;font-size:clamp(17px,2.7vmin,28px);letter-spacing:.04em;color:var(--clp-ink);text-shadow:0 14px 42px rgba(0,0,0,.7)}
        @keyframes clp-idle{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
        .clp-controls{position:absolute;left:10px;right:64px;top:10px;z-index:40;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
        .clp-control-group{display:flex;gap:4px;align-items:center;border:1px solid color-mix(in oklab,var(--clp-ink) 13%,transparent);background:color-mix(in oklab,var(--clp-surface) 62%,transparent);backdrop-filter:blur(16px);border-radius:14px;padding:4px;max-width:100%}
        .clp-ctrl{min-height:44px;min-width:44px;border-radius:10px;padding:0 10px;color:var(--clp-ink-2);font:750 10px/1 var(--bd-font-family,Manrope,system-ui,sans-serif);letter-spacing:.03em;white-space:nowrap}
        .clp-ctrl[aria-selected="true"],.clp-ctrl[aria-pressed="true"]{background:var(--clp-ink);color:#11100e}
        .clp-ctrl:focus-visible,.clp-close:focus-visible,.clp-retry:focus-visible{outline:2px solid var(--clp-hot);outline-offset:2px}
        .clp-close{position:absolute;right:10px;top:10px;z-index:45;display:grid;width:44px;height:44px;place-items:center;border-radius:14px;border:1px solid color-mix(in oklab,var(--clp-ink) 14%,transparent);background:color-mix(in oklab,var(--clp-surface) 70%,transparent);color:var(--clp-ink);backdrop-filter:blur(16px)}
        .clp-preview-label{position:absolute;left:14px;bottom:12px;z-index:30;max-width:min(360px,calc(100vw - 28px));color:var(--clp-ink-3);font-size:9.5px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}
        .clp-lower{position:absolute;left:50%;bottom:clamp(38px,7vh,78px);z-index:30;width:min(560px,calc(100vw - 28px));transform:translateX(-50%);display:grid;gap:10px;justify-items:center}
        .clp-error-card{width:min(460px,100%);margin-inline:auto;border-radius:18px;border:1px solid color-mix(in oklab,var(--clp-attention) 52%,transparent);background:color-mix(in oklab,var(--clp-surface-raised) 97%,#000);padding:13px 16px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.5)}
        .clp-error-card .eyebrow{color:color-mix(in oklab,var(--clp-attention) 74%,#fff);font-size:10px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}
        .clp-error-card h2{margin:5px 0 0;color:var(--clp-ink);font-size:16.5px;font-weight:850;letter-spacing:0;line-height:1.3}
        .clp-error-card p{margin:5px auto 0;max-width:420px;color:var(--clp-ink);opacity:.86;font-size:13px;font-weight:600;line-height:1.45}
        .clp-retry{margin:10px auto 0;display:inline-flex;min-height:44px;align-items:center;gap:8px;border-radius:999px;background:var(--clp-ink);color:#11100e;padding:0 20px;font-size:13px;font-weight:850}
        .clp-retry:disabled{opacity:.75}
        .clp[data-network-state="retrying"] .clp-retry svg{animation:clp-retry-spin .9s linear infinite}
        @keyframes clp-retry-spin{to{transform:rotate(360deg)}}
        .clp .clp-tips{width:100%;display:grid;justify-items:center}
        .clp .clp-tips>div{width:100%!important;max-width:560px!important;border:1px solid color-mix(in oklab,var(--clp-ink) 14%,transparent)!important;background:color-mix(in oklab,var(--clp-surface-raised) 88%,transparent)!important;backdrop-filter:blur(14px)}
        .clp .clp-tips p{color:var(--clp-ink-2)!important}
        .clp .clp-tips p:first-child{color:var(--clp-ink-2)!important}
        @media (max-width:560px),(max-height:740px){
          .clp[data-network-state="error"] .clp-tips,
          .clp[data-network-state="retrying"] .clp-tips{display:none}
          .clp-controls{right:58px;gap:4px}
          .clp-control-group{padding:3px;border-radius:12px}
          .clp-ctrl{min-height:44px;padding:0 8px;font-size:9px}
          .clp-error-card h2{font-size:16px}
          .clp-lower{bottom:32px}
          .clp-preview-label{display:none}
        }
        @media (max-width: 360px){.clp-word{font-size:16px}.clp-lower{bottom:28px}}
        @media (min-width: 560px){.clp-controls{left:18px;top:16px;right:76px}.clp-close{right:18px;top:16px}}
        @media (min-width: 900px){.clp-lower{bottom:54px}.clp-preview-label{left:22px;bottom:18px}}
        @media (prefers-reduced-motion: reduce){
          .clp *{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
          .clp .clp-ring,.clp .clp-edge,.clp .clp-node,.clp .clp-pill,.clp .clp-dot{opacity:1!important;transform:none!important;stroke-dashoffset:0!important}
          .clp .clp-signal,.clp .clp-pulse{display:none!important}
          .clp[data-network-state="error"] .clp-affected-edge{opacity:.4!important;stroke:color-mix(in oklab,var(--clp-attention) 48%,var(--clp-secondary))!important;stroke-dasharray:.009 .015!important}
          .clp[data-network-state="error"] .clp-affected-node{opacity:.5!important}
          .clp[data-network-state="retrying"] .clp-affected-edge{opacity:.85!important;stroke:var(--clp-hot)!important}
          .clp[data-network-state="retrying"] .clp-recovery-signal{display:none!important}
        }
      `}</style>

      <PreviewTree
        enhanced={variant === 'enhanced'}
        state={networkState}
      />

      <div className="clp-brand" aria-hidden="true">
        <div className="clp-logo">
          <img src={bigdropsLogo} alt="" />
        </div>
        <div className="clp-word">BIGDROPS</div>
      </div>

      <div className="clp-controls" aria-label="Preview controls">
        <div role="tablist" aria-label="Preview variants" className="clp-control-group">
          {VARIANTS.map((v) => (
            <button
              key={v.key}
              role="tab"
              aria-selected={variant === v.key}
              type="button"
              className="clp-ctrl"
              onClick={() => setVariant(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="clp-control-group" aria-label="Simulated connection toggle">
          <button
            type="button"
            aria-pressed={networkState === 'normal'}
            className="clp-ctrl"
            onClick={setNormal}
          >
            Normal
          </button>
          <button
            type="button"
            aria-pressed={hasConnectionIssue}
            className="clp-ctrl"
            onClick={setError}
          >
            Connection Error
          </button>
        </div>
        <button
          type="button"
          className="clp-ctrl"
          onClick={replay}
          aria-label="Replay preview animation"
        >
          Replay
        </button>
      </div>

      <button
        type="button"
        onClick={close}
        aria-label="Close cold launch preview"
        className="clp-close"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>

      <section className="clp-lower" aria-live="polite">
        {hasConnectionIssue ? (
          <div className="clp-error-card">
            <span className="eyebrow">Preview connection state</span>
            <h2>
              {networkState === 'retrying'
                ? 'Retrying connection…'
                : "Some connections couldn't be reached."}
            </h2>
            <p>
              {networkState === 'retrying'
                ? 'Sending a recovery wave through the affected branches.'
                : 'Check your internet connection and try again.'}
            </p>
            <button
              type="button"
              className="clp-retry"
              onClick={runPreviewRetry}
              disabled={networkState === 'retrying'}
            >
              <RotateCw className="h-4 w-4" strokeWidth={2.4} />
              {networkState === 'retrying' ? 'Retrying connection' : 'Retry connection'}
            </button>
          </div>
        ) : null}
        <div className="clp-tips">
          <LoadingTips
            pathname="/cold-launch-preview"
            active
            className="clp-tip-inline"
          />
        </div>
      </section>

      <p className="clp-preview-label">
        Simulated preview only. Production startup and connectivity gates are not used here.
      </p>
    </main>
  )
}
