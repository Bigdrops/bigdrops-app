import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { BourxePhotoHeroV3Preview } from '@/components/onboarding/BourxePhotoHeroV3Preview'
import photoHeroHtml from '../../docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-PhotoHero-v2.html?raw'
import bigdropsLogo from '../../docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/mipmap-xxxhdpi/ic_launcher.png'

const STANDALONE_LOGO_PATH = '../icons/android/mipmap-xxxhdpi/ic_launcher.png'
type PhotoHeroVersion = 'v2' | 'v3'

/**
 * App-hosted wrapper for the standalone PhotoHero V2 design experiment.
 * The prototype stays isolated in a sandboxed iframe and does not read or
 * mutate application auth, onboarding, or theme preference state.
 */
export default function PhotoHeroPreview() {
  const navigate = useNavigate()
  const [version, setVersion] = React.useState<PhotoHeroVersion>('v3')

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
        .php-version{
          position:absolute;
          left:calc(10px + env(safe-area-inset-left,0px));
          bottom:calc(10px + env(safe-area-inset-bottom,0px));
          z-index:6;
          display:flex;
          align-items:center;
          gap:5px;
          padding:5px;
          border:1px solid rgba(248,250,252,.18);
          border-radius:16px;
          background:rgba(15,23,42,.62);
          -webkit-backdrop-filter:blur(18px) saturate(150%);
          backdrop-filter:blur(18px) saturate(150%);
          box-shadow:0 18px 44px rgba(0,0,0,.32);
        }
        .php-version button{
          min-height:36px;
          border:0;
          border-radius:11px;
          background:transparent;
          color:rgba(248,250,252,.78);
          padding:0 12px;
          font:inherit;
          font-size:12px;
          font-weight:800;
          letter-spacing:.01em;
        }
        .php-version button[aria-pressed="true"]{
          background:#f8fafc;
          color:#0f172a;
        }
        .php-version button:focus-visible{
          outline:2px solid #93c5fd;
          outline-offset:2px;
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
      {version === 'v2' ? (
        <iframe
          className="php-frame"
          title="BIGDROPS PhotoHero V2 preview"
          srcDoc={srcDoc}
          sandbox="allow-scripts"
        />
      ) : (
        <BourxePhotoHeroV3Preview logoSrc={bigdropsLogo} />
      )}
      <div className="php-version" role="group" aria-label="PhotoHero preview version">
        <button type="button" aria-pressed={version === 'v2'} onClick={() => setVersion('v2')}>
          V2 Reference
        </button>
        <button type="button" aria-pressed={version === 'v3'} onClick={() => setVersion('v3')}>
          V3 Candidate
        </button>
      </div>
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
