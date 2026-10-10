/**
 * Native React implementation of the Onboarding V2 (PhotoHero V2) preview.
 *
 * Replaces the legacy sandboxed-iframe HTML wrapper. Composition, copy,
 * illustrations, the animated keke, tracking treatment, and motion character
 * are preserved; theme family × appearance (5 × light/dark) is derived from
 * `./photo-hero-v2-theme` and applied to this container only — the persisted
 * application theme and all production auth/startup logic are untouched.
 */

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { PasswordStrength, createPasswordRules } from '@/components/arc/password-strength/password-strength'
import { PasswordField } from '@/components/arc/password-field/password-field'
import './arc-password-adaptation.css'
import bigdropsLogo from '../../../docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/icons/android/mipmap-xxxhdpi/ic_launcher.png'
import {
  PHOTO_HERO_FAMILIES,
  PHOTO_HERO_FAMILY_META,
  getPhotoHeroVars,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from './photo-hero-v2-theme'

const SLIDE_NAMES = ['Intro', 'Invoicing', 'Logistics', 'Projects', 'Sign up']
const NEXT_LABELS = ['Get started', 'Continue', 'Continue', 'Get started', 'Create account']
const LAST = SLIDE_NAMES.length - 1
const AUTH = LAST
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Preview-only: Arc strength rules floored at the preview's existing
// 8-character password policy (no new auth policy introduced).
const PW_RULES = createPasswordRules({ minLength: 8 })

type Mode = 'interactive' | 'compare'

export default function PhotoHeroV2Preview() {
  const [family, setFamily] = React.useState<PhotoHeroFamilyId>('slate-navy')
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>('dark')
  const [mode, setMode] = React.useState<Mode>('interactive')
  const [active, setActive] = React.useState(0)
  // Collapsed by default to reclaim vertical space; selections persist in state.
  const [themeOpen, setThemeOpen] = React.useState(false)
  const fabRef = React.useRef<HTMLButtonElement>(null)
  const popRef = React.useRef<HTMLElement>(null)

  // Popover dismissal: Escape returns focus to the trigger; outside taps close.
  React.useEffect(() => {
    if (!themeOpen) return
    ;(popRef.current?.querySelector('button') as HTMLElement | null)?.focus()
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node | null
      if (popRef.current?.contains(t) || fabRef.current?.contains(t)) return
      setThemeOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setThemeOpen(false)
        fabRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [themeOpen])

  const vars = React.useMemo(() => getPhotoHeroVars(family, appearance), [family, appearance])
  const familyLabel = PHOTO_HERO_FAMILY_META.find((f) => f.id === family)?.label ?? family

  return (
    <div className="oh2-root" style={vars as React.CSSProperties} data-appearance={appearance}>
      <style>{CSS}</style>
      <a
        className="oh2-skiplink"
        href="#oh2-signup-fields"
        onClick={(e) => {
          e.preventDefault()
          setMode('interactive')
          carouselGoTo(AUTH)
          window.setTimeout(() => document.getElementById('oh2-in-name')?.focus(), 460)
        }}
      >
        Skip to sign-up form
      </a>
      <p className="oh2-vh" role="status">
        {mode === 'compare'
          ? `Compare mode. Current theme: ${familyLabel} ${appearance}.`
          : `Step ${active + 1} of ${SLIDE_NAMES.length}: ${SLIDE_NAMES[active]}. Theme: ${familyLabel} ${appearance}.`}
      </p>

      <button
        ref={fabRef}
        type="button"
        className="oh2-themefab"
        aria-label={themeOpen ? 'Close preview theme controls' : 'Open preview theme controls'}
        aria-expanded={themeOpen}
        aria-controls="oh2-theme-pop"
        onClick={() => setThemeOpen((o) => !o)}
      >
        <span aria-hidden="true">🎨</span>
      </button>
      {themeOpen ? (
      <section ref={popRef} id="oh2-theme-pop" className="oh2-experiment oh2-pop" aria-label="Onboarding V2 preview controls">
        <div className="oh2-group" role="group" aria-label="Preview mode">
          <button type="button" aria-pressed={mode === 'interactive'} onClick={() => setMode('interactive')}>
            Interactive
          </button>
          <button type="button" aria-pressed={mode === 'compare'} onClick={() => setMode('compare')}>
            Compare
          </button>
        </div>
        <div className="oh2-group" role="group" aria-label="Theme family">
          {PHOTO_HERO_FAMILY_META.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={family === f.id}
              aria-label={`Use ${f.label} ${appearance} theme`}
              onClick={() => setFamily(f.id)}
            >
              <span className="oh2-dot" aria-hidden="true" style={{ ['--swatch' as string]: f.swatch }} />
              <span>{f.short}</span>
            </button>
          ))}
        </div>
        <div className="oh2-group" role="group" aria-label="Appearance">
          <button
            type="button"
            aria-pressed={appearance === 'light'}
            onClick={() => setAppearance('light')}
          >
            <Sun className="oh2-ico" aria-hidden="true" />
            <span>Light</span>
          </button>
          <button type="button" aria-pressed={appearance === 'dark'} onClick={() => setAppearance('dark')}>
            <Moon className="oh2-ico" aria-hidden="true" />
            <span>Dark</span>
          </button>
        </div>
        <button
          type="button"
          className="oh2-popclose"
          onClick={() => {
            setThemeOpen(false)
            fabRef.current?.focus()
          }}
        >
          Close
        </button>
      </section>
      ) : null}
      <p className="oh2-theme-name" aria-hidden="true">
        Theme<span>{`${familyLabel} · ${appearance === 'light' ? 'Light' : 'Dark'}`}</span>
      </p>

      {mode === 'compare' ? (
        <CompareView />
      ) : (
        <Carousel appearance={appearance} active={active} onActive={setActive} />
      )}
    </div>
  )
}

// Module-level bridge so the skip link can drive the carousel without
// lifting carousel internals into preview state.
let carouselGoToFn: ((i: number) => void) | null = null
function carouselGoTo(i: number) {
  carouselGoToFn?.(i)
}

// ── Compare: all ten family × appearance combinations ────────────────────

