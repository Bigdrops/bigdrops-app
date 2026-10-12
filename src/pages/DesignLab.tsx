import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import Layout, { MobileChromeContext } from '@/components/Layout'
import { SidebarToggleIcon } from '@/components/unlumen-ui/sidebar-toggle-icon'
import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { DESIGN_LAB_PREVIEWS } from '@/lib/designLabPreviews'
import {
  getPhotoHeroVars,
  isPhotoHeroFamilyId,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
  type PhotoHeroVars,
} from '@/components/onboarding/photo-hero-v2-theme'

function useResolvedAppearance(mode: 'light' | 'dark' | 'system'): PhotoHeroAppearance {
  const [systemAppearance, setSystemAppearance] = React.useState<PhotoHeroAppearance>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  React.useEffect(() => {
    if (mode !== 'system') return
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemAppearance(media.matches ? 'dark' : 'light')
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  return mode === 'system' ? systemAppearance : mode
}

function resolveDesignLabFamily(value: unknown): PhotoHeroFamilyId {
  return isPhotoHeroFamilyId(value) ? value : 'slate-navy'
}

// The menu trigger must consume MobileChromeContext from BELOW Layout's
// provider, exactly like DashboardOverview sits inside Layout's children.
// Reading the context at the page level (above the <Layout> this file
// renders) yields the default no-op value, so the button can never open
// the drawer. This child renders inside Layout, so it gets the live value.
function DesignLabMenuButton() {
  const { openSidebar, sidebarOpen } = React.useContext(MobileChromeContext)
  return (
    <button
      type="button"
      onClick={openSidebar}
      aria-label="Open navigation menu"
      aria-expanded={sidebarOpen}
      className="dlab-menu md:hidden"
    >
      <SidebarToggleIcon isOpen={sidebarOpen} strokeWidth={2} className="h-5 w-5" />
    </button>
  )
}

// Photo recipe keys mirrored onto the document root as `--dlab-nav-*` while
// Design Lab is active. Triplet conversion keeps `hsl(var(--…))` consumers
// valid; gradient and glass values pass through untouched.
const NAV_TOKEN_KEYS = [
  '--ink',
  '--ink-2',
  '--ink-3',
  '--surface',
  '--surface-muted',
  '--surface-raised',
  '--primary',
  '--line',
  '--line-strong',
  '--scene-intro',
  '--glass-bg',
  '--glass-line',
] as const

function toNavTokenValue(value: string): string {
  return value.startsWith('hsl(') && value.endsWith(')') ? value.slice(4, -1) : value
}

function applyNavAtmosphere(vars: PhotoHeroVars, family: PhotoHeroFamilyId, appearance: PhotoHeroAppearance) {
  if (typeof document === 'undefined') return () => {}
  const root = document.documentElement
  root.setAttribute('data-dlab-nav', `${family}-${appearance}`)
  const applied: string[] = []
  for (const key of NAV_TOKEN_KEYS) {
    const value = vars[key]
    if (typeof value !== 'string' || value.length === 0) continue
    const name = `--dlab-nav-${key.slice(2)}`
    root.style.setProperty(name, toNavTokenValue(value))
    applied.push(name)
  }
  return () => {
    root.removeAttribute('data-dlab-nav')
    for (const name of applied) root.style.removeProperty(name)
  }
}

export default function DesignLab() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()
  const family = resolveDesignLabFamily(preference.themePresetId)
  const appearance = useResolvedAppearance(preference.themeMode)
  const vars = React.useMemo(() => getPhotoHeroVars(family, appearance), [appearance, family])

  // Atmospheric navigation lives only while this page is mounted: the
  // attribute plus the mirrored tokens vanish on unmount, restoring the
  // ordinary application navigation on every other route.
  React.useEffect(() => applyNavAtmosphere(vars, family, appearance), [vars, family, appearance])

  return (
    <Layout title="Design Lab" hidePageHeader contentClassName="!px-0 !pt-0">
      <main
        className="dlab-shell"
        style={vars as React.CSSProperties}
        data-family={family}
        data-appearance={appearance}
      >
        <style>{`
          .dlab-shell{
            --lab-bg:var(--scene-intro);
            --lab-ink:var(--chrome-ink);
            --lab-muted:var(--copy);
            --lab-glass:var(--glass-bg);
            --lab-line:var(--glass-line);
            --lab-shadow:var(--glass-shadow);
            position:relative;
            min-height:calc(100dvh - 76px);
            overflow:hidden;
            background:var(--lab-bg);
            color:var(--lab-ink);
            isolation:isolate;
          }
          .dlab-shell::before,
          .dlab-shell::after{
            content:"";
            position:absolute;
            pointer-events:none;
            border-radius:999px;
            z-index:0;
          }
          .dlab-shell::before{
            width:min(60vw,440px);
            height:min(30vh,260px);
            left:-16%;
            top:-10%;
            background:var(--field-a);
            filter:blur(54px);
            opacity:.22;
          }
          .dlab-shell::after{
            width:min(56vw,420px);
            height:min(30vh,250px);
            right:-18%;
            top:20%;
            background:var(--field-b);
            filter:blur(60px);
            opacity:.18;
          }
          .dlab-wrap{
            position:relative;
            z-index:1;
            width:min(100%,960px);
            margin:0 auto;
            padding:calc(env(safe-area-inset-top,0px) + 12px) 16px calc(env(safe-area-inset-bottom,0px) + 104px);
          }
          .dlab-head{padding:2px 0 4px}
          .dlab-headrow{
            display:flex;
            align-items:center;
            gap:10px;
          }
          .dlab-headrow h1{
            flex:1;
            min-width:0;
            margin:0;
            font-size:22px;
            line-height:1.05;
            letter-spacing:-.02em;
            font-weight:800;
          }
          .dlab-sub{
            margin:6px 0 0 54px;
            color:var(--lab-muted);
            font-size:12px;
            line-height:1.4;
            font-weight:600;
          }
          .dlab-menu{
            display:grid;
            place-items:center;
            width:44px;
            height:44px;
            flex:0 0 auto;
            border:1px solid var(--lab-line);
            border-radius:14px;
            background:var(--lab-glass);
            color:var(--lab-ink);
            -webkit-backdrop-filter:blur(18px) saturate(150%);
            backdrop-filter:blur(18px) saturate(150%);
            box-shadow:0 12px 28px color-mix(in srgb,var(--lab-shadow) 70%,transparent);
          }
          .dlab-toggle{
            -webkit-backdrop-filter:blur(18px) saturate(150%);
            backdrop-filter:blur(18px) saturate(150%);
          }
          .dlab-menu:focus-visible,
          .dlab-card:focus-visible{
            outline:2px solid var(--hero-accent);
            outline-offset:2px;
          }
          .dlab-sec-head{
            display:flex;
            align-items:baseline;
            justify-content:space-between;
            gap:12px;
            margin:10px 0 8px;
          }
          .dlab-sec-head h2{
            margin:0;
            font-size:13px;
            font-weight:800;
            letter-spacing:-.01em;
          }
          .dlab-count{
            color:var(--lab-muted);
            font-size:11px;
            font-weight:700;
            white-space:nowrap;
          }
          .dlab-grid{
            display:grid;
            gap:12px;
            grid-template-columns:1fr;
          }
          @media (min-width:600px){
            .dlab-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
          }
          .dlab-card{
            display:flex;
            gap:12px;
            align-items:stretch;
            width:100%;
            padding:12px;
            border:1px solid var(--lab-line);
            border-radius:20px;
            background:var(--lab-glass);
            color:var(--lab-ink);
            text-align:left;
            box-shadow:0 18px 42px color-mix(in srgb,var(--lab-shadow) 78%,transparent);
            -webkit-backdrop-filter:blur(20px) saturate(150%);
            backdrop-filter:blur(20px) saturate(150%);
            outline:none;
            transition:transform .18s ease, border-color .18s ease;
          }
          .dlab-card:hover{
            transform:translateY(-1px);
            border-color:color-mix(in srgb,var(--hero-accent) 45%,var(--lab-line));
          }
          .dlab-thumb{
            position:relative;
            flex:0 0 104px;
            min-height:128px;
            overflow:hidden;
            border-radius:14px;
            background:linear-gradient(165deg,var(--field-a),var(--field-b));
          }
          .dlab-thumb::before,
          .dlab-thumb::after{
            content:"";
            position:absolute;
            border-radius:999px;
            filter:blur(16px);
            opacity:.55;
          }
          .dlab-thumb::before{
            width:90%;
            height:46%;
            left:-20%;
            bottom:-8%;
            background:var(--field-b);
          }
          .dlab-thumb::after{
            width:52%;
            height:34%;
            right:-10%;
            top:-6%;
            background:rgba(255,255,255,.5);
          }
          .dlab-mark{
            position:absolute;
            inset:0;
            z-index:1;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:6px;
            color:#fff;
            text-shadow:0 1px 10px rgba(0,0,0,.4);
          }
          .dlab-mark strong{
            font-size:26px;
            line-height:1;
            font-weight:900;
            letter-spacing:-.04em;
          }
          .dlab-mark small{
            font-size:8px;
            font-weight:800;
            letter-spacing:.22em;
          }
          .dlab-info{
            display:flex;
            flex-direction:column;
            min-width:0;
            flex:1;
            padding:2px 0;
          }
          .dlab-eyebrow{
            font-size:9px;
            font-weight:800;
            letter-spacing:.14em;
            text-transform:uppercase;
            color:var(--lab-muted);
          }
          .dlab-namerow{
            display:flex;
            align-items:center;
            gap:6px;
            margin-top:3px;
          }
          .dlab-name{
            min-width:0;
            flex:1;
            font-size:15px;
            line-height:1.2;
            font-weight:800;
            letter-spacing:-.01em;
          }
          .dlab-go{
            display:grid;
            place-items:center;
            width:28px;
            height:28px;
            flex:0 0 auto;
            border:1px solid var(--lab-line);
            border-radius:10px;
            color:var(--lab-muted);
          }
          .dlab-desc{
            margin:4px 0 0;
            color:var(--lab-muted);
            font-size:12px;
            line-height:1.45;
            font-weight:600;
          }
          .dlab-tags{
            display:flex;
            flex-wrap:wrap;
            gap:6px;
            margin-top:auto;
            padding-top:8px;
          }
          .dlab-tags span{
            border:1px solid var(--lab-line);
            border-radius:999px;
            padding:4px 8px;
            font-size:10.5px;
            font-weight:700;
            white-space:nowrap;
          }
          .dlab-empty{
            border:1px dashed var(--lab-line);
            border-radius:18px;
            padding:16px;
            color:var(--lab-muted);
            font-size:12.5px;
            font-weight:600;
          }
          /* Atmospheric navigation, scoped to Design Lab only. The rules
             below match only while [data-dlab-nav] is present, and the tokens
             plus the attribute are removed when this page unmounts. */
          [data-dlab-nav] [data-bd-shell="app"] > aside,
          [data-dlab-nav] [data-slot="sheet-content"][data-side="left"]{
            --ink:var(--dlab-nav-ink);
            --ink-2:var(--dlab-nav-ink-2);
            --ink-3:var(--dlab-nav-ink-3);
            --surface:var(--dlab-nav-surface);
            --surface-muted:var(--dlab-nav-surface-muted);
            --surface-raised:var(--dlab-nav-surface-raised);
            --primary:var(--dlab-nav-primary);
            --line:var(--dlab-nav-line);
            --line-strong:var(--dlab-nav-line-strong);
            --bd-text:var(--dlab-nav-ink);
            --bd-text-muted:var(--dlab-nav-ink-2);
            --bd-border:var(--dlab-nav-line);
            --bd-surface:var(--dlab-nav-surface);
            --bd-surface-muted:var(--dlab-nav-surface-muted);
            --bd-layout-sidebar:var(--dlab-nav-surface);
            --bd-overlay-text:var(--dlab-nav-ink);
            --bd-overlay-border:var(--dlab-nav-line);
            --bd-overlay-bg:var(--dlab-nav-surface);
          }
          [data-dlab-nav] [data-bd-shell="app"] > aside{
            background:var(--dlab-nav-scene-intro);
            border-color:var(--dlab-nav-glass-line);
          }
          [data-dlab-nav] [data-slot="sheet-content"][data-side="left"]{
            background:var(--dlab-nav-glass-bg);
            -webkit-backdrop-filter:blur(24px) saturate(150%);
            backdrop-filter:blur(24px) saturate(150%);
            border-color:var(--dlab-nav-glass-line);
            color:hsl(var(--dlab-nav-ink));
          }
          @media (min-width:768px){
            /* The shell exposes the desktop sidebar from md upwards, so the
               mobile drawer trigger must stay hidden there. This unlayered
               rule is deliberate: it deterministically beats Tailwind's
               layered md:hidden at equal specificity. */
            .dlab-menu{display:none}
            .dlab-sub{margin-left:0}
            .dlab-wrap{padding-left:24px;padding-right:24px}
          }
          @media (min-width:1024px){
            .dlab-headrow h1{font-size:26px}
            .dlab-card{padding:14px}
            .dlab-thumb{flex-basis:136px;min-height:164px}
            .dlab-name{font-size:16px}
          }
          @media (prefers-reduced-transparency:reduce){
            .dlab-menu,.dlab-card,.dlab-empty{
              -webkit-backdrop-filter:none;
              backdrop-filter:none;
              background:var(--surface);
            }
          }
        `}</style>
        <div className="dlab-wrap">
          <header className="dlab-head">
            <div className="dlab-headrow">
              <DesignLabMenuButton />
              <h1>Design Lab</h1>
              <ThemeToggleButton className="h-11 w-11 rounded-[14px] border border-[var(--lab-line)] bg-[var(--lab-glass)] text-[var(--lab-ink)] shadow-[0_12px_28px_color-mix(in_srgb,var(--lab-shadow)_70%,transparent)]" />
            </div>
            <p className="dlab-sub">Preview upcoming experiences without changing your workspace.</p>
          </header>

          <section aria-labelledby="dlab-collection">
            <div className="dlab-sec-head">
              <h2 id="dlab-collection">Available experiences</h2>
              <span className="dlab-count">
                {DESIGN_LAB_PREVIEWS.length} available
              </span>
            </div>

            {DESIGN_LAB_PREVIEWS.length > 0 ? (
              <div className="dlab-grid">
                {DESIGN_LAB_PREVIEWS.map((preview) => (
                  <button
                    key={preview.id}
                    type="button"
                    onClick={() => navigate(preview.route)}
                    className="dlab-card"
                    aria-label={`Open ${preview.name}`}
                  >
                    <span className="dlab-thumb" aria-hidden="true">
                      <span className="dlab-mark">
                        <strong>B</strong>
                        <small>BOURXE</small>
                      </span>
                    </span>
                    <span className="dlab-info">
                      <span className="dlab-eyebrow">{preview.eyebrow}</span>
                      <span className="dlab-namerow">
                        <span className="dlab-name">{preview.name}</span>
                        <span className="dlab-go">
                          <ChevronRight className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                        </span>
                      </span>
                      <span className="dlab-desc">{preview.description}</span>
                      <span className="dlab-tags">
                        {preview.capabilities.map((capability) => (
                          <span key={capability}>{capability}</span>
                        ))}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dlab-empty">
                <p>No previews are registered yet.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </Layout>
  )
}
