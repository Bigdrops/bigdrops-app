import * as React from 'react'
import { Moon, Palette, Sun, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ViewportStage, ViewportSwitcher } from '@/components/design-lab/viewport-stage'
import {
  PHOTO_HERO_FAMILY_META,
  isPhotoHeroFamilyId,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { useDesignLabViewport } from '@/lib/designLabViewports'
import { resolveAppearance, useExperimentThemeStyle } from '@/components/design-lab/design-lab-theme'

import sourceHtml from '../../../docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/outsourced-samples/BOURXE_Ultimate_Onboarding.html?raw'

type UltimateThemeId = 'navy' | 'amber' | 'teal' | 'rose' | 'forest'

const SOURCE_REFERENCE =
  'docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/outsourced-samples/BOURXE_Ultimate_Onboarding.html'

const FAMILY_TO_SOURCE_THEME: Record<PhotoHeroFamilyId, UltimateThemeId> = {
  'slate-navy': 'navy',
  'amber-terracotta': 'amber',
  'ocean-teal': 'teal',
  'rose-gold': 'rose',
  'forest-green': 'forest',
}

const SOURCE_STYLE_ADAPTER = `
<style id="bourxe-v4-design-lab-adapter">
  .theme-trigger,
  #themePanel {
    display: none !important;
  }

  .header {
    padding-right: clamp(22px, 5vw, 84px) !important;
  }

  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-behavior: auto !important;
    }
  }
</style>
`

function resolveInitialFamily(value: unknown): PhotoHeroFamilyId {
  return isPhotoHeroFamilyId(value) ? value : 'slate-navy'
}

function buildSourceDocument(theme: UltimateThemeId, appearance: PhotoHeroAppearance): string {
  return sourceHtml
    .replace(
      /<html lang="en" data-theme="[^"]+" data-mode="[^"]+">/,
      `<html lang="en" data-theme="${theme}" data-mode="${appearance}">`,
    )
    .replace(
      /applyTheme\(readPref\('bourxe-ultimate-theme','navy'\)\);applyMode\(readPref\('bourxe-ultimate-mode','dark'\)\);/,
      `applyTheme('${theme}');applyMode('${appearance}');`,
    )
    .replace('</head>', `${SOURCE_STYLE_ADAPTER}</head>`)
    .replace(/—/g, '-')
}

export default function OnboardingV4Preview() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()
  const [family, setFamily] = React.useState<PhotoHeroFamilyId>(() =>
    resolveInitialFamily(preference.themePresetId),
  )
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const { viewportId, viewport, setViewportId } = useDesignLabViewport()
  const paletteRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)

  const sourceTheme = FAMILY_TO_SOURCE_THEME[family]
  const familyMeta = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)
  const familyLabel = familyMeta?.label ?? family
  const familySwatch = familyMeta?.swatch ?? '#60a5fa'
  const { rootStyle } = useExperimentThemeStyle(family, appearance)

  const srcDoc = React.useMemo(
    () => buildSourceDocument(sourceTheme, appearance),
    [appearance, sourceTheme],
  )

  React.useEffect(() => {
    if (!paletteOpen) return
    popoverRef.current?.querySelector('button')?.focus()

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (popoverRef.current?.contains(target) || paletteRef.current?.contains(target)) return
      setPaletteOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPaletteOpen(false)
      paletteRef.current?.focus()
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
      className="ob4-root"
      style={rootStyle}
      data-ob4-root="onboarding-v4-experiment"
      data-ob4-family={family}
      data-ob4-appearance={appearance}
      data-ob4-source={SOURCE_REFERENCE}
    >
      <style>{PREVIEW_CSS}</style>

      <h1 className="ob4-vh">Onboarding V4 Experiment</h1>
      <p className="ob4-vh" role="status">
        {`Onboarding V4 source adaptation. ${familyLabel} in ${appearance} mode. Preview only.`}
      </p>

      <ViewportStage viewport={viewport} className="ob4-stage">
        <iframe
          key={`${sourceTheme}-${appearance}`}
          className="ob4-frame"
          title="BOURXE Onboarding V4 source-led preview"
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-forms"
          referrerPolicy="no-referrer"
        />
      </ViewportStage>

      <div className="ob4-dock">
        <button
          ref={paletteRef}
          type="button"
          className="ob4-dock-btn active:scale-95"
          aria-expanded={paletteOpen}
          aria-controls="ob4-palette"
          aria-label={paletteOpen ? 'Close customisation panel' : 'Open customisation panel'}
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <Palette className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
          <span className="ob4-dock-dot" style={{ ['--swatch' as string]: familySwatch }} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ob4-dock-btn active:scale-95"
          aria-label="Close experiment and return to Design Lab"
          onClick={() => navigate('/design-lab')}
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {paletteOpen ? (
        <div ref={popoverRef} id="ob4-palette" className="ob4-pop" role="dialog" aria-label="Experiment customisation">
          <div className="ob4-pop-group" role="group" aria-label="Theme family">
            {PHOTO_HERO_FAMILY_META.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={family === item.id}
                aria-label={`Use ${item.label}`}
                onClick={() => setFamily(item.id)}
              >
                <span className="ob4-pop-dot" style={{ ['--swatch' as string]: item.swatch }} aria-hidden="true" />
                {item.short}
              </button>
            ))}
          </div>

          <div className="ob4-pop-group" role="group" aria-label="Appearance">
            <button
              type="button"
              aria-pressed={appearance === 'light'}
              aria-label="Use light appearance"
              onClick={() => setAppearance('light')}
            >
              <Sun className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Light
            </button>
            <button
              type="button"
              aria-pressed={appearance === 'dark'}
              aria-label="Use dark appearance"
              onClick={() => setAppearance('dark')}
            >
              <Moon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Dark
            </button>
          </div>

          <div className="ob4-pop-group ob4-pop-group--viewport">
            <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
          </div>

          <button
            type="button"
            className="ob4-pop-close"
            onClick={() => {
              setPaletteOpen(false)
              paletteRef.current?.focus()
            }}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  )
}

