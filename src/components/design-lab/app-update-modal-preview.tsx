import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Wifi } from 'lucide-react'

import AppUpdateStructural from './app-update-structural'
import AppUpdateFluid from './app-update-fluid'
import { PREVIEW_RELEASE, useSimulatedDownload, type SimulatedDownload } from './app-update-preview-model'
import { useExperimentThemeStyle } from './design-lab-theme'
import {
  PHOTO_HERO_FAMILY_META,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'

type Variant = 'structural' | 'fluid'

const INTER = "'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif"

/**
 * Token aliases mirror Onboarding Experience v5 (`onboarding-v5-preview.tsx`).
 * The experiment root carries bare HSL triplets from the theme registry, so the
 * base tokens are wrapped in `hsl()`. Recipe tokens (`--primary-ink`,
 * `--success`, `--danger`) arrive as full colours and pass straight through.
 * No palette is hardcoded here: every value derives from the selected family.
 */
const ALIAS_CSS = `
  .au-device{
    --au-accent:hsl(var(--primary));
    --au-accent-2:hsl(var(--secondary,var(--primary)));
    --au-ink:hsl(var(--ink));
    --au-muted:hsl(var(--ink-2));
    --au-faint:hsl(var(--ink-3));
    --au-surface:hsl(var(--surface));
    --au-raised:hsl(var(--surface-raised));
    --au-muted-surface:hsl(var(--surface-muted));
    --au-line:hsl(var(--line));
    --au-line-strong:hsl(var(--line-strong));
    --au-accent-soft:color-mix(in srgb,var(--au-accent) 12%,var(--au-surface));
    --au-accent-line:color-mix(in srgb,var(--au-accent) 34%,var(--au-line));
    --au-hairline:color-mix(in srgb,var(--au-ink) 12%,transparent);
    --au-scrim:color-mix(in srgb,var(--au-ink) 52%,transparent);
    --au-cta-ink:var(--primary-ink);
    --au-success:var(--success);
    --au-danger:var(--danger);
    --au-warning:var(--warning);
    font-family:${INTER};
  }
`

const DEVICE_CSS = `
  .au-frame{
    position:relative;width:380px;height:820px;padding:3px;border-radius:4px;
    border:1px solid color-mix(in srgb,var(--au-ink) 30%,transparent);
    background:linear-gradient(150deg,
      color-mix(in srgb,var(--au-ink) 14%,var(--au-surface)),
      color-mix(in srgb,var(--au-ink) 36%,var(--au-surface)) 46%,
      color-mix(in srgb,var(--au-ink) 18%,var(--au-surface)));
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.22),
      inset 0 -1px 0 rgba(0,0,0,.24),
      0 26px 60px -20px color-mix(in srgb,var(--au-ink) 60%,transparent),
      0 4px 14px rgba(0,0,0,.18);
  }
  .au-side{position:absolute;right:-2px;width:3px;border-radius:2px;
    background:linear-gradient(90deg,color-mix(in srgb,var(--au-ink) 30%,var(--au-surface)),color-mix(in srgb,var(--au-ink) 46%,var(--au-surface)));
    box-shadow:inset 0 1px 0 rgba(255,255,255,.2);}
  .au-side--vol{top:150px;height:72px;}
  .au-side--power{top:244px;height:46px;}
  .au-bezel{position:relative;width:100%;height:100%;padding:2px;border-radius:3px;
    background:color-mix(in srgb,var(--au-ink) 7%,#000000);}
  .au-screen{position:relative;width:100%;height:100%;overflow:hidden;border-radius:2px;
    background:var(--au-surface);color:var(--au-ink);}
  .au-app{position:absolute;inset:0;padding:34px 14px 26px;overflow:hidden;}
  .au-scrim{position:absolute;inset:0;z-index:10;background:var(--au-scrim);
    backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);}
  .au-sheet-slot{position:absolute;inset-inline:0;bottom:0;z-index:20;
    max-height:calc(100% - 42px);overflow-y:auto;overscroll-behavior:contain;
    scrollbar-width:none;}
  .au-sheet-slot::-webkit-scrollbar{display:none;}
  .au-statusbar{position:absolute;top:0;inset-inline:0;z-index:30;height:32px;
    display:flex;align-items:center;justify-content:space-between;
    padding:0 18px;color:var(--au-ink);pointer-events:none;}
  .au-status-time{font-size:12px;font-weight:650;letter-spacing:.01em;font-variant-numeric:tabular-nums;}
  .au-status-icons{display:flex;align-items:center;gap:5px;}
  .au-status-5g{font-size:10px;font-weight:700;letter-spacing:.02em;}
  .au-camera{position:absolute;top:9px;left:50%;z-index:40;width:11px;height:11px;
    transform:translateX(-50%);border-radius:50%;
    background:radial-gradient(circle at 38% 32%,color-mix(in srgb,var(--au-ink) 42%,#000000),#000000 72%);
    box-shadow:0 0 0 1px color-mix(in srgb,var(--au-ink) 18%,transparent);}
  .au-camera::after{content:"";position:absolute;top:2.5px;left:2.5px;width:3px;height:3px;
    border-radius:50%;background:rgba(255,255,255,.28);}
  .au-gesture{position:absolute;bottom:7px;inset-inline:0;z-index:30;display:flex;justify-content:center;pointer-events:none;}
  .au-gesture span{width:118px;height:4px;border-radius:99px;background:color-mix(in srgb,var(--au-ink) 42%,transparent);}
`

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-border bg-card p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        checked
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground'
      }`}
    >
      <span className={`relative h-3.5 w-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className={`absolute top-0.5 size-2.5 rounded-full bg-background transition-all ${checked ? 'left-3' : 'left-0.5'}`} />
      </span>
      {children}
    </button>
  )
}

