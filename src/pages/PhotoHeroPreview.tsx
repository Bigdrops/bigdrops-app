import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import photoHeroHtml from '../../docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-PhotoHero-v2.html?raw'
import bigdropsLogo from '../../docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/mipmap-xxxhdpi/ic_launcher.png'

const STANDALONE_LOGO_PATH = '../icons/android/mipmap-xxxhdpi/ic_launcher.png'

/**
 * App-hosted wrapper for the standalone PhotoHero V2 design experiment.
 * The prototype stays isolated in a sandboxed iframe and does not read or
 * mutate application auth, onboarding, or theme preference state.
 */
export default function PhotoHeroPreview() {
  const navigate = useNavigate()

  const srcDoc = React.useMemo(
    () => photoHeroHtml.split(STANDALONE_LOGO_PATH).join(bigdropsLogo),
    [],
  )

  const close = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }, [navigate])

  return (
    <main className="php-shell" aria-label="PhotoHero V2 preview">
      <style>{`
        .php-shell{
          position:fixed;
          inset:0;
          overflow:hidden;
          background:#0f172a;
          color:#f8fafc;
          isolation:isolate;
        }
        .php-frame{
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          border:0;
          background:#0f172a;
        }
        .php-close{
          position:absolute;
          right:calc(10px + env(safe-area-inset-right,0px));
          top:calc(10px + env(safe-area-inset-top,0px));
          z-index:5;
          display:grid;
          width:44px;
          height:44px;
          place-items:center;
          border:1px solid rgba(248,250,252,.18);
          border-radius:14px;
          background:rgba(15,23,42,.62);
          color:#f8fafc;
          -webkit-backdrop-filter:blur(18px) saturate(150%);
          backdrop-filter:blur(18px) saturate(150%);
          box-shadow:0 18px 44px rgba(0,0,0,.32);
        }
        .php-close:focus-visible{
          outline:2px solid #93c5fd;
          outline-offset:2px;
        }
      `}</style>
      <iframe
        className="php-frame"
        title="PhotoHero V2 preview"
        srcDoc={srcDoc}
        sandbox="allow-scripts"
      />
      <button
        type="button"
        onClick={close}
        aria-label="Close PhotoHero preview"
        className="php-close"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>
    </main>
  )
}