const PREVIEW_CSS = `
  .ob4-root{position:relative;min-height:100dvh;background:var(--scene-intro);color:var(--chrome-ink)}
  .ob4-vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  .ob4-stage .dlv-surface{min-height:100dvh;background:var(--scene-intro)}
  .ob4-frame{display:block;width:100%;height:100dvh;border:0;background:var(--deep-a,#071524);color-scheme:light dark}
  [data-dlv-sim] .ob4-frame{height:100dvh}

  .ob4-dock{
    position:fixed;
    z-index:70;
    left:12px;
    bottom:calc(22px + env(safe-area-inset-bottom,0px));
    display:flex;
    align-items:center;
    gap:8px;
  }
  .ob4-dock-btn{
    position:relative;
    display:grid;
    width:44px;
    height:44px;
    place-items:center;
    border:1px solid var(--glass-line);
    border-radius:14px;
    background:var(--glass-bg);
    color:var(--glass-ink);
    -webkit-backdrop-filter:blur(18px) saturate(150%);
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .ob4-dock-dot{
    position:absolute;
    right:6px;
    bottom:6px;
    width:10px;
    height:10px;
    border-radius:999px;
    background:var(--swatch);
    box-shadow:0 0 0 2px var(--glass-bg);
  }
  .ob4-pop{
    position:fixed;
    z-index:71;
    left:12px;
    bottom:calc(78px + env(safe-area-inset-bottom,0px));
    display:flex;
    flex-direction:column;
    gap:8px;
    width:min(340px,calc(100vw - 24px));
    max-height:calc(100dvh - 110px);
    overflow-y:auto;
    padding:8px;
    border:1px solid var(--glass-line);
    border-radius:18px;
    background:var(--glass-bg);
    color:var(--glass-ink);
    -webkit-backdrop-filter:blur(18px) saturate(150%);
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .ob4-pop-group{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
  .ob4-pop button{
    display:inline-flex;
    align-items:center;
    gap:7px;
    min-height:36px;
    padding:0 11px;
    border-radius:12px;
    color:var(--glass-ink);
    font-size:11px;
    font-weight:800;
    letter-spacing:0;
    opacity:.78;
    transition:background .16s ease,color .16s ease,opacity .16s ease;
  }
  .ob4-pop button[aria-pressed="true"]{
    background:var(--chrome-ink);
    color:var(--primary-ink);
    opacity:1;
  }
  .ob4-pop-dot{
    width:10px;
    height:10px;
    border-radius:999px;
    background:var(--swatch);
    box-shadow:0 0 0 2px rgba(128,128,128,.25),0 0 18px var(--swatch);
  }
  .ob4-pop-close{
    justify-content:center;
    width:100%;
    border-top:1px solid var(--glass-line);
    border-radius:0 0 12px 12px;
  }
  .ob4-root .ob4-dock-btn:focus-visible,
  .ob4-pop :focus-visible{
    outline:2px solid var(--hero-accent);
    outline-offset:2px;
  }

  @media (min-width:768px){
    .ob4-dock{left:20px;bottom:20px}
    .ob4-pop{left:20px;bottom:76px}
  }
  @media (prefers-reduced-transparency:reduce){
    .ob4-dock-btn,.ob4-pop{
      -webkit-backdrop-filter:none;
      backdrop-filter:none;
      background:var(--scene-intro);
      color:var(--chrome-ink);
    }
  }
  @media (prefers-reduced-motion:reduce){
    .ob4-pop button{transition:none}
  }
`