function FamilyPicker({
  family,
  onChange,
}: {
  family: PhotoHeroFamilyId
  onChange: (family: PhotoHeroFamilyId) => void
}) {
  return (
    <div role="group" aria-label="Theme family" className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
      {PHOTO_HERO_FAMILY_META.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={family === item.id}
          aria-label={`Use ${item.label} palette`}
          title={item.label}
          onClick={() => onChange(item.id)}
          className={`grid size-6 place-items-center rounded-full transition-transform ${
            family === item.id ? 'scale-110 ring-2 ring-foreground/40' : 'hover:scale-105'
          }`}
        >
          <span className="size-3.5 rounded-full" style={{ background: item.swatch }} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

function SignalBars() {
  return (
    <svg viewBox="0 0 18 12" width="16" height="11" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="3" height="4" rx="0.6" />
      <rect x="5" y="5" width="3" height="7" rx="0.6" />
      <rect x="10" y="2.5" width="3" height="9.5" rx="0.6" />
      <rect x="15" y="0" width="3" height="12" rx="0.6" />
    </svg>
  )
}

function Battery() {
  return (
    <svg viewBox="0 0 26 12" width="24" height="11" aria-hidden="true">
      <rect x="0.5" y="0.5" width="21" height="11" rx="2.6" fill="none" stroke="currentColor" strokeOpacity="0.45" />
      <rect x="2" y="2" width="15" height="8" rx="1.4" fill="currentColor" />
      <rect x="23" y="3.6" width="2.4" height="4.8" rx="1" fill="currentColor" fillOpacity="0.45" />
    </svg>
  )
}

function StatusBar() {
  return (
    <div className="au-statusbar" aria-hidden="true">
      <span className="au-status-time">9:41</span>
      <span className="au-status-icons">
        <span className="au-status-5g">5G</span>
        <SignalBars />
        <Wifi className="size-[14px]" strokeWidth={2.2} />
        <Battery />
      </span>
    </div>
  )
}

/** Simulated BOURXE workspace behind the sheet, drawn from the family palette. */
function PhoneBackdrop() {
  return (
    <div className="au-app" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid size-7 place-items-center rounded-[8px] text-[13px] font-black"
            style={{ background: 'var(--au-accent)', color: 'var(--au-cta-ink)' }}
          >
            B
          </span>
          <div className="leading-tight">
            <p className="text-[12px] font-bold" style={{ color: 'var(--au-ink)' }}>BOURXE</p>
            <p className="text-[9px]" style={{ color: 'var(--au-faint)' }}>Activa Electrical</p>
          </div>
        </div>
        <span className="size-7 rounded-full" style={{ background: 'var(--au-accent-soft)' }} />
      </div>

      <p className="mt-4 text-[15px] font-bold tracking-tight" style={{ color: 'var(--au-ink)' }}>Good morning</p>
      <p className="mt-0.5 text-[10px]" style={{ color: 'var(--au-muted)' }}>Here is your workspace today</p>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {[
          { label: 'Outstanding', value: 'NGN 4.2m' },
          { label: 'Open quotes', value: '12' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[12px] p-3"
            style={{ background: 'var(--au-raised)', boxShadow: '0 0 0 1px var(--au-hairline)' }}
          >
            <p className="text-[9px]" style={{ color: 'var(--au-faint)' }}>{card.label}</p>
            <p className="mt-1 text-[14px] font-bold tracking-tight" style={{ color: 'var(--au-ink)' }}>{card.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 mb-2 text-[10px] font-semibold" style={{ color: 'var(--au-muted)' }}>Recent documents</p>
      <div className="space-y-2">
        {['Quotation 1042', 'Invoice 8831', 'Waybill 2207'].map((row) => (
          <div
            key={row}
            className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5"
            style={{ background: 'var(--au-raised)', boxShadow: '0 0 0 1px var(--au-hairline)' }}
          >
            <span className="size-6 shrink-0 rounded-[7px]" style={{ background: 'var(--au-accent-soft)' }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium" style={{ color: 'var(--au-ink)' }}>{row}</p>
              <div className="mt-1 h-1.5 w-2/3 rounded-full" style={{ background: 'var(--au-muted-surface)' }} />
            </div>
            <span className="h-4 w-9 shrink-0 rounded-full" style={{ background: 'var(--au-accent-soft)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AppUpdateModalPreview() {
  const navigate = useNavigate()
  const [variant, setVariant] = useState<Variant>('structural')
  const [family, setFamily] = useState<PhotoHeroFamilyId>('slate-navy')
  const [appearance, setAppearance] = useState<PhotoHeroAppearance>('light')
  const [missingVersion, setMissingVersion] = useState(false)
  const [failNext, setFailNext] = useState(false)
  const failNextRef = useRef(false)

  const { rootStyle } = useExperimentThemeStyle(family, appearance)

  const release = missingVersion
    ? { ...PREVIEW_RELEASE, versionName: null, versionCode: null }
    : PREVIEW_RELEASE

  const sim = useSimulatedDownload(PREVIEW_RELEASE.sizeBytes)
  const previewSim: SimulatedDownload = {
    ...sim,
    start: (options) => {
      const fail = failNextRef.current || options?.fail === true
      failNextRef.current = false
      setFailNext(false)
      sim.start({ fail })
    },
  }

  const armFailure = (on: boolean) => {
    failNextRef.current = on
    setFailNext(on)
  }

  const caption =
    variant === 'structural'
      ? 'Variant 1: bigdrops-free card rhythm with kinetics feature badges and a spring action flow.'
      : 'Variant 2: water-melon soft elevated sheet, a grace ring, and a pulsing action.'

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: INTER }}>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/design-lab')}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Design Lab
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight">App Update Modal</h1>
            <p className="text-xs text-muted-foreground">Two V2 sheets on a Galaxy S24 Ultra, bound to the Onboarding v5 palette.</p>
          </div>
          <button
            type="button"
            onClick={sim.reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" /> Reset
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<Variant>
            label="Design variant"
            value={variant}
            onChange={setVariant}
            options={[
              { value: 'structural', label: 'Structural' },
              { value: 'fluid', label: 'Fluid' },
            ]}
          />
          <Segmented<PhotoHeroAppearance>
            label="Appearance"
            value={appearance}
            onChange={setAppearance}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <FamilyPicker family={family} onChange={setFamily} />
          <Toggle checked={missingVersion} onChange={setMissingVersion}>Missing version</Toggle>
          <Toggle checked={failNext} onChange={armFailure}>Simulate failure</Toggle>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="au-device" style={rootStyle}>
            <style>{ALIAS_CSS + DEVICE_CSS}</style>
            <div className="au-frame">
              <span className="au-side au-side--vol" aria-hidden="true" />
              <span className="au-side au-side--power" aria-hidden="true" />
              <div className="au-bezel">
                <div className="au-screen">
                  <PhoneBackdrop />
                  <div className="au-scrim" />
                  <div className="au-sheet-slot">
                    {variant === 'structural' ? (
                      <AppUpdateStructural release={release} sim={previewSim} />
                    ) : (
                      <AppUpdateFluid release={release} sim={previewSim} />
                    )}
                  </div>
                  <StatusBar />
                  <span className="au-camera" />
                  <div className="au-gesture"><span /></div>
                </div>
              </div>
            </div>
          </div>
          <p className="max-w-md text-center text-xs leading-5 text-muted-foreground">{caption}</p>
          <p className="max-w-md text-center text-[11px] leading-5 text-muted-foreground">
            Surfaces, text, and buttons read the Onboarding v5 photo-hero palette, so every family stays
            native in Light and Dark with no injected colors.
          </p>
          <p className="max-w-md text-center text-[11px] leading-5 text-muted-foreground">
            Toggle “Simulate failure” then start a download to preview the sanitized error and automatic
            web fallback. “Missing version” shows the Latest fallback label.
          </p>
        </div>
      </div>
    </div>
  )
}