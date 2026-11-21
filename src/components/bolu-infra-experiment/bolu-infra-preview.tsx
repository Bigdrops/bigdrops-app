/**
 * Bolu AI Infrastructure Theme & Architecture Experiment — Design Lab preview.
 *
 * An isolated test area evaluating three distinct UI approaches:
 *  - Approach 1: Reference design reproduction
 *  - Approach 2: Top tab hub (Overview, Connections, Models, Activity), 1-level card limit, 44px min touch targets
 *  - Approach 3: Drill-down master-detail list
 *
 * Strict isolation contract:
 *  - Preview-local mock state only. No live API calls, no database mutations, no secrets read.
 *  - Production Settings, production Bolu pages, and production business rules are untouched.
 *  - Reuses Design Lab ViewportStage, ViewportSwitcher, and useExperimentThemeStyle.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Layers,
  Moon,
  Palette,
  Sun,
  X,
} from 'lucide-react'

import {
  resolveAppearance,
  useExperimentThemeStyle,
} from '@/components/design-lab/design-lab-theme'
import { ViewportStage, ViewportSwitcher } from '@/components/design-lab/viewport-stage'
import {
  PHOTO_HERO_FAMILY_META,
  isPhotoHeroFamilyId,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { useDesignLabViewport } from '@/lib/designLabViewports'

import { Approach1Reference } from './Approach1Reference'
import { Approach2TabHub } from './Approach2TabHub'
import { Approach3DrillDown } from './Approach3DrillDown'

export type BoluApproach = 'approach-1' | 'approach-2' | 'approach-3'

export default function BoluInfraPreview() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()

  // Theme family & appearance (scoped to preview, never writes to user preferences)
  const [family, setFamily] = useState<PhotoHeroFamilyId>(() =>
    isPhotoHeroFamilyId(preference.themePresetId) ? preference.themePresetId : 'slate-navy',
  )
  const [appearance, setAppearance] = useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )

  // Viewport preset using Design Lab hook
  const { viewportId, viewport, setViewportId } = useDesignLabViewport()

  // Approach selection: 1 (Reference), 2 (Tab Hub), 3 (Drill-Down)
  const [approach, setApproach] = useState<BoluApproach>('approach-2')

  // UI state for floating palette dock & notices
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<number | null>(null)
  const paletteRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  // Design Lab theme engine layer
  const { rootStyle } = useExperimentThemeStyle(family, appearance)

  const familySwatch = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)?.swatch ?? '#ffffff'

  const notify = useCallback((message: string) => {
    setNotice(message)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600)
  }, [])

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
  }, [])

  // Popover dismissal handling
  useEffect(() => {
    if (!paletteOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (popoverRef.current?.contains(target) || paletteRef.current?.contains(target)) return
      setPaletteOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPaletteOpen(false)
        paletteRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [paletteOpen])

  return (
    <div
      className="bie-root"
      style={rootStyle}
      data-bie-family={family}
      data-bie-appearance={appearance}
    >
      <style>{BIE_PREVIEW_CSS}</style>

      {/* Experiment Header & Approach Bar */}
      <div className="bie-topbar">
        <div className="bie-topbar-left">
          <button
            type="button"
            onClick={() => navigate('/design-lab')}
            className="bie-back-btn"
            aria-label="Back to Design Lab"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Design Lab</span>
          </button>
          <span className="bie-divider">/</span>
          <span className="bie-title">Bolu AI Infrastructure</span>
        </div>

        {/* Approach Selector Pills */}
        <div className="bie-approach-group" role="tablist" aria-label="Select design approach">
          <button
            type="button"
            role="tab"
            aria-selected={approach === 'approach-1'}
            onClick={() => {
              setApproach('approach-1')
              notify('Switched to Approach 1: Reference Design')
            }}
            className={approach === 'approach-1' ? 'bie-approach-pill active' : 'bie-approach-pill'}
          >
            1. Reference
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={approach === 'approach-2'}
            onClick={() => {
              setApproach('approach-2')
              notify('Switched to Approach 2: Top Tab Hub')
            }}
            className={approach === 'approach-2' ? 'bie-approach-pill active' : 'bie-approach-pill'}
          >
            2. Tab Hub
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={approach === 'approach-3'}
            onClick={() => {
              setApproach('approach-3')
              notify('Switched to Approach 3: Drill-Down List')
            }}
            className={approach === 'approach-3' ? 'bie-approach-pill active' : 'bie-approach-pill'}
          >
            3. Drill-Down
          </button>
        </div>
      </div>

      {/* Main Viewport Stage */}
      <ViewportStage viewport={viewport}>
        <div className="bie-stage-content">
          {approach === 'approach-1' && (
            <Approach1Reference onBack={() => navigate('/design-lab')} onToast={notify} />
          )}
          {approach === 'approach-2' && (
            <Approach2TabHub onToast={notify} />
          )}
          {approach === 'approach-3' && (
            <Approach3DrillDown onToast={notify} />
          )}
        </div>
      </ViewportStage>

      {/* Floating Theme & Viewport Dock (CSR Switcher Pattern) */}
      <div className="bie-dock">
        <button
          ref={paletteRef}
          type="button"
          className="bie-dock-btn"
          aria-expanded={paletteOpen}
          aria-controls="bie-palette"
          aria-label={paletteOpen ? 'Close customisation palette' : 'Open customisation palette'}
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <Palette aria-hidden="true" />
          <span className="bie-dock-dot" style={{ ['--swatch' as string]: familySwatch }} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="bie-dock-btn"
          aria-label="Close experiment and return to Design Lab"
          onClick={() => navigate('/design-lab')}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      {/* Customisation Popover (Theme Families + Light/Dark + ViewportSwitcher) */}
      {paletteOpen ? (
        <div ref={popoverRef} id="bie-palette" className="bie-pop" role="dialog" aria-label="Experiment theme palette">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-1">Theme Family</p>
          <div className="bie-pop-group" role="group" aria-label="Theme family">
            {PHOTO_HERO_FAMILY_META.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={family === item.id}
                aria-label={`Use ${item.label}`}
                onClick={() => setFamily(item.id)}
              >
                <span className="bie-pop-dot" style={{ ['--swatch' as string]: item.swatch }} aria-hidden="true" />
                {item.short}
              </button>
            ))}
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-1">Appearance</p>
          <div className="bie-pop-group" role="group" aria-label="Appearance">
            <button
              type="button"
              aria-pressed={appearance === 'light'}
              aria-label="Use light appearance"
              onClick={() => setAppearance('light')}
            >
              <Sun size={14} className="mr-1" aria-hidden="true" />
              Light
            </button>
            <button
              type="button"
              aria-pressed={appearance === 'dark'}
              aria-label="Use dark appearance"
              onClick={() => setAppearance('dark')}
            >
              <Moon size={14} className="mr-1" aria-hidden="true" />
              Dark
            </button>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-1">Responsive Viewport</p>
          <div className="bie-pop-group">
            <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
          </div>

          <button
            type="button"
            className="bie-pop-close"
            onClick={() => {
              setPaletteOpen(false)
              paletteRef.current?.focus()
            }}
          >
            Close
          </button>
        </div>
      ) : null}

      {/* Floating Notice Toast */}
      {notice ? (
        <p className="bie-notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  )
}

const BIE_PREVIEW_CSS = `
  .bie-root{position:relative;min-height:100dvh;background-image:var(--scene-intro);background-attachment:fixed;background-size:cover;color:var(--chrome-ink)}
  .bie-root[data-bie-appearance="dark"]{color-scheme:dark}
  .bie-root[data-bie-appearance="light"]{color-scheme:light}

  .bie-topbar{
    position:sticky;
    top:0;
    z-index:40;
    display:flex;
    align-items:center;
    justify-content:space-between;
    flex-wrap:wrap;
    gap:10px;
    padding:10px 16px;
    border-bottom:1px solid var(--glass-line);
    background:var(--glass-bg);
    -webkit-backdrop-filter:blur(20px);
    backdrop-filter:blur(20px);
  }
  .bie-topbar-left{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700}
  .bie-back-btn{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 10px;border-radius:10px;border:1px solid var(--glass-line);background:var(--glass-bg);color:inherit}
  .bie-divider{color:var(--copy);opacity:.6}
  .bie-title{font-weight:800;letter-spacing:-.01em}

  .bie-approach-group{display:flex;align-items:center;gap:4px;background:var(--surface-muted);padding:3px;border-radius:12px;border:1px solid var(--glass-line)}
  .bie-approach-pill{display:inline-flex;align-items:center;min-height:34px;padding:0 12px;border-radius:9px;font-size:12px;font-weight:700;color:var(--copy);transition:all .15s}
  .bie-approach-pill.active{background:var(--chrome-ink);color:var(--primary-ink);box-shadow:0 2px 6px rgba(0,0,0,.15)}

  .bie-stage-content{
    width:100%;
    padding:16px 16px calc(100px + env(safe-area-inset-bottom,0px));
  }

  /* Compact floating palette dock (reusing CSR pattern) */
  .bie-dock{position:fixed;z-index:70;left:16px;bottom:calc(20px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:8px}
  .bie-dock-btn{position:relative;display:grid;width:44px;height:44px;place-items:center;border:1px solid var(--glass-line);border-radius:14px;background:var(--glass-bg);color:var(--chrome-ink);box-shadow:0 8px 24px rgba(0,0,0,.12)}
  .bie-dock-btn svg{width:18px;height:18px}
  .bie-dock-dot{position:absolute;right:6px;bottom:6px;width:10px;height:10px;border-radius:999px;background:var(--swatch);box-shadow:0 0 0 2px var(--glass-bg)}

  .bie-pop{position:fixed;z-index:71;left:16px;bottom:calc(76px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:8px;width:min(340px,calc(100vw - 32px));max-height:calc(100dvh - 120px);overflow-y:auto;padding:10px;border:1px solid var(--glass-line);border-radius:18px;background:var(--glass-bg);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);color:var(--chrome-ink);box-shadow:0 16px 36px rgba(0,0,0,.2)}
  .bie-pop-group{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
  .bie-pop button{display:inline-flex;align-items:center;min-height:36px;padding:0 10px;border-radius:10px;font-size:11px;font-weight:700;color:var(--chrome-ink);opacity:.85}
  .bie-pop button[aria-pressed="true"]{background:var(--chrome-ink);color:var(--primary-ink);opacity:1}
  .bie-pop-dot{width:10px;height:10px;border-radius:999px;background:var(--swatch);box-shadow:0 0 0 2px rgba(128,128,128,.25);margin-right:6px}
  .bie-pop-close{justify-content:center;width:100%;margin-top:4px;padding-top:8px;border-top:1px solid var(--glass-line);border-radius:0 0 10px 10px}

  .bie-notice{position:fixed;z-index:72;right:16px;bottom:calc(24px + env(safe-area-inset-bottom,0px));max-width:min(80vw,360px);margin:0;padding:10px 14px;border:1px solid var(--glass-line);border-radius:14px;background:var(--glass-bg);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);color:var(--chrome-ink);font-size:12px;font-weight:700;box-shadow:0 8px 20px rgba(0,0,0,.15)}

  .no-scrollbar::-webkit-scrollbar{display:none}
  .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
`
