import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Moon,
  Network,
  Palette,
  RefreshCw,
  Sun,
  Wifi,
  WifiOff,
} from 'lucide-react'

import {
  resolveAppearance,
  useExperimentThemeStyle,
} from '@/components/design-lab/design-lab-theme'
import { ViewportStage, ViewportSwitcher } from '@/components/design-lab/viewport-stage'
import ColdLaunchTenantTreePresentation, {
  type ColdLaunchTenantTreeVariant,
} from '@/components/cold-launch/ColdLaunchTenantTreePresentation'
import type { PreviewNetworkState } from '@/components/cold-launch/PreviewTree'
import {
  PHOTO_HERO_FAMILY_META,
  isPhotoHeroFamilyId,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { useDesignLabViewport } from '@/lib/designLabViewports'

export default function ColdLaunchExperimentPreview() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()

  const [family, setFamily] = React.useState<PhotoHeroFamilyId>(() => {
    return isPhotoHeroFamilyId(preference.themePresetId) ? preference.themePresetId : 'slate-navy'
  })
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )
  const [variant, setVariant] = React.useState<ColdLaunchTenantTreeVariant>('enhanced')
  const [networkState, setNetworkState] = React.useState<PreviewNetworkState>('normal')
  const [replayKey, setReplayKey] = React.useState(0)
  const [showFeedback, setShowFeedback] = React.useState(false)

  const { viewportId, setViewportId, viewport } = useDesignLabViewport()
  const themeStyle = useExperimentThemeStyle(family, appearance)

  const handleReplay = () => {
    setReplayKey((k) => k + 1)
  }

  const handleNetworkChange = (state: PreviewNetworkState) => {
    setNetworkState(state)
    setShowFeedback(state !== 'normal')
  }

  return (
    <div
      className="cl-exp-root relative flex h-dvh w-full flex-col overflow-hidden bg-[hsl(var(--surface))] text-[hsl(var(--ink))]"
      style={themeStyle}
    >
      {/* Design Lab experiment bar */}
      <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-[hsl(var(--line))] bg-[hsl(var(--surface-raised))]/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/design-lab')}
            className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-2.5 py-1.5 text-xs font-semibold hover:bg-[hsl(var(--surface-muted))]"
            aria-label="Back to Design Lab"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Design Lab</span>
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--ink-2))]">
            <Network className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span>Cold Launch · Tenant Tree Simulator</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Viewport switcher */}
          <div className="hidden md:block">
            <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
          </div>

          {/* Theme family picker */}
          <div className="relative flex items-center gap-1 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] p-1">
            <Palette className="ml-1 h-3.5 w-3.5 text-[hsl(var(--ink-3))]" />
            <select
              value={family}
              onChange={(e) => setFamily(e.target.value as PhotoHeroFamilyId)}
              className="bg-transparent text-xs font-medium focus:outline-none"
              aria-label="Theme Family"
            >
              {PHOTO_HERO_FAMILY_META.map((meta) => (
                <option key={meta.id} value={meta.id}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          {/* Appearance toggle */}
          <button
            type="button"
            onClick={() => setAppearance((a) => (a === 'dark' ? 'light' : 'dark'))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--surface))] text-[hsl(var(--ink))] hover:bg-[hsl(var(--surface-muted))]"
            aria-label="Toggle light / dark mode"
          >
            {appearance === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Replay */}
          <button
            type="button"
            onClick={handleReplay}
            className="flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
            aria-label="Replay startup animation"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Replay</span>
          </button>
        </div>
      </header>

      {/* Simulator bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[hsl(var(--line))] bg-[hsl(var(--surface))]/80 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[hsl(var(--ink-3))]">Network state:</span>
          <div className="flex items-center gap-1 rounded-md bg-[hsl(var(--surface-muted))] p-0.5">
            <button
              type="button"
              onClick={() => handleNetworkChange('normal')}
              className={`rounded px-2 py-1 font-medium transition ${
                networkState === 'normal'
                  ? 'bg-[hsl(var(--surface))] font-bold text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--ink-2))] hover:text-[hsl(var(--ink))]'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => handleNetworkChange('retrying')}
              className={`rounded px-2 py-1 font-medium transition ${
                networkState === 'retrying'
                  ? 'bg-[hsl(var(--surface))] font-bold text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-[hsl(var(--ink-2))] hover:text-[hsl(var(--ink))]'
              }`}
            >
              Retrying
            </button>
            <button
              type="button"
              onClick={() => handleNetworkChange('error')}
              className={`rounded px-2 py-1 font-medium transition ${
                networkState === 'error'
                  ? 'bg-[hsl(var(--surface))] font-bold text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-[hsl(var(--ink-2))] hover:text-[hsl(var(--ink))]'
              }`}
            >
              Error
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-[hsl(var(--ink-3))]">Variant:</span>
          <div className="flex items-center gap-1 rounded-md bg-[hsl(var(--surface-muted))] p-0.5">
            <button
              type="button"
              onClick={() => setVariant('enhanced')}
              className={`rounded px-2 py-1 font-medium transition ${
                variant === 'enhanced'
                  ? 'bg-[hsl(var(--surface))] font-bold text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--ink-2))] hover:text-[hsl(var(--ink))]'
              }`}
            >
              Enhanced (Native)
            </button>
            <button
              type="button"
              onClick={() => setVariant('original')}
              className={`rounded px-2 py-1 font-medium transition ${
                variant === 'original'
                  ? 'bg-[hsl(var(--surface))] font-bold text-[hsl(var(--primary))] shadow-sm'
                  : 'text-[hsl(var(--ink-2))] hover:text-[hsl(var(--ink))]'
              }`}
            >
              Original (Web)
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Stage */}
      <main className="relative flex-1 overflow-auto bg-[hsl(var(--surface-muted))]/40">
        <ViewportStage viewport={viewport} className="h-full">
          <div key={replayKey} className="relative h-full w-full">
            <ColdLaunchTenantTreePresentation
              family={family}
              appearance={appearance}
              variant={variant}
              networkState={networkState}
              isRunning={true}
              tipPathname="/"
              showConnectionFeedback={showFeedback}
              onRetry={() => handleNetworkChange('normal')}
              previewLabel={
                <div className="rounded-full bg-[hsl(var(--primary))]/20 px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--primary))]">
                  PREVIEW STAGE
                </div>
              }
            />
          </div>
        </ViewportStage>
      </main>
    </div>
  )
}
