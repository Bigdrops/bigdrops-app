import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import PhotoHeroV2Preview from '../components/onboarding/PhotoHeroV2Preview'

/**
 * App-hosted wrapper for the Onboarding V2 (PhotoHero V2) design experiment.
 *
 * The preview is a native React implementation. Theme family and appearance
 * selections are local preview state only — they never read or mutate
 * application auth, onboarding, or persisted theme preferences.
 */
export default function PhotoHeroPreview() {
  const navigate = useNavigate()

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
        .php-stage{
          position:absolute;
          inset:0;
        }
        .php-close{
          position:absolute;
          right:calc(10px + env(safe-area-inset-right,0px));
          top:calc(10px + env(safe-area-inset-top,0px));
          z-index:95;
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
      <div className="php-stage">
        <PhotoHeroV2Preview />
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
