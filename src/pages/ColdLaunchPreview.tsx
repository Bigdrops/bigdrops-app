import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Sun, X } from 'lucide-react'
import ColdLaunchTenantTreePresentation, {
  type ColdLaunchTenantTreeVariant,
} from '@/components/cold-launch/ColdLaunchTenantTreePresentation'
import type { PreviewNetworkState } from '@/components/cold-launch/PreviewTree'
import {
  PHOTO_HERO_FAMILY_META,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'

const VARIANTS: Array<{ key: ColdLaunchTenantTreeVariant; label: string }> = [
  { key: 'original', label: 'Tree Original' },
  { key: 'enhanced', label: 'Tree + Beams' },
]

/**
 * Isolated Cold Launch V1 preview.
 *
 * Preview-local state never reads or mutates saved application theme
 * preferences. Production startup reuses the same Tenant Tree presentation
 * without these developer controls.
 */
export default function ColdLaunchPreview() {
  const navigate = useNavigate()
  const [family, setFamily] = React.useState<PhotoHeroFamilyId>('slate-navy')
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>('dark')
  const [variant, setVariant] = React.useState<ColdLaunchTenantTreeVariant>('original')
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
    <ColdLaunchTenantTreePresentation
      family={family}
      appearance={appearance}
      variant={variant}
      networkState={networkState}
      isRunning={isRunning}
      tipPathname="/cold-launch-preview"
      showConnectionFeedback
      onRetry={runPreviewRetry}
      previewControls={
        <div className="clp-controls" aria-label="Preview controls">
          <div className="clp-control-group" aria-label="Theme family">
            {PHOTO_HERO_FAMILY_META.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={family === f.id}
                aria-label={`Use ${f.label} ${appearance} theme`}
                className="clp-ctrl"
                onClick={() => setFamily(f.id)}
              >
                <span
                  className="clp-swatch"
                  aria-hidden="true"
                  style={{ ['--swatch' as string]: f.swatch }}
                />
                {f.short}
              </button>
            ))}
          </div>
          <div className="clp-control-group" aria-label="Appearance">
            <button
              type="button"
              aria-pressed={appearance === 'light'}
              className="clp-ctrl"
              onClick={() => setAppearance('light')}
            >
              <Sun className="clp-ico" aria-hidden="true" />
              Light
            </button>
            <button
              type="button"
              aria-pressed={appearance === 'dark'}
              className="clp-ctrl"
              onClick={() => setAppearance('dark')}
            >
              <Moon className="clp-ico" aria-hidden="true" />
              Dark
            </button>
          </div>
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
      }
      closeButton={
        <button
          type="button"
          onClick={close}
          aria-label="Close cold launch preview"
          className="clp-close"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      }
      previewLabel={
        <p className="clp-preview-label">
          Simulated preview only. Production startup and connectivity gates are not used here.
        </p>
      }
    />
  )
}