function CompareView() {
  const cards: Array<{ family: PhotoHeroFamilyId; appearance: PhotoHeroAppearance }> = []
  for (const family of PHOTO_HERO_FAMILIES) {
    for (const appearance of ['light', 'dark'] as const) cards.push({ family, appearance })
  }
  const sourceOf = (family: PhotoHeroFamilyId, appearance: PhotoHeroAppearance) =>
    appearance === 'dark'
      ? (
          {
            'slate-navy': 'LIQUID_ONYX_CORE',
            'amber-terracotta': 'AMBER_DARK',
            'ocean-teal': 'TEAL_DARK',
            'rose-gold': 'ROSE_DARK',
            'forest-green': 'FOREST_DARK',
          } as const
        )[family]
      : (
          {
            'slate-navy': 'SLATE_NAVY_CORE',
            'amber-terracotta': 'AMBER_LIGHT',
            'ocean-teal': 'TEAL_LIGHT',
            'rose-gold': 'ROSE_LIGHT',
            'forest-green': 'FOREST_LIGHT',
          } as const
        )[family]
  return (
    <section className="oh2-compare" aria-label="Five-theme light and dark comparison">
      <div className="oh2-compare-head">
        <h1>PhotoHero under five BOURXE themes</h1>
        <p>
          Light and dark appearances share one premium recipe. Each card reuses the same cinematic
          gradient and glass-card system with color definitions grounded in the app theme registry.
        </p>
      </div>
      <div className="oh2-compare-grid">
        {cards.map(({ family, appearance }) => {
          const label = PHOTO_HERO_FAMILY_META.find((f) => f.id === family)?.label ?? family
          return (
            <article
              key={`${family}-${appearance}`}
              className="oh2-theme-card"
              style={getPhotoHeroVars(family, appearance) as React.CSSProperties}
              aria-label={`${label} ${appearance}`}
            >
              <i className="oh2-vignette" aria-hidden="true" />
              <div className="oh2-mini-brand">
                <span className="oh2-mini-logo" aria-hidden="true">
                  <img src={bigdropsLogo} alt="" />
                </span>
                <span>
                  {label} · {appearance === 'light' ? 'Light' : 'Dark'}
                </span>
              </div>
              <div className="oh2-mini-glass">
                <span>{sourceOf(family, appearance)}</span>
                <strong>₦1,250,000</strong>
                <p>
                  Paid invoice — glass tint and gradient fields from {label}{' '}
                  {appearance} tokens.
                </p>
              </div>
              <div className="oh2-mini-copy">
                <h2>Your operations. Simplified.</h2>
                <p>Same PhotoHero structure, appearance switched, theme energy kept.</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// ── Carousel ─────────────────────────────────────────────────────────────

function Carousel({
  appearance,
  active,
  onActive,
}: {
  appearance: PhotoHeroAppearance
  active: number
  onActive: (i: number) => void
}) {
  const deckRef = React.useRef<HTMLDivElement>(null)
  const trackRef = React.useRef<HTMLDivElement>(null)
  const state = React.useRef({ x: 0, vx: 0, tx: 0, raf: 0 as number | null, w: 0, idx: 0 })
  const idxRef = React.useRef(0)
  const [reduced, setReduced] = React.useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const activeRef = React.useRef(active)
  activeRef.current = active
  const reducedRef = React.useRef(reduced)
  reducedRef.current = reduced
  const counted = React.useRef<Record<string, boolean>>({})

  const metrics = React.useCallback(() => {
    const deck = deckRef.current
    if (deck) state.current.w = deck.clientWidth
  }, [])

  const setX = React.useCallback((nx: number) => {
    state.current.x = nx
    if (trackRef.current) trackRef.current.style.transform = `translate3d(${nx}px,0,0)`
  }, [])

  const afterSettle = React.useCallback(() => {
    const s = state.current
    onActive(s.idx)
    if (s.idx === 1 && !counted.current.s1) {
      counted.current.s1 = true
      countUp()
    }
  }, [onActive])

  const springTo = React.useCallback(
    (target: number, vel = 0) => {
      const s = state.current
      s.tx = target
      if (reducedRef.current) {
        s.vx = 0
        setX(s.tx)
        afterSettle()
        return
      }
      if (s.raf) cancelAnimationFrame(s.raf)
      const K = (2 * Math.PI) / 0.42
      const KK = K * K
      const CC = 2 * K
      let lastT = performance.now()
      const step = (now: number) => {
        const dt = Math.min((now - lastT) / 1000, 1 / 30)
        lastT = now
        const a = KK * (s.tx - s.x) - CC * s.vx
        s.vx += a * dt
        s.x += s.vx * dt
        if (Math.abs(s.tx - s.x) < 0.4 && Math.abs(s.vx) < 6) {
          setX(s.tx)
          s.vx = 0
          s.raf = null
          afterSettle()
          return
        }
        setX(s.x)
        s.raf = requestAnimationFrame(step)
      }
      s.vx = vel
      s.raf = requestAnimationFrame(step)
    },
    [afterSettle, setX],
  )

  const goTo = React.useCallback(
    (i: number, vel = 0) => {
      const s = state.current
      s.idx = Math.max(0, Math.min(LAST, i))
      idxRef.current = s.idx
      springTo(-s.idx * s.w, vel)
    },
    [springTo],
  )
  const goToRef = React.useRef(goTo)
  goToRef.current = goTo

  React.useEffect(() => {
    carouselGoToFn = goTo
    return () => {
      carouselGoToFn = null
    }
  }, [goTo])

  React.useEffect(() => {
    metrics()
    state.current.idx = activeRef.current
    idxRef.current = activeRef.current
    setX(-state.current.idx * state.current.w)
    const onResize = () => {
      metrics()
      const s = state.current
      if (s.raf) cancelAnimationFrame(s.raf)
      s.raf = null
      setX(-s.idx * s.w)
    }
    window.addEventListener('resize', onResize)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => {
      window.removeEventListener('resize', onResize)
      mq.removeEventListener?.('change', onChange)
      if (state.current.raf) cancelAnimationFrame(state.current.raf)
    }
  }, [metrics, setX])

  // Arrow-key traversal (guarded away from form fields), as in the reference.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.('input,textarea,select,[contenteditable="true"]')) return
      if (e.key === 'ArrowRight') goToRef.current(idxRef.current + 1)
      else if (e.key === 'ArrowLeft') goToRef.current(idxRef.current - 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Drag-to-swipe with rubber-banding and velocity projection.
  const drag = React.useRef({ on: false, startPX: 0, startX: 0, hist: [] as Array<{ t: number; x: number }>, moved: 0 })
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input,button,form,a')) return
    const d = drag.current
    const s = state.current
    d.on = true
    d.moved = 0
    d.hist = []
    d.startPX = e.clientX
    d.startX = s.x
    if (s.raf) cancelAnimationFrame(s.raf)
    s.raf = null
    s.vx = 0
    deckRef.current?.setPointerCapture(e.pointerId)
    d.hist.push({ t: performance.now(), x: s.x })
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.on) return
    const s = state.current
    const dx = e.clientX - d.startPX
    d.moved = Math.max(d.moved, Math.abs(dx))
    let nx = d.startX + dx
    const rubber = (over: number) => {
      const w = s.w || 1
      return (over * w * 0.55) / (w + 0.55 * Math.abs(over))
    }
    if (nx > 0) nx = rubber(nx)
    if (nx < -(LAST * s.w)) nx = -(LAST * s.w) - rubber(-(LAST * s.w) - nx)
    setX(nx)
    d.hist.push({ t: performance.now(), x: nx })
    if (d.hist.length > 6) d.hist.shift()
  }
  const endDrag = () => {
    const d = drag.current
    if (!d.on) return
    d.on = false
    const s = state.current
    if (d.moved < 10) {
      springTo(-s.idx * s.w, 0)
      return
    }
    const first = d.hist[0]
    const cur = d.hist[d.hist.length - 1]
    const dt = (cur.t - first.t) / 1000 || 0.016
    const v = (cur.x - first.x) / dt
    const projected = cur.x + (v / 1000) * (0.998 / (1 - 0.998))
    let target = Math.round(-projected / (s.w || 1))
    if (v < -350 && target === s.idx) target = s.idx + 1
    if (v > 350 && target === s.idx) target = s.idx - 1
    s.idx = Math.max(0, Math.min(LAST, target))
    springTo(-s.idx * s.w, v)
  }

  const isAuth = active === AUTH
  const chromeLight = appearance === 'light' || isAuth

  return (
    <div className={`oh2-app${chromeLight ? ' oh2-chromelight' : ''}`}>
      <header className="oh2-topbar">
        <div className="oh2-brand">
          <span className="oh2-logo" aria-hidden="true">
            <img src={bigdropsLogo} alt="" />
          </span>
          BIGDROPS
        </div>
        {active > 0 && active < LAST ? (
          <button type="button" className="oh2-skipbtn" onClick={() => goTo(LAST)}>
            Skip
          </button>
        ) : (
          <span className="oh2-skipbtn oh2-hidden" aria-hidden="true" />
        )}
      </header>
      <nav className="oh2-rail" aria-hidden="true">
        {SLIDE_NAMES.map((n, i) => (
          <i key={n} className={i < active ? 'done' : i === active && !isAuth ? 'on' : ''} />
        ))}
      </nav>

      <main
        className="oh2-deck"
        ref={deckRef}
        aria-roledescription="carousel"
        aria-label="BOURXE onboarding"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="oh2-track" ref={trackRef}>
          <IntroSlide active={active === 0} />
          <InvoicingSlide active={active === 1} />
          <LogisticsSlide active={active === 2} />
          <ProjectsSlide active={active === 3} />
          <AuthSlide active={isAuth} />
        </div>
      </main>

      <div className="oh2-bottom">
        <div className="oh2-meta">
          <button
            type="button"
            className={`oh2-backbtn${active > 0 ? ' show' : ''}`}
            aria-label="Previous step"
            onClick={() => goTo(active - 1)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="oh2-dots" role="tablist" aria-label="Onboarding steps">
            {SLIDE_NAMES.map((n, i) => (
              <button
                key={n}
                type="button"
                role="tab"
                aria-current={active === i ? 'true' : 'false'}
                aria-label={`Go to step ${i + 1}: ${n}`}
                onClick={() => goTo(i)}
              >
                <i />
              </button>
            ))}
          </div>
          <span style={{ width: 44 }} aria-hidden="true" />
        </div>
        {!isAuth && (
          <button type="button" className="oh2-cta" onClick={() => goTo(active >= LAST ? LAST : active + 1)}>
            <span className="oh2-lbl">{NEXT_LABELS[active]}</span>
          </button>
        )}
      </div>
    </div>
  )
}

function countUp() {
  const el = document.getElementById('oh2-s1total') as unknown as SVGTextElement | null
  if (!el) return
  el.setAttribute('opacity', '1')
  const target = 248750
  const fmt = (n: number) => `₦${n.toLocaleString('en-US')}`
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = '₦248,750'
    return
  }
  const dur = 900
  let t0 = -1
  const tick = (now: number) => {
    if (t0 < 0) t0 = now
    const p = Math.min((now - t0) / dur, 1)
    const e = 1 - Math.pow(1 - p, 3)
    el.textContent = fmt(Math.round(target * e))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// ── Slides (composition and copy preserved from the V2 reference) ─────────

function Scene({ name, extra }: { name: string; extra?: React.ReactNode }) {
  return (
    <div className={`oh2-scene oh2-${name}`} aria-hidden="true">
      <i className="oh2-blob oh2-b1" />
      <i className="oh2-blob oh2-b2" />
      {extra}
      <i className="oh2-vignette" />
    </div>
  )
}

function IntroSlide({ active }: { active: boolean }) {
  return (
    <section className={`oh2-slide${active ? ' active' : ''}`} aria-roledescription="slide" aria-label="1 of 5">
      <Scene name="sc-intro" extra={<i className="oh2-horizon" />} />
      <div
        className="oh2-hero"
        role="img"
        aria-label="A paid invoice of 1,250,000 naira floats over a dawn city gradient"
      >
        <svg viewBox="0 0 360 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="oh2-psh" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#0b1524" floodOpacity=".45" />
            </filter>
          </defs>
          <g className="oh2-float" style={{ ['--d' as string]: '.15s', ['--fd' as string]: '.3s' } as React.CSSProperties} filter="url(#oh2-psh)">
            <rect x="104" y="34" width="152" height="200" rx="18" fill="#ffffff" />
            <rect x="122" y="56" width="62" height="10" rx="5" fill="var(--primary)" />
            <rect x="122" y="80" width="112" height="7" rx="3.5" fill="#dbe4ee" />
            <rect x="122" y="96" width="112" height="7" rx="3.5" fill="#dbe4ee" />
            <rect x="122" y="112" width="80" height="7" rx="3.5" fill="#dbe4ee" />
            <rect x="122" y="150" width="112" height="14" rx="7" fill="var(--primary)" />
            <text x="226" y="161" fontSize="11" fontWeight="800" fill="#ffffff" textAnchor="end" fontFamily="'DM Mono',monospace">
              ₦1,250,000
            </text>
            <rect x="122" y="186" width="112" height="26" rx="13" fill="var(--success)" />
            <text x="178" y="203" fontSize="11" fontWeight="800" fill="#ffffff" textAnchor="middle" fontFamily="Manrope,sans-serif">
              PAID
            </text>
          </g>
          <g className="oh2-float" style={{ ['--d' as string]: '.4s', ['--fd' as string]: '.9s' } as React.CSSProperties} filter="url(#oh2-psh)" transform="translate(238 148)">
            <rect width="52" height="52" rx="16" fill="#ffffff" />
            <path d="M14 27l8 8 16-18" fill="none" stroke="var(--success)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="oh2-float" style={{ ['--d' as string]: '.55s', ['--fd' as string]: '1.3s' } as React.CSSProperties} filter="url(#oh2-psh)" transform="translate(48 44)">
            <rect width="46" height="46" rx="14" fill="var(--primary)" />
            <text x="23" y="31" fontSize="23" fontWeight="800" fill="#ffffff" textAnchor="middle" fontFamily="Manrope,sans-serif">
              ?
            </text>
          </g>
        </svg>
      </div>
      <div className="oh2-glasscard" style={{ ['--d' as string]: '.5s', left: 24, bottom: 238 } as React.CSSProperties} role="presentation">
        <div className="oh2-gc-head">
          <span>Invoice #2049</span>
          <span className="oh2-gc-pill oh2-ok">Paid</span>
        </div>
        <div className="oh2-gc-value">₦1,250,000</div>
        <div className="oh2-gc-row">
          <span>Logistics fees</span>
          <span>₦1,150,000</span>
        </div>
        <div className="oh2-gc-row">
          <span>VAT</span>
          <span>Applied</span>
        </div>
      </div>
      <div className="oh2-text">
        <h1 className="oh2-rv" style={{ ['--d' as string]: '.15s' } as React.CSSProperties}>
          Your operations.
          <br />
          Simplified.
        </h1>
        <p className="oh2-copy oh2-rv" style={{ ['--d' as string]: '.28s' } as React.CSSProperties}>
          Create, manage, and export documents across invoicing, logistics, and project tracking,
          all in one place.
        </p>
      </div>
    </section>
  )
}

function InvoicingSlide({ active }: { active: boolean }) {
  return (
    <section className={`oh2-slide${active ? ' active' : ''}`} aria-roledescription="slide" aria-label="2 of 5">
      <Scene name="sc-invoicing" />
      <div
        className="oh2-hero"
        role="img"
        aria-label="An invoice being prepared: line items fill in, VAT is applied, and the total reaches 248,750 naira"
      >
        <svg viewBox="0 0 360 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="oh2-psh2" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#0b1524" floodOpacity=".45" />
            </filter>
          </defs>
          <g className="oh2-float" style={{ ['--d' as string]: '.1s', ['--fd' as string]: '.4s' } as React.CSSProperties} filter="url(#oh2-psh2)">
            <rect x="100" y="30" width="160" height="212" rx="18" fill="#ffffff" />
            <rect x="118" y="52" width="64" height="10" rx="5" fill="var(--primary)" />
            <rect x="118" y="80" width="122" height="7" rx="3.5" fill="#dbe4ee" />
            <rect x="118" y="96" width="122" height="7" rx="3.5" fill="#dbe4ee" />
            <rect x="118" y="112" width="88" height="7" rx="3.5" fill="#dbe4ee" />
            <line x1="118" y1="136" x2="240" y2="136" stroke="#cbd5e1" strokeWidth="1.5" />
            <rect x="118" y="150" width="122" height="11" rx="5.5" fill="#dbe4ee" />
            <rect x="118" y="170" width="122" height="16" rx="8" fill="var(--primary)" />
            <text x="230" y="182" fontSize="11.5" fontWeight="800" fill="#ffffff" textAnchor="end" fontFamily="'DM Mono',monospace" id="oh2-s1total" opacity="0">
              ₦0
            </text>
            <rect x="118" y="200" width="122" height="22" rx="11" fill="var(--success)" />
            <text x="179" y="215" fontSize="10.5" fontWeight="800" fill="#ffffff" textAnchor="middle" fontFamily="Manrope,sans-serif">
              EXPORT PDF
            </text>
          </g>
          <g className="oh2-float" style={{ ['--d' as string]: '.5s', ['--fd' as string]: '1s' } as React.CSSProperties} filter="url(#oh2-psh2)" transform="translate(244 96)">
            <rect width="50" height="50" rx="15" fill="var(--primary)" />
            <text x="25" y="34" fontSize="24" fontWeight="800" fill="#ffffff" textAnchor="middle" fontFamily="Manrope,sans-serif">
              ?
            </text>
          </g>
        </svg>
      </div>
      <div className="oh2-text">
        <p className="oh2-eyebrow oh2-rv" style={{ ['--d' as string]: '.12s' } as React.CSSProperties}>
          Invoicing
        </p>
        <h1 className="oh2-rv" style={{ ['--d' as string]: '.18s' } as React.CSSProperties}>
          Create and manage invoices with ease
        </h1>
        <p className="oh2-copy oh2-rv" style={{ ['--d' as string]: '.3s' } as React.CSSProperties}>
          Generate professional invoices, apply taxes and extra charges, and export as PDF in seconds.
        </p>
      </div>
    </section>
  )
}

function LogisticsSlide({ active }: { active: boolean }) {
  return (
    <section className={`oh2-slide${active ? ' active' : ''}`} aria-roledescription="slide" aria-label="3 of 5">
      <Scene name="sc-logi" />
      <div
        className="oh2-hero"
        role="img"
        aria-label="A branded keke tricycle drives a night road with headlight glow and light streaks; the shipment Lagos to Abuja is 65 percent complete"
      >
        <svg viewBox="0 0 360 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="oh2-psh3" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000000" floodOpacity=".5" />
            </filter>
            <linearGradient id="oh2-pvband" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--deep-b)" />
              <stop offset="1" stopColor="var(--deep-a)" />
            </linearGradient>
            <radialGradient id="oh2-pbeam" cx=".2" cy=".5" r=".8">
              <stop offset="0" stopColor="#fde68a" stopOpacity=".85" />
              <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="oh2-pgsh" cx=".5" cy=".5" r=".5">
              <stop offset="0" stopColor="#000000" stopOpacity=".4" />
              <stop offset="1" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="oh2-pkbody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--field-b)" />
              <stop offset=".6" stopColor="var(--field-a)" />
              <stop offset="1" stopColor="var(--primary)" />
            </linearGradient>
            <clipPath id="oh2-kekeLogoClip">
              <rect x="98" y="112" width="28" height="28" rx="8" />
            </clipPath>
          </defs>
          <ellipse className="oh2-sweep" cx="302" cy="162" rx="84" ry="24" fill="url(#oh2-pbeam)" />
          <g className="oh2-streaks" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity=".35">
            <line x1="-40" y1="196" x2="60" y2="196" />
            <line x1="-10" y1="212" x2="130" y2="212" opacity=".6" />
            <line x1="-60" y1="228" x2="30" y2="228" opacity=".4" />
          </g>
          <ellipse cx="184" cy="230" rx="130" ry="9" fill="url(#oh2-pgsh)" />
          <g filter="url(#oh2-psh3)">
            <rect x="76" y="98" width="112" height="96" rx="14" fill="url(#oh2-pkbody)" />
            <rect x="70" y="90" width="124" height="12" rx="6" fill="url(#oh2-pvband)" />
            <path d="M188 114 Q188 100 204 100 L226 100 Q262 100 276 136 Q284 156 284 174 L284 184 Q284 200 266 200 L188 200 Z" fill="url(#oh2-pkbody)" />
            <path d="M218 106 L240 106 Q258 112 268 134 L230 134 Q218 124 218 106 Z" fill="#93b8dc" />
            <rect x="192" y="108" width="20" height="28" rx="6" fill="#93b8dc" opacity=".92" />
            <circle cx="276" cy="150" r="6" fill="#fff7cf" stroke="#94a3b8" />
            <rect x="276" y="178" width="12" height="9" rx="3" fill="#94a3b8" />
            <rect x="74" y="126" width="5" height="16" rx="2.5" fill="#ef4444" />
            <image href={bigdropsLogo} x="98" y="112" width="28" height="28" preserveAspectRatio="xMidYMid slice" clipPath="url(#oh2-kekeLogoClip)" />
            <rect x="136" y="118" width="44" height="5" rx="2.5" fill="url(#oh2-pvband)" opacity=".85" />
            <rect x="78" y="166" width="204" height="20" rx="8" fill="url(#oh2-pvband)" />
            <rect x="80" y="164" width="200" height="3" rx="1.5" fill="#ffffff" opacity=".8" />
            <text x="186" y="181" fontSize="9.5" fontWeight="800" letterSpacing="2.5" fill="#ffffff" textAnchor="middle" fontFamily="Manrope,sans-serif">
              BIGDROPS
            </text>
            <path d="M88 200 a19 19 0 0 1 38 0 z" fill="#0b1524" />
            <path d="M154 200 a19 19 0 0 1 38 0 z" fill="#0b1524" />
            <path d="M243 200 a16 16 0 0 1 32 0 z" fill="#0b1524" />
          </g>
          <WheelSpin cx={107} cy={200} r={19} delay="0s" />
          <WheelSpin cx={173} cy={200} r={19} delay="-.3s" />
          <WheelSpin cx={259} cy={200} r={16} delay="-.55s" small />
        </svg>
      </div>
      <div className="oh2-glasscard" style={{ ['--d' as string]: '.55s', right: 24, bottom: 238 } as React.CSSProperties} role="presentation">
        <div className="oh2-gc-head">
          <span>Lagos → Abuja</span>
          <span className="oh2-gc-pill oh2-info">En route</span>
        </div>
        <div className="oh2-gc-track">
          <i />
          <b />
        </div>
        <div className="oh2-gc-sub">Driver Emmanuel O. · KJA-459XY</div>
      </div>
      <div className="oh2-text">
        <p className="oh2-eyebrow oh2-rv" style={{ ['--d' as string]: '.12s' } as React.CSSProperties}>
          Logistics
        </p>
        <h1 className="oh2-rv" style={{ ['--d' as string]: '.18s' } as React.CSSProperties}>
          Track and manage shipments
        </h1>
        <p className="oh2-copy oh2-rv" style={{ ['--d' as string]: '.3s' } as React.CSSProperties}>
          Keep logistics moving with waybills, delivery notes, and real-time tracking.
        </p>
      </div>
    </section>
  )
}

function WheelSpin({ cx, cy, r, delay, small }: { cx: number; cy: number; r: number; delay: string; small?: boolean }) {
  const hub = small ? 8.5 : 10
  const pin = small ? 3.5 : 4
  return (
    <g className="oh2-wheelspin" style={{ animationDelay: delay } as React.CSSProperties}>
      <circle cx={cx} cy={cy} r={r} fill="#0b1524" />
      <circle cx={cx} cy={cy} r={hub} fill="#94a3b8" />
      <circle cx={cx} cy={cy} r={pin} fill="#334155" />
      <line x1={cx} y1={cy - r + 4} x2={cx} y2={cy - r + 9} stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
      <line x1={cx} y1={cy + r - 9} x2={cx} y2={cy + r - 4} stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
      <line x1={cx - r + 4} y1={cy} x2={cx - r + 9} y2={cy} stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
      <line x1={cx + r - 9} y1={cy} x2={cx + r - 4} y2={cy} stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  )
}

function ProjectsSlide({ active }: { active: boolean }) {
  return (
    <section className={`oh2-slide${active ? ' active' : ''}`} aria-roledescription="slide" aria-label="4 of 5">
      <Scene name="sc-projects" extra={<i className="oh2-grid-lines" />} />
      <div
        className="oh2-hero"
        role="img"
        aria-label="A project panel shows 12 active projects and 4 attention items with progress rows filling"
      >
        <svg viewBox="0 0 360 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="oh2-psh4" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#0b1524" floodOpacity=".45" />
            </filter>
          </defs>
          <g className="oh2-float" style={{ ['--d' as string]: '.1s', ['--fd' as string]: '.4s' } as React.CSSProperties} filter="url(#oh2-psh4)">
            <rect x="66" y="34" width="204" height="196" rx="20" fill="#ffffff" />
            <rect x="88" y="56" width="78" height="10" rx="5" fill="var(--primary)" />
            <rect x="88" y="90" width="9" height="9" rx="2.5" fill="#dbe4ee" />
            <rect x="106" y="90" width="122" height="9" rx="4.5" fill="#dbe4ee" />
            <rect x="88" y="116" width="9" height="9" rx="2.5" fill="#dbe4ee" />
            <rect x="106" y="116" width="94" height="9" rx="4.5" fill="#dbe4ee" />
            <rect x="88" y="142" width="9" height="9" rx="2.5" fill="var(--warning)" />
            <rect x="106" y="142" width="62" height="9" rx="4.5" fill="var(--warning)" />
            <text x="248" y="151" fontSize="14" fontWeight="800" fill="var(--warning)" textAnchor="end" fontFamily="'DM Mono',monospace">
              4
            </text>
            <rect x="88" y="182" width="160" height="26" rx="13" fill="var(--primary)" />
            <text x="168" y="199" fontSize="11" fontWeight="800" fill="#ffffff" textAnchor="middle" fontFamily="Manrope,sans-serif">
              12 ACTIVE PROJECTS
            </text>
          </g>
          <g className="oh2-float" style={{ ['--d' as string]: '.45s', ['--fd' as string]: '1s' } as React.CSSProperties} filter="url(#oh2-psh4)" transform="translate(240 120)">
            <rect width="76" height="68" rx="18" fill="var(--primary)" />
            <path d="M14 44l16-18 14 9 24-28" fill="none" stroke="var(--hero-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </div>
      <div className="oh2-text">
        <p className="oh2-eyebrow oh2-rv" style={{ ['--d' as string]: '.12s' } as React.CSSProperties}>
          Projects
        </p>
        <h1 className="oh2-rv" style={{ ['--d' as string]: '.18s' } as React.CSSProperties}>
          Keep your projects on track
        </h1>
        <p className="oh2-copy oh2-rv" style={{ ['--d' as string]: '.3s' } as React.CSSProperties}>
          Aggregate invoices, payments, quotations, and CSRs under one client engagement.
        </p>
      </div>
    </section>
  )
}

// ── Auth slide (prototype only — no production auth wiring) ───────────────

type FieldState = { touched: boolean; valid: boolean | null }

function AuthSlide({ active }: { active: boolean }) {
  const [tab, setTab] = React.useState<'signup' | 'signin'>('signup')
  // Preview-local secrets only: never logged, persisted, or transmitted.
  const [pw, setPw] = React.useState('')
  const [pwLevel, setPwLevel] = React.useState(0)
  const [confirmPw, setConfirmPw] = React.useState('')
  const [busy, setBusy] = React.useState<'signup' | 'signin' | null>(null)
  const [done, setDone] = React.useState<'signup' | 'signin' | null>(null)
  const [fields, setFields] = React.useState<Record<string, FieldState>>({})
  const timer = React.useRef<number | null>(null)

  React.useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])

  const setField = (id: string, valid: boolean) =>
    setFields((f) => ({ ...f, [id]: { touched: true, valid } }))

  // Preview-only continuation gate: the existing 8-character rule plus a
  // matching confirmation. Strength level is obtained from Arc and consulted
  // (non-empty passwords always score ≥ 1); no new policy is introduced.
  const pwReady = pw.length >= 8 && pwLevel >= 1
  const confirmReady = confirmPw.length > 0 && confirmPw === pw

  const submit = (kind: 'signup' | 'signin', checks: Array<{ id: string; ok: boolean }>) => {
    let firstBad: string | null = null
    for (const c of checks) {
      setField(c.id, c.ok)
      if (!c.ok && !firstBad) firstBad = c.id
    }
    if (firstBad) {
      document.getElementById(firstBad)?.focus()
      return
    }
    setBusy(kind)
    setDone(null)
    timer.current = window.setTimeout(() => {
      setBusy(null)
      setDone(kind)
    }, 1100)
  }

  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value.trim() ?? ''

  return (
    <section className={`oh2-slide oh2-authslide${active ? ' active' : ''}`} aria-roledescription="slide" aria-label="5 of 5">
      <div className="oh2-authwrap">
        <div className="oh2-authhead">
          <div className="oh2-authlogo">
            <img src={bigdropsLogo} alt="BIGDROPS app icon" />
          </div>
          <h1 className="oh2-rv" style={{ ['--d' as string]: '.05s' } as React.CSSProperties}>
            Create your account
          </h1>
          <p className="oh2-copy" style={{ color: 'var(--ink-2)' }}>
            Set up your workspace and start operating in minutes.
          </p>
        </div>

        <div className="oh2-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className="oh2-tab-btn"
            role="tab"
            aria-selected={tab === 'signup'}
            aria-controls="oh2-signup-pane"
            onClick={() => setTab('signup')}
          >
            Sign Up
          </button>
          <button
            type="button"
            className="oh2-tab-btn"
            role="tab"
            aria-selected={tab === 'signin'}
            aria-controls="oh2-signin-pane"
            onClick={() => setTab('signin')}
          >
            Sign In
          </button>
        </div>

        <div className="oh2-sso-group" aria-label="Continue with a provider (prototype)">
          <button type="button" className="oh2-sso-btn">
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
          <button type="button" className="oh2-sso-btn">
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            Continue with Apple
          </button>
        </div>
        <div className="oh2-divider">or continue with email</div>

        <div className="oh2-forms">
          {tab === 'signup' ? (
            <form
              className="oh2-formpane"
              id="oh2-signup-pane"
              noValidate
              aria-label="Create account"
              onSubmit={(e) => {
                e.preventDefault()
                const nameOk = val('oh2-in-name').length >= 2
                const emailOk = EMAIL_RE.test(val('oh2-in-email'))
                const pwOk = (document.getElementById('oh2-in-pw') as HTMLInputElement)?.value.length >= 8
                submit('signup', [
                  { id: 'oh2-f-name', ok: nameOk },
                  { id: 'oh2-f-email', ok: emailOk },
                  { id: 'oh2-f-pw', ok: pwOk },
                  { id: 'oh2-f-pw-confirm', ok: confirmPw.trim().length > 0 && confirmPw === ((document.getElementById('oh2-in-pw') as HTMLInputElement)?.value ?? '') },
                ])
              }}
            >
              <div id="oh2-signup-fields">
                <div className={`oh2-field${fields['oh2-f-name']?.valid === false ? ' oh2-invalid' : fields['oh2-f-name']?.valid ? ' oh2-valid' : ''}`} id="oh2-f-name">
                  <label htmlFor="oh2-in-name">Full name</label>
                  <div className="oh2-control">
                    <input
                      id="oh2-in-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Adaeze Okafor"
                      autoCapitalize="words"
                      aria-invalid={fields['oh2-f-name']?.valid === false}
                      aria-describedby="oh2-e-name"
                      onBlur={(e) => {
                        if (e.target.value) setField('oh2-f-name', e.target.value.trim().length >= 2)
                      }}
                    />
                    <span className="oh2-ok" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M3 8.5l3.5 3.5L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                  <p className="oh2-err" id="oh2-e-name" role="alert">
                    Please enter your full name.
                  </p>
                </div>
                <div className={`oh2-field${fields['oh2-f-email']?.valid === false ? ' oh2-invalid' : fields['oh2-f-email']?.valid ? ' oh2-valid' : ''}`} id="oh2-f-email">
                  <label htmlFor="oh2-in-email">Work email</label>
                  <div className="oh2-control">
                    <input
                      id="oh2-in-email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@company.com"
                      aria-invalid={fields['oh2-f-email']?.valid === false}
                      aria-describedby="oh2-e-email"
                      onBlur={(e) => {
                        if (e.target.value) setField('oh2-f-email', EMAIL_RE.test(e.target.value.trim()))
                      }}
                    />
                    <span className="oh2-ok" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        <path d="M3 8.5l3.5 3.5L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                  <p className="oh2-err" id="oh2-e-email" role="alert">
                    Enter a valid email address.
                  </p>
                </div>
                <div className="oh2-arc" id="oh2-f-pw">
                  <PasswordStrength
                    id="oh2-in-pw"
                    label="Password"
                    name="new-password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    required
                    value={pw}
                    rules={PW_RULES}
                    shortLength={8}
                    error={fields['oh2-f-pw']?.valid === false ? 'Password must be at least 8 characters.' : undefined}
                    onValueChange={(v, strength) => {
                      setPw(v)
                      setPwLevel(strength.level)
                      if (fields['oh2-f-pw']?.valid === false && v.length >= 8) {
                        setField('oh2-f-pw', true)
                      }
                      if (fields['oh2-f-pw-confirm']?.valid === false && confirmPw && confirmPw === v) {
                        setField('oh2-f-pw-confirm', true)
                      }
                    }}
                  />
                </div>
                <div className={`oh2-field oh2-arc${fields['oh2-f-pw-confirm']?.valid === false ? ' oh2-invalid' : ''}`} id="oh2-f-pw-confirm" tabIndex={-1}>
                  <PasswordField
                    id="oh2-in-confirm-pw"
                    label="Confirm password"
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    required
                    value={confirmPw}
                    onChange={(e) => {
                      setConfirmPw(e.target.value)
                      if (fields['oh2-f-pw-confirm']?.valid === false && e.target.value && e.target.value === pw) {
                        setField('oh2-f-pw-confirm', true)
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value) setField('oh2-f-pw-confirm', e.target.value === pw)
                    }}
                    description="Preview only — re-enter the same password."
                    aria-invalid={fields['oh2-f-pw-confirm']?.valid === false}
                    aria-describedby="oh2-e-pw-confirm"
                  />
                  <p className="oh2-err" id="oh2-e-pw-confirm" role="alert">
                    Passwords do not match.
                  </p>
                </div>
              </div>
              <button className={`oh2-cta oh2-cta-auth${busy === 'signup' ? ' oh2-busy' : ''}`} type="submit" disabled={busy === 'signup' || !pwReady || !confirmReady}>
                <span className="oh2-spin" aria-hidden="true" />
                <span className="oh2-lbl">
                  {busy === 'signup' ? 'Creating your workspace…' : done === 'signup' ? 'Account ready ✓' : 'Create account'}
                </span>
              </button>
            </form>
          ) : (
            <form
              className="oh2-formpane"
              id="oh2-signin-pane"
              noValidate
              aria-label="Sign in"
              onSubmit={(e) => {
                e.preventDefault()
                const emailOk = EMAIL_RE.test(val('oh2-in-si-email'))
                const pwOk = val('oh2-in-si-pw').length > 0
                submit('signin', [
                  { id: 'oh2-f-si-email', ok: emailOk },
                  { id: 'oh2-f-si-pw', ok: pwOk },
                ])
              }}
            >
              <div className={`oh2-field${fields['oh2-f-si-email']?.valid === false ? ' oh2-invalid' : fields['oh2-f-si-email']?.valid ? ' oh2-valid' : ''}`} id="oh2-f-si-email">
                <label htmlFor="oh2-in-si-email">Email</label>
                <div className="oh2-control">
                  <input
                    id="oh2-in-si-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@company.com"
                    aria-invalid={fields['oh2-f-si-email']?.valid === false}
                    aria-describedby="oh2-e-si-email"
                    onBlur={(e) => {
                      if (e.target.value) setField('oh2-f-si-email', EMAIL_RE.test(e.target.value.trim()))
                    }}
                  />
                  <span className="oh2-ok" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16">
                      <path d="M3 8.5l3.5 3.5L13 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <p className="oh2-err" id="oh2-e-si-email" role="alert">
                  Enter a valid email address.
                </p>
              </div>
              <div className={`oh2-field oh2-haspw${fields['oh2-f-si-pw']?.valid === false ? ' oh2-invalid' : ''}`} id="oh2-f-si-pw">
                <label htmlFor="oh2-in-si-pw">Password</label>
                <div className="oh2-control">
                  <input
                    id="oh2-in-si-pw"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    aria-invalid={fields['oh2-f-si-pw']?.valid === false}
                    aria-describedby="oh2-e-si-pw"
                  />
                </div>
                <p className="oh2-err" id="oh2-e-si-pw" role="alert">
                  Enter your password.
                </p>
              </div>
              <div className="oh2-forgot">
                <button type="button">Forgot password?</button>
              </div>
              <button className={`oh2-cta oh2-cta-auth${busy === 'signin' ? ' oh2-busy' : ''}`} type="submit" disabled={busy === 'signin'}>
                <span className="oh2-spin" aria-hidden="true" />
                <span className="oh2-lbl">
                  {busy === 'signin' ? 'Signing in…' : done === 'signin' ? 'Welcome back ✓' : 'Sign in'}
                </span>
              </button>
            </form>
          )}
        </div>
        <p className="oh2-fine">Built for your team. Powered by BIGDROPS.</p>
      </div>
    </section>
  )
}

const CSS = `
.oh2-root{position:absolute;inset:0;overflow:hidden;background:var(--bg);color:var(--ink);isolation:isolate;font-family:Manrope,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;-webkit-tap-highlight-color:transparent;overscroll-behavior:none;--ez:cubic-bezier(.22,1,.36,1)}
.oh2-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.oh2-root button{font-family:inherit;color:inherit;cursor:pointer;border:0;background:none}
.oh2-root button:active{transform:scale(.97)}
.oh2-root :focus-visible{outline:3px solid var(--primary);outline-offset:2px;border-radius:8px}
.oh2-skiplink{position:absolute;left:12px;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:90;transform:translateY(-260%);background:var(--cta-bg);color:var(--cta-ink);padding:12px 18px;border-radius:12px;font-weight:800;font-size:13px;transition:transform .2s}
.oh2-skiplink:focus{transform:none}
.oh2-experiment{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:80;transform:translateX(-50%);display:flex;align-items:center;gap:8px;max-width:calc(100% - 28px);padding:6px;border:1px solid var(--glass-line);border-radius:18px;background:var(--glass-bg);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);box-shadow:0 18px 44px var(--glass-shadow)}
.oh2-group{display:flex;align-items:center;gap:4px}
.oh2-experiment button{min-height:36px;min-width:36px;border-radius:12px;padding:0 11px;color:var(--glass-ink);opacity:.78;font-size:11px;font-weight:800;letter-spacing:.01em;display:inline-flex;align-items:center;gap:7px}
.oh2-experiment button[aria-pressed="true"]{background:var(--ink);color:var(--bg);opacity:1}
.oh2-experiment button .oh2-ico{width:14px;height:14px}
.oh2-dot{width:10px;height:10px;border-radius:999px;background:var(--swatch);box-shadow:0 0 0 2px rgba(128,128,128,.25),0 0 18px var(--swatch)}
.oh2-theme-name{position:absolute;right:18px;top:calc(env(safe-area-inset-top,0px) + 62px);z-index:79;color:var(--ink-3);font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.oh2-theme-name span{color:var(--ink);margin-left:6px;letter-spacing:.04em}
.oh2-themefab{position:absolute;right:calc(62px + env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 10px);z-index:86;display:grid;width:44px;height:44px;place-items:center;font-size:20px;line-height:1;border:1px solid var(--glass-line);border-radius:14px;background:var(--glass-bg);color:var(--glass-ink);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);box-shadow:0 18px 44px var(--glass-shadow)}
.oh2-experiment.oh2-pop{left:auto;right:12px;top:calc(env(safe-area-inset-top,0px) + 62px);transform:none;flex-wrap:wrap;justify-content:flex-end;max-width:min(430px,calc(100% - 24px));max-height:calc(100dvh - 150px);overflow-y:auto}
.oh2-popclose{flex:1 1 100%;justify-content:center;border-top:1px solid var(--glass-line);border-radius:0 0 12px 12px}
.oh2-compare{position:absolute;inset:0;overflow-y:auto;padding:calc(env(safe-area-inset-top,0px) + 98px) clamp(14px,3vw,28px) calc(env(safe-area-inset-bottom,0px) + 24px);background:var(--bg);color:var(--ink)}
.oh2-compare-head{max-width:960px;margin:0 auto 18px;text-align:center}
.oh2-compare-head h1{font-size:clamp(1.7rem,5vw,2.8rem);line-height:1.1;letter-spacing:-.02em}
.oh2-compare-head p{margin:8px auto 0;color:var(--ink-2);max-width:62ch;font-size:14px;line-height:1.55}
.oh2-compare-grid{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:repeat(5,minmax(180px,1fr));gap:14px}
.oh2-theme-card{position:relative;min-height:420px;border-radius:24px;overflow:hidden;border:1px solid var(--glass-line);background:var(--scene-intro);box-shadow:0 20px 54px var(--glass-shadow)}
.oh2-theme-card::before,.oh2-theme-card::after{content:"";position:absolute;border-radius:50%;filter:blur(42px);opacity:.72}
.oh2-theme-card::before{width:68%;height:38%;left:-18%;top:4%;background:var(--field-a)}
.oh2-theme-card::after{width:60%;height:34%;right:-18%;top:22%;background:var(--field-b)}
.oh2-mini-brand,.oh2-mini-copy,.oh2-mini-glass{position:relative;z-index:2}
.oh2-mini-brand{display:flex;align-items:center;gap:8px;padding:18px;color:var(--mini-ink);font-size:13px;font-weight:800}
.oh2-mini-logo,.oh2-logo,.oh2-authlogo{display:grid;place-items:center;overflow:hidden;background:#07111f;border:1px solid rgba(255,255,255,.2);box-shadow:0 12px 30px rgba(0,0,0,.32)}
.oh2-mini-logo img,.oh2-logo img,.oh2-authlogo img{width:100%;height:100%;display:block;object-fit:cover}
.oh2-mini-logo{width:28px;height:28px;border-radius:9px}
.oh2-mini-glass{margin:54px 18px 0;padding:15px 16px;border-radius:20px;background:var(--glass-bg);border:1px solid var(--glass-line);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);box-shadow:0 22px 46px var(--glass-shadow);color:var(--glass-ink)}
.oh2-mini-glass strong{display:block;font-family:'DM Mono',ui-monospace,Menlo,monospace;font-size:1.25rem;margin:8px 0;font-weight:500}
.oh2-mini-glass span{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.oh2-mini-glass p{font-size:12px;line-height:1.5;opacity:.9}
.oh2-mini-copy{position:absolute;left:18px;right:18px;bottom:18px;color:var(--mini-ink);text-shadow:var(--mini-shadow)}
.oh2-mini-copy h2{font-size:1.2rem;line-height:1.1;letter-spacing:-.01em}
.oh2-mini-copy p{margin-top:7px;color:var(--mini-sub);font-size:12px;line-height:1.45}
.oh2-app{position:relative;height:100%;display:flex;flex-direction:column}
.oh2-topbar{position:absolute;top:0;left:0;right:0;z-index:40;display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top,0px) + 10px) 20px 10px}
.oh2-brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px;letter-spacing:-.01em;color:var(--chrome-ink);text-shadow:0 1px 8px rgba(15,23,42,.35)}
.oh2-chromelight .oh2-brand{text-shadow:none}
.oh2-logo{width:30px;height:30px;border-radius:9px;flex:0 0 auto}
.oh2-skipbtn{min-width:44px;min-height:44px;padding:0 10px;border-radius:12px;color:var(--chrome-ink);opacity:.85;font-size:14px;font-weight:700}
.oh2-chromelight .oh2-skipbtn{color:var(--ink-3)}
.oh2-chromelight .oh2-skipbtn:hover{color:var(--ink)}
.oh2-skipbtn.oh2-hidden{visibility:hidden}
.oh2-rail{position:absolute;top:calc(env(safe-area-inset-top,0px) + 58px);left:20px;right:20px;z-index:40;display:flex;gap:6px;pointer-events:none}
.oh2-rail i{height:3px;flex:1;border-radius:2px;background:rgba(255,255,255,.35);overflow:hidden;position:relative}
.oh2-rail i::after{content:"";position:absolute;inset:0;background:#fff;border-radius:2px;transform:scaleX(0);transform-origin:left;transition:transform .45s var(--ez)}
.oh2-rail i.done::after,.oh2-rail i.on::after{transform:scaleX(1)}
.oh2-chromelight .oh2-rail i{background:var(--line-strong)}
.oh2-chromelight .oh2-rail i::after{background:var(--primary)}
.oh2-deck{position:relative;flex:1;min-height:0;overflow:hidden;touch-action:pan-y}
.oh2-track{display:flex;height:100%;will-change:transform}
.oh2-slide{flex:0 0 100%;min-width:0;height:100%;position:relative;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 96px) 24px calc(env(safe-area-inset-bottom,0px) + 172px)}
.oh2-scene{position:absolute;inset:0;z-index:0;overflow:hidden}
.oh2-blob{position:absolute;border-radius:50%;filter:blur(46px);opacity:.85}
.oh2-vignette{position:absolute;inset:0;background:var(--vignette)}
.oh2-sc-intro{background:var(--scene-intro)}
.oh2-sc-intro .oh2-b1{width:60%;height:40%;left:-12%;top:6%;background:var(--field-a);opacity:.5}
.oh2-sc-intro .oh2-b2{width:52%;height:36%;right:-10%;top:24%;background:var(--field-b);opacity:.4}
.oh2-sc-invoicing{background:var(--scene-invoicing)}
.oh2-sc-invoicing .oh2-b1{width:56%;height:38%;right:-8%;top:4%;background:var(--field-c);opacity:.3}
.oh2-sc-invoicing .oh2-b2{width:48%;height:32%;left:-10%;top:30%;background:var(--field-a);opacity:.42}
.oh2-sc-logi{background:var(--scene-logi)}
.oh2-sc-logi .oh2-b1{width:64%;height:34%;left:8%;top:8%;background:var(--deep-b);opacity:.4}
.oh2-sc-logi .oh2-b2{width:40%;height:26%;right:-6%;top:26%;background:var(--field-a);opacity:.32}
.oh2-sc-projects{background:var(--scene-projects)}
.oh2-sc-projects .oh2-b1{width:52%;height:36%;left:-8%;top:8%;background:var(--field-a);opacity:.38}
.oh2-sc-projects .oh2-b2{width:46%;height:30%;right:-10%;top:22%;background:var(--field-b);opacity:.3}
.oh2-grid-lines{position:absolute;inset:0;background-image:linear-gradient(rgba(128,128,128,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(128,128,128,.14) 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(180deg,transparent 4%,#000 40%,transparent 92%);-webkit-mask-image:linear-gradient(180deg,transparent 4%,#000 40%,transparent 92%)}
.oh2-horizon{position:absolute;left:0;right:0;top:58%;height:1px;background:rgba(128,128,128,.35)}
.oh2-hero{position:relative;z-index:1;flex:1 1 auto;min-height:150px;display:flex;align-items:center;justify-content:center;margin:0 -8px}
.oh2-hero svg{width:100%;max-width:430px;height:100%;max-height:42dvh;overflow:visible}
.oh2-glasscard{position:absolute;z-index:5;background:var(--glass-bg);border:1px solid var(--glass-line);border-radius:20px;-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);box-shadow:0 24px 48px var(--glass-shadow);padding:16px 18px;color:var(--glass-ink);min-width:228px;max-width:78%}
.oh2-gc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;font-weight:700;letter-spacing:.02em;opacity:.85;margin-bottom:10px}
.oh2-gc-pill{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px}
.oh2-gc-pill.oh2-ok{background:color-mix(in srgb,var(--success) 70%,#fff);color:var(--pill-ok-ink)}
.oh2-gc-pill.oh2-info{background:color-mix(in srgb,var(--info) 82%,#fff);color:var(--pill-info-ink)}
.oh2-gc-value{font-family:'DM Mono',ui-monospace,Menlo,monospace;font-size:1.65rem;font-weight:500;letter-spacing:-.01em;margin-bottom:8px}
.oh2-gc-row{display:flex;justify-content:space-between;gap:16px;padding:8px 0 0;border-top:1px solid var(--glass-row-line);font-size:12.5px;font-weight:700;opacity:.92}
.oh2-gc-row span:last-child{font-family:'DM Mono',ui-monospace,Menlo,monospace}
.oh2-gc-track{position:relative;height:6px;border-radius:3px;background:var(--track-bg);margin:14px 0 6px}
.oh2-gc-track i{position:absolute;left:0;top:0;bottom:0;width:65%;border-radius:3px;background:var(--track-fill);display:block;transform-origin:left}
.oh2-gc-track b{position:absolute;left:65%;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:var(--track-fill);box-shadow:0 0 0 3px var(--track-bg),0 2px 8px rgba(0,0,0,.4)}
.oh2-gc-sub{font-size:11px;opacity:.75;font-weight:700}
.oh2-slide.active .oh2-glasscard{animation:oh2-cardIn .7s var(--ez) var(--d,.25s) both}
.oh2-slide.active .oh2-glasscard>*{animation:oh2-rowIn .5s var(--ez) var(--d,.45s) both}
.oh2-slide.active .oh2-glasscard>*:nth-child(2){animation-delay:.56s}
.oh2-slide.active .oh2-glasscard>*:nth-child(3){animation-delay:.67s}
.oh2-slide.active .oh2-gc-track i{animation:oh2-growW .8s var(--ez) .8s both}
@keyframes oh2-growW{to{transform:scaleX(1)}}
@keyframes oh2-cardIn{from{opacity:0;transform:translateY(16px) scale(.95);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
@keyframes oh2-rowIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.oh2-text{position:relative;z-index:2;margin-top:auto;flex:0 0 auto;color:var(--chrome-ink);width:100%;max-width:680px;margin-left:auto;margin-right:auto}
.oh2-eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--eyebrow);margin-bottom:8px}
.oh2-text h1{font-size:clamp(1.8rem,7.2vw,2.4rem);line-height:1.08;letter-spacing:-.025em;font-weight:800;text-wrap:balance;margin:0}
.oh2-copy{margin:10px 0 0;font-size:.98rem;line-height:1.6;color:var(--copy);max-width:36ch;text-wrap:pretty}
.oh2-bottom{position:absolute;left:0;right:0;bottom:0;z-index:40;padding:14px 24px calc(env(safe-area-inset-bottom,0px) + 18px);display:flex;flex-direction:column;gap:14px}
.oh2-meta{display:flex;align-items:center;min-height:44px;max-width:680px;width:100%;margin:0 auto}
.oh2-backbtn{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:var(--chrome-ink);background:rgba(128,128,128,.18);border:1px solid var(--glass-line);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);visibility:hidden}
.oh2-backbtn.show{visibility:visible}
.oh2-chromelight .oh2-backbtn{color:var(--ink-3);background:var(--surface);border-color:var(--line);box-shadow:var(--shadow)}
.oh2-dots{flex:1;display:flex;justify-content:center;gap:8px}
.oh2-dots button{width:28px;height:28px;display:grid;place-items:center;border-radius:50%}
.oh2-dots button i{width:7px;height:7px;border-radius:4px;background:color-mix(in srgb,var(--chrome-ink) 40%,transparent);transition:width .35s var(--ez),background .35s;display:block}
.oh2-chromelight .oh2-dots button i{background:var(--surface-strong)}
.oh2-slide.active .oh2-dots button i,.oh2-dots button[aria-current="true"] i{width:24px}
.oh2-dots button[aria-current="true"] i{background:var(--chrome-ink)}
.oh2-chromelight .oh2-dots button[aria-current="true"] i{background:var(--primary)}
.oh2-dots button:hover i{background:var(--ink-2)}
.oh2-cta{width:100%;max-width:680px;margin:0 auto;min-height:54px;border-radius:999px;background:var(--cta-bg);color:var(--cta-ink);font-weight:800;font-size:16px;letter-spacing:-.01em;box-shadow:0 14px 34px rgba(15,23,42,.3);display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .15s ease-out,opacity .2s,filter .2s,background .2s,color .2s}
.oh2-cta-auth{background:var(--cta-auth-bg);color:var(--cta-auth-ink)}
.oh2-cta.oh2-busy{pointer-events:none;filter:saturate(.7)}
.oh2-cta .oh2-spin{width:18px;height:18px;border-radius:50%;border:2.5px solid color-mix(in srgb,currentColor 30%,transparent);border-top-color:currentColor;animation:oh2-spin .7s linear infinite;display:none}
.oh2-cta.oh2-busy .oh2-spin{display:block}
@keyframes oh2-spin{to{transform:rotate(360deg)}}
.oh2-rv{opacity:0}
.oh2-slide.active .oh2-rv{animation:oh2-riseIn .6s var(--ez) var(--d,0s) both}
@keyframes oh2-riseIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
.oh2-float{animation:none}
.oh2-slide.active .oh2-float{animation:oh2-riseIn .6s var(--ez) var(--d,0s) both,oh2-floatY 3.6s ease-in-out var(--fd,0s) infinite}
@keyframes oh2-floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.oh2-slide.active .oh2-streaks{animation:oh2-streak 2.6s linear 1.2s infinite}
@keyframes oh2-streak{0%{transform:translateX(0)}100%{transform:translateX(-120px)}}
.oh2-slide.active .oh2-sweep{animation:oh2-sweep 5.5s ease-in-out 1.4s infinite}
@keyframes oh2-sweep{0%,100%{opacity:.55}50%{opacity:.95}}
.oh2-wheelspin{transform-box:fill-box;transform-origin:center;animation:oh2-wheelSpin .9s linear infinite}
@keyframes oh2-wheelSpin{to{transform:rotate(360deg)}}
.oh2-slide.oh2-authslide{padding:0;background:var(--surface)}
.oh2-authwrap{position:relative;z-index:2;width:100%;max-width:680px;margin:0 auto;height:100%;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 84px) 24px calc(env(safe-area-inset-bottom,0px) + 150px);overflow:hidden}
.oh2-authhead{margin-bottom:18px}
.oh2-authhead h1{color:var(--ink);font-size:clamp(1.8rem,7.2vw,2.4rem);line-height:1.08;letter-spacing:-.025em;font-weight:800;text-wrap:balance;margin:0}
.oh2-authlogo{width:46px;height:46px;border-radius:14px;margin-bottom:14px}
.oh2-tabs{display:flex;background:var(--surface-muted);padding:4px;border-radius:13px;margin-bottom:16px}
.oh2-tab-btn{flex:1;min-height:40px;font-weight:800;font-size:14px;color:var(--ink-3);border-radius:10px;transition:background .2s,color .2s,box-shadow .2s}
.oh2-tab-btn[aria-selected="true"]{background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}
.oh2-sso-group{display:flex;flex-direction:column;gap:10px;margin-bottom:16px}
.oh2-sso-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:50px;background:var(--surface);border:1px solid var(--line-strong);border-radius:14px;font-weight:800;font-size:14.5px;color:var(--ink);transition:background .2s}
.oh2-sso-btn:hover{background:var(--panel)}
.oh2-divider{display:flex;align-items:center;margin-bottom:16px;color:var(--ink-3);font-size:12px;font-weight:700;letter-spacing:.04em}
.oh2-divider::before,.oh2-divider::after{content:"";flex:1;border-bottom:1px solid var(--line)}
.oh2-divider::before{margin-right:12px}.oh2-divider::after{margin-left:12px}
.oh2-forms{position:relative;flex:1;min-height:0}
.oh2-formpane{position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch}
.oh2-field{margin-bottom:13px}
.oh2-field label{display:block;font-size:12.5px;font-weight:800;color:var(--ink-2);margin-bottom:6px}
.oh2-control{position:relative}
.oh2-control input{width:100%;min-height:52px;border-radius:14px;border:1.5px solid var(--line-strong);background:var(--panel);color:var(--ink);font:inherit;font-size:15.5px;font-weight:600;padding:0 14px;transition:border-color .2s,box-shadow .2s,background .2s}
.oh2-control input::placeholder{color:var(--ink-3);font-weight:500;opacity:.75}
.oh2-control input:focus{outline:none;border-color:var(--primary);background:var(--surface);box-shadow:0 0 0 4px color-mix(in srgb,var(--primary) 12%,transparent)}
.oh2-field.oh2-invalid input{border-color:var(--danger);box-shadow:0 0 0 4px color-mix(in srgb,var(--danger) 10%,transparent)}
.oh2-field.oh2-valid input{border-color:color-mix(in srgb,var(--success) 55%,var(--line-strong))}
.oh2-err{display:none;margin-top:6px;font-size:12.5px;font-weight:600;color:var(--danger)}
.oh2-field.oh2-invalid .oh2-err{display:block}
.oh2-field .oh2-ok{position:absolute;right:14px;top:50%;transform:translateY(-50%) scale(0);color:var(--success);transition:transform .25s var(--ez)}
.oh2-field.oh2-valid .oh2-ok{transform:translateY(-50%) scale(1)}
.oh2-pwtoggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:10px;display:grid;place-items:center;color:var(--ink-3)}
.oh2-field.oh2-haspw input{padding-right:52px}
.oh2-meter{display:flex;gap:5px;margin-top:8px}
.oh2-meter i{height:4px;flex:1;border-radius:2px;background:var(--surface-strong);transition:background .3s}
.oh2-meter.oh2-s1 i:nth-child(1){background:var(--danger)}
.oh2-meter.oh2-s2 i:nth-child(-n+2){background:var(--warning)}
.oh2-meter.oh2-s3 i{background:var(--success)}
.oh2-meterlabel{font-size:11.5px;font-weight:700;color:var(--ink-3);margin-top:5px;min-height:15px}
.oh2-forgot{text-align:right;margin:-4px 0 4px}
.oh2-forgot button{color:var(--primary);font-size:13px;font-weight:800;min-height:44px;padding:0 4px}
.oh2-fine{text-align:center;color:var(--ink-3);font-size:11px;margin-top:12px}
@media (prefers-reduced-motion:reduce){
  .oh2-root *,.oh2-root *::before,.oh2-root *::after{animation:none!important;transition:none!important}
  .oh2-rv,.oh2-glasscard,.oh2-glasscard>*{opacity:1!important;transform:none!important;filter:none!important}
  .oh2-gc-track i{transform:scaleX(1)!important}
}
@media (prefers-reduced-transparency:reduce){
  .oh2-glasscard,.oh2-mini-glass,.oh2-experiment{backdrop-filter:none;-webkit-backdrop-filter:none}
  .oh2-glasscard{background:var(--surface)}
  .oh2-mini-glass{background:var(--surface)}
  .oh2-experiment{background:var(--surface)}
}
@media (max-height:640px){
  .oh2-slide{padding-top:calc(env(safe-area-inset-top,0px) + 84px);padding-bottom:calc(env(safe-area-inset-bottom,0px) + 160px)}
  .oh2-text h1{font-size:1.7rem}.oh2-copy{font-size:.92rem}
  .oh2-glasscard{padding:13px 15px;min-width:206px}
  .oh2-gc-value{font-size:1.4rem}
  .oh2-hero svg{max-height:34dvh}
}
@media (max-width:980px){
  .oh2-compare-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:620px){
  .oh2-experiment{left:10px;right:10px;transform:none;display:grid;grid-template-columns:1fr;gap:5px;max-width:none}
  .oh2-experiment.oh2-pop{left:10px;right:10px;top:calc(env(safe-area-inset-top,0px) + 62px);max-width:none)}
  .oh2-group{overflow-x:auto;scrollbar-width:none}
  .oh2-group::-webkit-scrollbar{display:none}
  .oh2-experiment button{flex:0 0 auto;min-height:34px;padding:0 10px;font-size:10px}
  .oh2-theme-name{display:none}
  .oh2-topbar{padding-top:calc(env(safe-area-inset-top,0px) + 66px)}
  .oh2-rail{top:calc(env(safe-area-inset-top,0px) + 114px)}
  .oh2-slide{padding-top:calc(env(safe-area-inset-top,0px) + 150px)}
  .oh2-authwrap{padding-top:calc(env(safe-area-inset-top,0px) + 136px)}
  .oh2-compare{padding-top:calc(env(safe-area-inset-top,0px) + 150px)}
}
`
