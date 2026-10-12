import * as React from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Mail, Moon, Palette, Sun, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { PasswordField } from '@/components/arc/password-field/password-field'
import {
  PasswordStrength,
  createPasswordRules,
  type PasswordStrengthResult,
} from '@/components/arc/password-strength/password-strength'
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

type ChapterId = 'workspaces' | 'commercial' | 'finance' | 'logistics' | 'field'
type ScreenId = 'arrival' | 'chapter' | 'conversion' | 'signin' | 'signup'

interface Chapter {
  id: ChapterId
  eyebrow: string
  title: string
  copy: string
  signal: string
}

const SOURCE_REFERENCES = [
  'BOURXE_Ultimate_Onboarding.html',
  'claude-v2.html',
  'deepseek.html',
  'cta-index.tsx',
  'error1.tsx',
  'hero-index38.tsx',
  'auth1.tsx',
  'cta-demo.tsx',
] as const

const CHAPTERS: readonly Chapter[] = [
  {
    id: 'workspaces',
    eyebrow: 'Chapter 1',
    title: 'Separate teams, one operating floor.',
    copy: 'Give each business space its own rhythm, permissions and documents while the platform keeps the whole floor coordinated.',
    signal: 'Teams align without losing control.',
  },
  {
    id: 'commercial',
    eyebrow: 'Chapter 2',
    title: 'Requests move into priced work.',
    copy: 'A request becomes a quotation, pricing gets checked, and the confirmed job feeds the documents your team needs next.',
    signal: 'Request, quote, invoice and execution stay connected.',
  },
  {
    id: 'finance',
    eyebrow: 'Chapter 3',
    title: 'Finance runs as part of operations.',
    copy: 'Payments, VAT, WHT and visibility sit in the same system as the work that created them, with no invented numbers on this screen.',
    signal: 'Tax and cash flow are visible in context.',
  },
  {
    id: 'logistics',
    eyebrow: 'Chapter 4',
    title: 'Cargo moves with the paperwork.',
    copy: 'Waybills, loading and delivery progress travel through the same route, so commercial work and movement stay in step.',
    signal: 'Vehicles, cargo and waybills move together.',
  },
  {
    id: 'field',
    eyebrow: 'Chapter 5',
    title: 'Service teams close the loop.',
    copy: 'Technicians inspect equipment, report the result and bring field work back into the business record.',
    signal: 'Work ends with proof and coordination.',
  },
] as const

const signupRules = createPasswordRules({
  minLength: 8,
  labels: {
    length: () => 'At least 8 characters',
    case: 'Upper and lowercase letters',
    number: 'At least one number',
    symbol: 'One symbol for stronger protection',
  },
})

function resolveInitialFamily(value: unknown): PhotoHeroFamilyId {
  return isPhotoHeroFamilyId(value) ? value : 'slate-navy'
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  )
}

function WorkspacesLayer() {
  return (
    <g className="ob5-layer ob5-workspaces">
      <g className="ob5-space ob5-space-a">
        <path d="M98 330 222 268l118 58-126 66Z" className="ob5-roof" />
        <path d="m98 330 116 62v108L98 436Z" className="ob5-side" />
        <path d="m214 392 126-66v107l-126 67Z" className="ob5-face" />
        <path d="m130 352 54 28v54l-54-30Zm76 40 54-29v58l-54 29Z" className="ob5-window" />
        <g className="ob5-team">
          <circle cx="152" cy="317" r="11" />
          <path d="M132 343q20-22 40 0" />
          <circle cx="244" cy="305" r="10" />
          <path d="M225 329q19-19 38 0" />
        </g>
      </g>
      <g className="ob5-space ob5-space-b">
        <path d="M382 265 500 207l132 65-119 63Z" className="ob5-roof" />
        <path d="m382 265 131 70v121l-131-72Z" className="ob5-side" />
        <path d="m513 335 119-63v121l-119 63Z" className="ob5-face" />
        <path d="m423 297 56 29v58l-56-31Zm118-3 50-27v52l-50 27Z" className="ob5-window" />
        <path d="m548 311 48-25v80l-48 25Z" className="ob5-door" />
      </g>
      <g className="ob5-space ob5-space-c">
        <path d="M661 341 772 285l111 56-110 59Z" className="ob5-roof" />
        <path d="m661 341 112 59v94l-112-58Z" className="ob5-side" />
        <path d="m773 400 110-59v94l-110 59Z" className="ob5-face" />
        <path d="m694 365 40 22v44l-40-21Zm111 32 42-22v43l-42 24Z" className="ob5-window" />
      </g>
      <path d="M240 392 C335 452 523 458 688 398" className="ob5-route ob5-route-workspaces" />
    </g>
  )
}

function CommercialLayer() {
  return (
    <g className="ob5-layer ob5-commercial">
      <g className="ob5-machine">
        <path d="M201 307h303l42 119H159Z" className="ob5-machine-floor" />
        <rect x="247" y="189" width="215" height="139" rx="22" className="ob5-machine-body" />
        <path d="M280 224h148M280 252h95" className="ob5-machine-lines" />
        <g className="ob5-roller ob5-roller-a"><circle cx="253" cy="380" r="34" /><circle cx="253" cy="380" r="13" /></g>
        <g className="ob5-roller ob5-roller-b"><circle cx="466" cy="380" r="34" /><circle cx="466" cy="380" r="13" /></g>
        <path d="M217 380h284" className="ob5-belt" />
        <g className="ob5-press">
          <path d="M545 170h108v87H545Z" className="ob5-press-head" />
          <path d="M574 257h50v76h-50Z" className="ob5-press-rod" />
          <path d="M531 333h138v37H531Z" className="ob5-stamp" />
        </g>
        <g className="ob5-paper ob5-paper-a">
          <rect x="137" y="315" width="86" height="115" rx="10" />
          <path d="M157 350h45M157 371h34M157 392h54" />
        </g>
        <g className="ob5-paper ob5-paper-b">
          <rect x="370" y="294" width="92" height="120" rx="10" />
          <path d="M390 330h47M390 351h38M390 372h55" />
        </g>
        <g className="ob5-paper ob5-paper-c">
          <rect x="656" y="283" width="98" height="126" rx="12" />
          <path d="M676 319h54M676 344h40M676 369h56" />
          <path d="m674 392 13 12 29-38" className="ob5-paid" />
        </g>
      </g>
    </g>
  )
}

function FinanceLayer() {
  return (
    <g className="ob5-layer ob5-finance">
      <g className="ob5-ledger">
        <circle cx="530" cy="306" r="138" className="ob5-ledger-halo" />
        <circle cx="530" cy="306" r="88" className="ob5-ledger-core" />
        <path d="M530 168v-62M530 444v66M392 306h-77M668 306h86M431 207l-54-45M629 207l54-45M431 405l-55 47M629 405l55 47" className="ob5-fin-wire" />
        <g className="ob5-tax ob5-tax-vat">
          <rect x="280" y="119" width="124" height="70" rx="18" />
          <text x="342" y="162">VAT</text>
        </g>
        <g className="ob5-tax ob5-tax-wht">
          <rect x="650" y="119" width="124" height="70" rx="18" />
          <text x="712" y="162">WHT</text>
        </g>
        <g className="ob5-tax ob5-tax-pay">
          <rect x="706" y="432" width="146" height="70" rx="18" />
          <text x="779" y="475">Payments</text>
        </g>
        <g className="ob5-tax ob5-tax-view">
          <rect x="204" y="432" width="146" height="70" rx="18" />
          <text x="277" y="475">Visibility</text>
        </g>
        <g className="ob5-ledger-pages">
          <rect x="493" y="265" width="75" height="94" rx="9" />
          <path d="M511 293h38M511 315h31M511 337h42" />
        </g>
      </g>
    </g>
  )
}

function LogisticsLayer() {
  return (
    <g className="ob5-layer ob5-logistics">
      <g className="ob5-skyline ob5-skyline-back">
        <path d="M24 365V238h42v48h34v-82h58v106h36v-70h44v125Z" />
        <use href="#ob5-skyline-a" x="360" />
      </g>
      <defs>
        <g id="ob5-skyline-a">
          <path d="M0 365V246h62v52h32V210h68v155h42v-74h54v74Z" />
        </g>
      </defs>
      <path d="M0 438h1080" className="ob5-road-bed" />
      <path d="M34 477h1020" className="ob5-road-mark" />
      <g className="ob5-cargo-arm">
        <path d="M198 245v121h37V261h88" />
        <rect x="317" y="246" width="78" height="52" rx="8" />
        <path d="M356 298v50" />
      </g>
      <g className="ob5-truck">
        <path d="M410 333h258l57 58v70H386v-94Z" className="ob5-truck-body" />
        <path d="M662 342h44l36 45h-80Z" className="ob5-truck-cab" />
        <rect x="433" y="356" width="84" height="58" rx="9" className="ob5-cargo" />
        <rect x="531" y="356" width="84" height="58" rx="9" className="ob5-cargo ob5-cargo-two" />
        <g className="ob5-wheel ob5-wheel-a"><circle cx="458" cy="463" r="28" /><circle cx="458" cy="463" r="10" /></g>
        <g className="ob5-wheel ob5-wheel-b"><circle cx="672" cy="463" r="28" /><circle cx="672" cy="463" r="10" /></g>
        <path d="M747 403h52" className="ob5-headlamp" />
      </g>
      <g className="ob5-waybill">
        <rect x="766" y="234" width="158" height="105" rx="16" />
        <path d="M793 267h80M793 292h105M793 317h56" />
        <path d="m875 312 16 16 31-46" className="ob5-delivered" />
      </g>
    </g>
  )
}

function FieldLayer() {
  return (
    <g className="ob5-layer ob5-field">
      <g className="ob5-equipment">
        <path d="M263 375h334v118H263Z" className="ob5-generator" />
        <path d="M298 342h261v63H298Z" className="ob5-generator-top" />
        <circle cx="357" cy="436" r="31" className="ob5-fan-ring" />
        <g className="ob5-fan"><path d="M357 405v62M326 436h62M337 416l40 40M377 416l-40 40" /></g>
        <path d="M463 426h74M463 451h48" className="ob5-machine-lines" />
      </g>
      <g className="ob5-technician">
        <circle cx="657" cy="239" r="25" />
        <path d="M631 283h52l24 132h-102Z" className="ob5-tech-body" />
        <path d="M629 306 552 365M684 307l74 44" className="ob5-tech-arm" />
        <path d="M629 415 604 494M681 415l42 78" className="ob5-tech-leg" />
        <path d="m530 379 33-31" className="ob5-tool" />
      </g>
      <g className="ob5-service-report">
        <rect x="747" y="210" width="142" height="174" rx="15" />
        <path d="M774 257h78M774 285h60M774 313h90" />
        <path d="m776 349 22 22 58-74" className="ob5-check-path" />
      </g>
    </g>
  )
}

function ConversionLayer() {
  return (
    <g className="ob5-layer ob5-conversion">
      <path d="M168 282 C330 180 708 180 894 282" className="ob5-converge ob5-converge-top" />
      <path d="M168 420 C330 522 708 522 894 420" className="ob5-converge ob5-converge-bottom" />
      <g className="ob5-command">
        <path d="M371 335 532 252l166 86-164 86Z" className="ob5-command-top" />
        <path d="m371 335 163 89v111l-163-86Z" className="ob5-command-left" />
        <path d="m534 424 164-86v111l-164 86Z" className="ob5-command-right" />
        <g className="ob5-command-screens">
          <rect x="456" y="314" width="62" height="45" rx="7" />
          <rect x="538" y="303" width="62" height="45" rx="7" />
          <rect x="604" y="334" width="50" height="39" rx="7" />
        </g>
      </g>
      <g className="ob5-final-mark">
        <circle cx="532" cy="241" r="46" />
        <path d="m510 243 15 15 34-43" />
      </g>
    </g>
  )
}

function BusinessWorld({ stage }: { stage: ChapterId | 'arrival' | 'conversion' | 'auth' }) {
  return (
    <div className="ob5-world" data-ob5-world-stage={stage} aria-hidden="true">
      <svg viewBox="0 0 1080 660" role="img" aria-label="A continuous animated business world with workspaces, finance, logistics and field service">
        <defs>
          <linearGradient id="ob5-floor" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--ob5-accent-2)" stopOpacity=".44" />
            <stop offset="1" stopColor="var(--ob5-accent)" stopOpacity=".12" />
          </linearGradient>
          <linearGradient id="ob5-metal" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#d9e3e7" />
            <stop offset=".48" stopColor="var(--ob5-accent-2)" />
            <stop offset="1" stopColor="var(--ob5-deep)" />
          </linearGradient>
          <filter id="ob5-shadow">
            <feDropShadow dx="0" dy="20" stdDeviation="17" floodColor="#03101f" floodOpacity=".28" />
          </filter>
        </defs>
        <rect x="0" y="0" width="1080" height="660" rx="0" className="ob5-sky" />
        <path d="M72 543 532 314l476 238-474 238Z" className="ob5-floor" />
        <path d="M112 543h842M191 503h686M271 463h530M351 423h374" className="ob5-floor-lines" />
        <path d="M119 540 C272 466 384 445 532 445 C680 445 793 466 946 540" className="ob5-main-rail" />
        <WorkspacesLayer />
        <CommercialLayer />
        <FinanceLayer />
        <LogisticsLayer />
        <FieldLayer />
        <ConversionLayer />
        <g className="ob5-carrier">
          <path d="M0 0h92l32 25v36H0Z" />
          <rect x="15" y="-29" width="72" height="44" rx="7" />
          <path d="M29 -11h45" />
          <circle cx="28" cy="63" r="13" />
          <circle cx="93" cy="63" r="13" />
        </g>
      </svg>
    </div>
  )
}

function ThemeControls({
  family,
  appearance,
  paletteOpen,
  paletteRef,
  popoverRef,
  viewportId,
  familySwatch,
  setFamily,
  setAppearance,
  setPaletteOpen,
  setViewportId,
  onClose,
}: {
  family: PhotoHeroFamilyId
  appearance: PhotoHeroAppearance
  paletteOpen: boolean
  paletteRef: React.RefObject<HTMLButtonElement | null>
  popoverRef: React.RefObject<HTMLDivElement | null>
  viewportId: ReturnType<typeof useDesignLabViewport>['viewportId']
  familySwatch: string
  setFamily: (family: PhotoHeroFamilyId) => void
  setAppearance: (appearance: PhotoHeroAppearance) => void
  setPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>
  setViewportId: ReturnType<typeof useDesignLabViewport>['setViewportId']
  onClose: () => void
}) {
  return (
    <>
      <div className="ob5-dock">
        <button
          ref={paletteRef}
          type="button"
          className="ob5-dock-btn active:scale-95"
          aria-expanded={paletteOpen}
          aria-controls="ob5-palette"
          aria-label={paletteOpen ? 'Close customisation panel' : 'Open customisation panel'}
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <Palette className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
          <span className="ob5-dock-dot" style={{ ['--swatch' as string]: familySwatch }} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ob5-dock-btn active:scale-95"
          aria-label="Close experiment and return to Design Lab"
          onClick={onClose}
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {paletteOpen ? (
        <div ref={popoverRef} id="ob5-palette" className="ob5-pop" role="dialog" aria-label="Experiment customisation">
          <div className="ob5-pop-group" role="group" aria-label="Theme family">
            {PHOTO_HERO_FAMILY_META.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={family === item.id}
                aria-label={`Use ${item.label}`}
                onClick={() => setFamily(item.id)}
              >
                <span className="ob5-pop-dot" style={{ ['--swatch' as string]: item.swatch }} aria-hidden="true" />
                {item.short}
              </button>
            ))}
          </div>

          <div className="ob5-pop-group" role="group" aria-label="Appearance">
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

          <div className="ob5-pop-group ob5-pop-group--viewport">
            <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
          </div>

          <button
            type="button"
            className="ob5-pop-close"
            onClick={() => {
              setPaletteOpen(false)
              paletteRef.current?.focus()
            }}
          >
            Close
          </button>
        </div>
      ) : null}
    </>
  )
}

function ArrivalScreen({ onExplore, onSignIn }: { onExplore: () => void; onSignIn: () => void }) {
  return (
    <section className="ob5-screen ob5-arrival" aria-labelledby="ob5-arrival-title">
      <div className="ob5-story-copy">
        <p className="ob5-eyebrow">BOURXE operating system</p>
        <h2 id="ob5-arrival-title">Watch a business come alive.</h2>
        <p>
          Workspaces, sales, finance, delivery and service move through one connected business floor.
        </p>
        <div className="ob5-actions">
          <button type="button" className="ob5-primary" onClick={onExplore}>
            Explore BOURXE
            <ArrowRight aria-hidden="true" />
          </button>
          <button type="button" className="ob5-text-action" onClick={onSignIn}>
            Sign In
          </button>
        </div>
      </div>
      <BusinessWorld stage="arrival" />
    </section>
  )
}

function ChapterScreen({
  chapter,
  index,
  onPrevious,
  onNext,
  onSkip,
  onSelect,
}: {
  chapter: Chapter
  index: number
  onPrevious: () => void
  onNext: () => void
  onSkip: () => void
  onSelect: (index: number) => void
}) {
  return (
    <section className="ob5-screen ob5-chapter-screen" aria-labelledby="ob5-chapter-title">
      <div className="ob5-story-copy">
        <p className="ob5-eyebrow">{chapter.eyebrow}</p>
        <h2 id="ob5-chapter-title">{chapter.title}</h2>
        <p>{chapter.copy}</p>
        <p className="ob5-signal">{chapter.signal}</p>
        <div className="ob5-actions ob5-actions-spread">
          <button type="button" className="ob5-secondary" onClick={onPrevious}>
            <ArrowLeft aria-hidden="true" />
            Previous
          </button>
          <button type="button" className="ob5-primary" onClick={onNext}>
            {index === CHAPTERS.length - 1 ? 'Finish story' : 'Next chapter'}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="ob5-skip" onClick={onSkip}>
          Skip story
        </button>
      </div>

      <BusinessWorld stage={chapter.id} />

      <div className="ob5-rail" role="tablist" aria-label="Story chapters">
        {CHAPTERS.map((item, itemIndex) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={itemIndex === index}
            aria-label={`Open ${item.title}`}
            onClick={() => onSelect(itemIndex)}
          >
            <span>{String(itemIndex + 1).padStart(2, '0')}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}

function ConversionScreen({ onPrevious, onSignup, onSignIn }: { onPrevious: () => void; onSignup: () => void; onSignIn: () => void }) {
  return (
    <section className="ob5-screen ob5-conversion-screen" aria-labelledby="ob5-conversion-title">
      <div className="ob5-story-copy">
        <p className="ob5-eyebrow">Ready when you are</p>
        <h2 id="ob5-conversion-title">One system for the work that moves the business.</h2>
        <p>
          Start with your first company workspace, then bring in the teams, documents and operations around it.
        </p>
        <div className="ob5-actions ob5-actions-spread">
          <button type="button" className="ob5-secondary" onClick={onPrevious}>
            <ArrowLeft aria-hidden="true" />
            Previous
          </button>
          <button type="button" className="ob5-primary" onClick={onSignup}>
            Get Started
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="ob5-text-action ob5-auth-link" onClick={onSignIn}>
          Already have an account? Sign In
        </button>
      </div>
      <BusinessWorld stage="conversion" />
    </section>
  )
}

function AuthShell({
  mode,
  onBack,
  onSwitch,
  onGoogle,
  onForgot,
  onSubmit,
  notice,
  signupPassword,
  signupPasswordError,
  confirmError,
  onSignupPasswordChange,
  onConfirmChange,
}: {
  mode: 'signin' | 'signup'
  onBack: () => void
  onSwitch: () => void
  onGoogle: () => void
  onForgot: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  notice: string
  signupPassword: string
  signupPasswordError: string
  confirmError: string
  onSignupPasswordChange: (value: string, strength: PasswordStrengthResult) => void
  onConfirmChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const isSignup = mode === 'signup'
  return (
    <section
      id={isSignup ? 'ob5-signup' : 'ob5-signin'}
      className="ob5-auth-screen"
      aria-labelledby={isSignup ? 'ob5-signup-title' : 'ob5-signin-title'}
    >
      <div className="ob5-auth-art">
        <button type="button" className="ob5-auth-back" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back to story
        </button>
        <BusinessWorld stage="auth" />
        <div className="ob5-auth-caption">
          <p>{isSignup ? 'Create your first workspace' : 'Return to your workspace'}</p>
          <h2>{isSignup ? 'The operating floor is ready.' : 'Your work is still in motion.'}</h2>
        </div>
      </div>
      <div className="ob5-auth-panel">
        <div className="ob5-auth-card">
          <p className="ob5-eyebrow">{isSignup ? 'Create account' : 'Welcome back'}</p>
          <h2 id={isSignup ? 'ob5-signup-title' : 'ob5-signin-title'}>
            {isSignup ? 'Get started with BOURXE.' : 'Sign in to BOURXE.'}
          </h2>
          <p className="ob5-auth-sub">
            {isSignup ? 'Set up the account that will hold your business workspace.' : 'Continue with the workspace your team already uses.'}
          </p>

          <button type="button" className="ob5-google" onClick={onGoogle}>
            <GoogleMark className="ob5-google-mark" />
            Continue with Google
          </button>

          <div className="ob5-divider">or use work email</div>

          <form className="ob5-auth-form" onSubmit={onSubmit} noValidate data-auth-isolation="local-only">
            {isSignup ? (
              <>
                <label>
                  <span>Full name</span>
                  <input name="name" type="text" autoComplete="name" placeholder="Adaeze Okafor" />
                </label>
                <label>
                  <span>Company</span>
                  <input name="company" type="text" autoComplete="organization" placeholder="Northgate Services" />
                </label>
              </>
            ) : null}

            <label>
              <span>Work email</span>
              <span className="ob5-input-shell">
                <Mail aria-hidden="true" />
                <input name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" />
              </span>
            </label>

            {isSignup ? (
              <>
                <div className="ob5-arc">
                  <PasswordStrength
                    id="ob5-su-password"
                    name="password"
                    label="Password"
                    value={signupPassword}
                    rules={signupRules}
                    shortLength={8}
                    error={signupPasswordError}
                    placeholder="At least 8 characters"
                    onValueChange={onSignupPasswordChange}
                    messages={{ showPassword: 'Show password' }}
                  />
                </div>
                <div className="ob5-arc">
                  <PasswordField
                    id="ob5-su-confirm"
                    name="confirmPassword"
                    label="Confirm password"
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    aria-invalid={confirmError ? true : undefined}
                    description={confirmError || undefined}
                    onChange={onConfirmChange}
                  />
                </div>
              </>
            ) : (
              <div className="ob5-arc">
                <PasswordField
                  id="ob5-si-password"
                  name="password"
                  label="Password"
                  autoComplete="current-password"
                  placeholder="Your password"
                />
              </div>
            )}

            {!isSignup ? (
              <button type="button" className="ob5-forgot" onClick={onForgot}>
                Forgot password?
              </button>
            ) : (
              <p className="ob5-terms">
                By continuing you agree to the Terms and Privacy Policy.
              </p>
            )}

            <button type="submit" className="ob5-primary ob5-auth-submit">
              {isSignup ? 'Create Account' : 'Sign In'}
              {isSignup ? <CheckCircle2 aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </form>

          {notice ? (
            <p className="ob5-notice" role="status">
              {notice}
            </p>
          ) : null}

          <p className="ob5-auth-switch">
            {isSignup ? 'Already have an account?' : 'New to BOURXE?'}
            <button type="button" onClick={onSwitch}>
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </section>
  )
}

export default function OnboardingV5Preview() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()
  const [family, setFamily] = React.useState<PhotoHeroFamilyId>(() =>
    resolveInitialFamily(preference.themePresetId),
  )
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [screen, setScreen] = React.useState<ScreenId>('arrival')
  const [chapterIndex, setChapterIndex] = React.useState(0)
  const [notice, setNotice] = React.useState('')
  const [signupPassword, setSignupPassword] = React.useState('')
  const [signupStrength, setSignupStrength] = React.useState<PasswordStrengthResult | null>(null)
  const [signupPasswordError, setSignupPasswordError] = React.useState('')
  const [confirmValue, setConfirmValue] = React.useState('')
  const [confirmError, setConfirmError] = React.useState('')
  const { viewportId, viewport, setViewportId } = useDesignLabViewport()
  const paletteRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)
  const noticeTimer = React.useRef<number | null>(null)
  const { rootStyle } = useExperimentThemeStyle(family, appearance)

  const chapter = CHAPTERS[chapterIndex] ?? CHAPTERS[0]
  const familyMeta = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)
  const familyLabel = familyMeta?.label ?? family
  const familySwatch = familyMeta?.swatch ?? '#60a5fa'

  const visualStage: ChapterId | 'arrival' | 'conversion' | 'auth' =
    screen === 'chapter' ? chapter.id : screen === 'conversion' ? 'conversion' : screen === 'signin' || screen === 'signup' ? 'auth' : 'arrival'

  const showNotice = React.useCallback((message: string) => {
    setNotice(message)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3200)
  }, [])

  React.useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    },
    [],
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

  const beginStory = () => {
    setChapterIndex(0)
    setScreen('chapter')
    setNotice('')
  }

  const goPrevious = () => {
    setNotice('')
    if (screen === 'conversion') {
      setChapterIndex(CHAPTERS.length - 1)
      setScreen('chapter')
      return
    }
    setChapterIndex((current) => {
      if (current === 0) {
        setScreen('arrival')
        return current
      }
      return current - 1
    })
  }

  const goNext = () => {
    setNotice('')
    setChapterIndex((current) => {
      if (current >= CHAPTERS.length - 1) {
        setScreen('conversion')
        return current
      }
      return current + 1
    })
  }

  const skipStory = () => {
    setNotice('')
    setScreen('conversion')
  }

  const selectChapter = (index: number) => {
    setNotice('')
    setChapterIndex(index)
    setScreen('chapter')
  }

  const handleAuthSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (screen === 'signup') {
      const form = new FormData(event.currentTarget)
      const password = String(form.get('password') ?? '')
      const confirm = String(form.get('confirmPassword') ?? '')
      const weak = !signupStrength || signupStrength.level < 2
      setSignupPasswordError(weak ? 'Use a stronger password before creating an account.' : '')
      setConfirmError(password && confirm && password !== confirm ? 'Passwords must match.' : '')
      if (weak || !password || password !== confirm) {
        showNotice('Check the highlighted fields. No request was sent.')
        return
      }
    }
    showNotice('No request was sent. Your details stay on this screen.')
  }

  return (
    <div
      className="ob5-root"
      style={rootStyle}
      data-ob5-root="onboarding-v5-experiment"
      data-ob5-family={family}
      data-ob5-appearance={appearance}
      data-ob5-screen={screen}
      data-ob5-stage={visualStage}
      data-ob5-references={SOURCE_REFERENCES.join(',')}
    >
      <style>{PREVIEW_CSS}</style>

      <h1 className="ob5-vh">Onboarding V5 Experiment</h1>
      <p className="ob5-vh" role="status">
        {`Onboarding V5 cinematic experiment. ${familyLabel} in ${appearance} mode.`}
      </p>

      <ViewportStage viewport={viewport} className="ob5-stage">
        <main className="ob5-canvas">
          {screen === 'arrival' ? <ArrivalScreen onExplore={beginStory} onSignIn={() => setScreen('signin')} /> : null}
          {screen === 'chapter' ? (
            <ChapterScreen
              chapter={chapter}
              index={chapterIndex}
              onPrevious={goPrevious}
              onNext={goNext}
              onSkip={skipStory}
              onSelect={selectChapter}
            />
          ) : null}
          {screen === 'conversion' ? (
            <ConversionScreen
              onPrevious={goPrevious}
              onSignup={() => setScreen('signup')}
              onSignIn={() => setScreen('signin')}
            />
          ) : null}
          {screen === 'signin' || screen === 'signup' ? (
            <AuthShell
              mode={screen}
              onBack={() => setScreen('conversion')}
              onSwitch={() => {
                setNotice('')
                setScreen(screen === 'signup' ? 'signin' : 'signup')
              }}
              onGoogle={() => showNotice('Google connection is not started from this screen.')}
              onForgot={() => showNotice('Password recovery is not started from this screen.')}
              onSubmit={handleAuthSubmit}
              notice={notice}
              signupPassword={signupPassword}
              signupPasswordError={signupPasswordError}
              confirmError={confirmError}
              onSignupPasswordChange={(value, strength) => {
                setSignupPassword(value)
                setSignupStrength(strength)
                if (signupPasswordError) setSignupPasswordError('')
                if (confirmError && confirmValue === value) setConfirmError('')
              }}
              onConfirmChange={(event) => {
                setConfirmValue(event.target.value)
                if (confirmError) setConfirmError('')
              }}
            />
          ) : null}
        </main>
      </ViewportStage>

      {screen !== 'signin' && screen !== 'signup' ? (
        <ThemeControls
          family={family}
          appearance={appearance}
          paletteOpen={paletteOpen}
          paletteRef={paletteRef}
          popoverRef={popoverRef}
          viewportId={viewportId}
          familySwatch={familySwatch}
          setFamily={setFamily}
          setAppearance={setAppearance}
          setPaletteOpen={setPaletteOpen}
          setViewportId={setViewportId}
          onClose={() => navigate('/design-lab')}
        />
      ) : null}
    </div>
  )
}

const PREVIEW_CSS = `
  .ob5-root{
    --ob5-accent:hsl(var(--primary));
    --ob5-accent-2:hsl(var(--secondary,var(--primary)));
    --ob5-ink:hsl(var(--ink));
    --ob5-muted:hsl(var(--ink-2));
    --ob5-faint:hsl(var(--ink-3));
    --ob5-surface:hsl(var(--surface));
    --ob5-raised:hsl(var(--surface-raised));
    --ob5-line:hsl(var(--line));
    --ob5-deep:color-mix(in srgb,var(--ob5-accent) 22%,#071827 78%);
    position:relative;
    min-height:100dvh;
    background:var(--scene-intro);
    color:var(--chrome-ink);
    isolation:isolate;
  }
  .ob5-vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
  .ob5-stage .dlv-surface{min-height:100dvh;background:var(--scene-intro)}
  .ob5-canvas{
    position:relative;
    min-height:100dvh;
    overflow:hidden;
    background:
      radial-gradient(circle at 76% 18%,color-mix(in srgb,var(--ob5-accent) 24%,transparent),transparent 32%),
      radial-gradient(circle at 12% 86%,color-mix(in srgb,var(--ob5-accent-2) 18%,transparent),transparent 38%),
      var(--scene-intro);
    color:var(--ob5-ink);
  }
  .ob5-canvas::after{
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    opacity:.08;
    mix-blend-mode:soft-light;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .ob5-screen{
    min-height:100dvh;
    display:grid;
    grid-template-columns:minmax(280px,.76fr) minmax(0,1.24fr);
    gap:clamp(18px,4vw,68px);
    align-items:center;
    padding:calc(42px + env(safe-area-inset-top,0px)) clamp(22px,5.5vw,88px) calc(42px + env(safe-area-inset-bottom,0px));
  }
  .ob5-story-copy{
    position:relative;
    z-index:3;
    max-width:500px;
    animation:ob5-copy-in .58s cubic-bezier(.22,1,.36,1) both;
  }
  .ob5-eyebrow{
    margin:0 0 18px;
    color:var(--ob5-accent);
    font-size:11px;
    font-weight:900;
    letter-spacing:.18em;
    text-transform:uppercase;
  }
  .ob5-story-copy h2,
  .ob5-auth-card h2{
    margin:0;
    color:var(--ob5-ink);
    font-size:clamp(42px,5.2vw,76px);
    line-height:1.03;
    letter-spacing:-.055em;
    font-weight:900;
    text-wrap:balance;
  }
  .ob5-auth-card h2{font-size:clamp(32px,3.6vw,50px)}
  .ob5-story-copy p:not(.ob5-eyebrow):not(.ob5-signal){
    margin:22px 0 0;
    color:var(--ob5-muted);
    font-size:clamp(15px,1.25vw,18px);
    line-height:1.72;
  }
  .ob5-signal{
    margin:22px 0 0;
    padding:12px 14px;
    border:1px solid var(--ob5-line);
    border-radius:14px;
    background:color-mix(in srgb,var(--ob5-surface) 68%,transparent);
    color:var(--ob5-ink);
    font-size:13px;
    font-weight:800;
  }
  .ob5-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:34px}
  .ob5-actions-spread{justify-content:flex-start}
  .ob5-primary,.ob5-secondary,.ob5-text-action,.ob5-skip,.ob5-google,.ob5-auth-back,.ob5-forgot{
    min-height:48px;
    border:0;
    border-radius:16px;
    font-weight:850;
    letter-spacing:0;
    transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s cubic-bezier(.22,1,.36,1),background .18s ease;
  }
  .ob5-primary{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:10px;
    padding:0 22px;
    background:linear-gradient(135deg,var(--ob5-accent),var(--ob5-accent-2));
    color:white;
    box-shadow:0 18px 42px color-mix(in srgb,var(--ob5-accent) 32%,transparent),inset 0 1px rgba(255,255,255,.32);
  }
  .ob5-primary svg,.ob5-secondary svg,.ob5-auth-back svg{width:18px;height:18px}
  .ob5-secondary{
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:9px;
    padding:0 18px;
    border:1px solid var(--ob5-line);
    background:color-mix(in srgb,var(--ob5-surface) 72%,transparent);
    color:var(--ob5-ink);
  }
  .ob5-text-action,.ob5-skip,.ob5-forgot{
    padding:0 12px;
    background:transparent;
    color:var(--ob5-muted);
  }
  .ob5-auth-link{margin-top:18px;padding-left:0}
  .ob5-primary:hover,.ob5-secondary:hover,.ob5-google:hover,.ob5-auth-back:hover{transform:translateY(-2px)}
  .ob5-primary:active,.ob5-secondary:active,.ob5-text-action:active,.ob5-skip:active,.ob5-google:active,.ob5-auth-back:active{transform:scale(.97)}
  .ob5-root button:focus-visible,.ob5-root input:focus-visible{outline:2px solid var(--hero-accent);outline-offset:3px}

  .ob5-world{
    position:relative;
    z-index:2;
    min-width:0;
    min-height:420px;
    height:min(74vh,720px);
    filter:drop-shadow(0 30px 48px rgba(0,0,0,.18));
  }
  .ob5-world svg{width:100%;height:100%;overflow:visible}
  .ob5-sky{fill:color-mix(in srgb,var(--ob5-surface) 58%,transparent)}
  .ob5-floor{fill:url(#ob5-floor);stroke:var(--ob5-line);stroke-width:2}
  .ob5-floor-lines,.ob5-main-rail,.ob5-route{fill:none;stroke:var(--ob5-line);stroke-width:2.5;stroke-linecap:round}
  .ob5-main-rail{stroke:color-mix(in srgb,var(--ob5-accent) 48%,var(--ob5-line));stroke-width:5}
  .ob5-layer{opacity:.12;transform:translateY(18px) scale(.97);transition:opacity .48s cubic-bezier(.22,1,.36,1),transform .58s cubic-bezier(.22,1,.36,1)}
  [data-ob5-stage="arrival"] .ob5-workspaces,
  [data-ob5-stage="arrival"] .ob5-commercial,
  [data-ob5-stage="arrival"] .ob5-logistics,
  [data-ob5-stage="conversion"] .ob5-conversion,
  [data-ob5-stage="workspaces"] .ob5-workspaces,
  [data-ob5-stage="commercial"] .ob5-commercial,
  [data-ob5-stage="finance"] .ob5-finance,
  [data-ob5-stage="logistics"] .ob5-logistics,
  [data-ob5-stage="field"] .ob5-field,
  [data-ob5-stage="auth"] .ob5-conversion{
    opacity:1;
    transform:none;
  }
  [data-ob5-stage="conversion"] .ob5-workspaces,
  [data-ob5-stage="conversion"] .ob5-commercial,
  [data-ob5-stage="conversion"] .ob5-finance,
  [data-ob5-stage="conversion"] .ob5-logistics,
  [data-ob5-stage="conversion"] .ob5-field{
    opacity:.42;
    transform:scale(.95);
  }
  .ob5-roof,.ob5-command-top{fill:var(--ob5-accent)}
  .ob5-side,.ob5-command-left{fill:color-mix(in srgb,var(--ob5-accent) 44%,var(--ob5-deep))}
  .ob5-face,.ob5-command-right{fill:var(--ob5-deep)}
  .ob5-window,.ob5-door,.ob5-command-screens rect{fill:color-mix(in srgb,var(--ob5-accent-2) 72%,white 28%)}
  .ob5-space,.ob5-machine,.ob5-ledger,.ob5-equipment,.ob5-command{filter:url(#ob5-shadow)}
  .ob5-team circle,.ob5-team path{fill:var(--ob5-accent-2)}
  .ob5-route-workspaces{stroke:var(--ob5-accent);stroke-dasharray:14 18;animation:ob5-route 2.6s linear infinite}
  .ob5-space-a{transform:translateX(-20px)}
  .ob5-space-b{transform:translateY(-24px)}
  .ob5-space-c{transform:translateX(18px)}
  [data-ob5-stage="workspaces"] .ob5-space-a{animation:ob5-space-a .9s cubic-bezier(.22,1,.36,1) both}
  [data-ob5-stage="workspaces"] .ob5-space-b{animation:ob5-space-b .9s cubic-bezier(.22,1,.36,1) both}
  [data-ob5-stage="workspaces"] .ob5-space-c{animation:ob5-space-c .9s cubic-bezier(.22,1,.36,1) both}

  .ob5-machine-floor{fill:color-mix(in srgb,var(--ob5-accent) 16%,transparent);stroke:var(--ob5-line)}
  .ob5-machine-body,.ob5-press-head,.ob5-press-rod,.ob5-stamp,.ob5-truck-body,.ob5-generator,.ob5-generator-top{fill:url(#ob5-metal);stroke:color-mix(in srgb,var(--ob5-ink) 22%,transparent);stroke-width:2}
  .ob5-machine-lines,.ob5-paper path,.ob5-ledger-pages path,.ob5-waybill path,.ob5-service-report path{fill:none;stroke:var(--ob5-line);stroke-width:4;stroke-linecap:round}
  .ob5-roller circle,.ob5-wheel circle,.ob5-fan-ring{fill:var(--ob5-deep);stroke:var(--ob5-accent-2);stroke-width:5}
  .ob5-belt{stroke:var(--ob5-accent);stroke-width:9;stroke-dasharray:22 16;animation:ob5-belt 1.2s linear infinite}
  .ob5-roller,.ob5-wheel,.ob5-fan{transform-box:fill-box;transform-origin:center;animation:ob5-spin 1.8s linear infinite}
  .ob5-paper rect,.ob5-ledger-pages rect,.ob5-waybill rect,.ob5-service-report rect{fill:color-mix(in srgb,var(--ob5-surface) 92%,white 8%);stroke:var(--ob5-line);stroke-width:2}
  .ob5-paper-a{animation:ob5-paper-a 4.8s cubic-bezier(.42,0,.2,1) infinite}
  .ob5-paper-b{animation:ob5-paper-b 4.8s cubic-bezier(.42,0,.2,1) infinite}
  .ob5-paper-c{animation:ob5-paper-c 4.8s cubic-bezier(.42,0,.2,1) infinite}
  .ob5-press{animation:ob5-press 2.4s cubic-bezier(.42,0,.2,1) infinite}
  .ob5-paid,.ob5-delivered,.ob5-check-path{stroke:var(--ob5-accent);stroke-width:8;stroke-linecap:round;stroke-linejoin:round;fill:none}

  .ob5-ledger-core{fill:var(--ob5-deep);stroke:var(--ob5-accent);stroke-width:5}
  .ob5-ledger-halo{fill:color-mix(in srgb,var(--ob5-accent) 18%,transparent)}
  .ob5-fin-wire{fill:none;stroke:var(--ob5-accent);stroke-width:4;stroke-dasharray:11 16;animation:ob5-route 1.9s linear infinite}
  .ob5-tax rect{fill:var(--ob5-raised);stroke:var(--ob5-line);stroke-width:2}
  .ob5-tax text{fill:var(--ob5-ink);font-size:25px;font-weight:900;text-anchor:middle}
  .ob5-tax-vat{animation:ob5-tax-a 3.4s cubic-bezier(.22,1,.36,1) infinite}
  .ob5-tax-wht{animation:ob5-tax-b 3.4s cubic-bezier(.22,1,.36,1) infinite}
  .ob5-ledger-pages{animation:ob5-ledger-paper 3.4s cubic-bezier(.22,1,.36,1) infinite}

  .ob5-skyline path{fill:color-mix(in srgb,var(--ob5-accent) 18%,transparent)}
  .ob5-skyline-back{animation:ob5-city 18s linear infinite}
  .ob5-road-bed{stroke:var(--ob5-deep);stroke-width:82;stroke-linecap:round}
  .ob5-road-mark{stroke:color-mix(in srgb,var(--ob5-accent-2) 74%,white 26%);stroke-width:7;stroke-dasharray:58 54;animation:ob5-road 1.1s linear infinite}
  .ob5-truck{animation:ob5-drive 8s cubic-bezier(.42,0,.58,1) infinite}
  .ob5-truck-cab,.ob5-cargo{fill:color-mix(in srgb,var(--ob5-accent-2) 76%,white 24%);stroke:var(--ob5-line);stroke-width:2}
  .ob5-headlamp{stroke:#fee8a6;stroke-width:14;stroke-linecap:round;filter:drop-shadow(0 0 12px #fee8a6)}
  .ob5-cargo-arm{fill:none;stroke:var(--ob5-accent);stroke-width:12;stroke-linecap:round;stroke-linejoin:round;animation:ob5-arm 5.2s cubic-bezier(.42,0,.2,1) infinite}
  .ob5-waybill{animation:ob5-waybill 8s ease-in-out infinite}

  .ob5-technician circle{fill:var(--ob5-accent-2)}
  .ob5-tech-body{fill:var(--ob5-accent);stroke:var(--ob5-line);stroke-width:2}
  .ob5-tech-arm,.ob5-tech-leg,.ob5-tool,.ob5-fan{fill:none;stroke:var(--ob5-ink);stroke-width:12;stroke-linecap:round;stroke-linejoin:round}
  .ob5-technician{animation:ob5-tech 3.8s ease-in-out infinite alternate;transform-origin:657px 360px}
  .ob5-check-path{stroke-dasharray:160;stroke-dashoffset:160}
  [data-ob5-stage="field"] .ob5-check-path{animation:ob5-check 1.1s cubic-bezier(.22,1,.36,1) .8s forwards}

  .ob5-converge{fill:none;stroke:var(--ob5-accent);stroke-width:6;stroke-dasharray:18 20;animation:ob5-route 2s linear infinite}
  .ob5-final-mark circle{fill:var(--ob5-accent);filter:url(#ob5-shadow)}
  .ob5-final-mark path{fill:none;stroke:white;stroke-width:9;stroke-linecap:round;stroke-linejoin:round}
  .ob5-final-mark{animation:ob5-final .9s cubic-bezier(.34,1.56,.64,1) both}

  .ob5-carrier{
    fill:var(--ob5-accent);
    stroke:color-mix(in srgb,var(--ob5-ink) 18%,transparent);
    stroke-width:2;
    transform:translate(120px,515px);
    transition:transform .7s cubic-bezier(.22,1,.36,1),opacity .25s ease;
    filter:url(#ob5-shadow);
  }
  [data-ob5-stage="arrival"] .ob5-carrier{transform:translate(120px,515px)}
  [data-ob5-stage="workspaces"] .ob5-carrier{transform:translate(250px,474px)}
  [data-ob5-stage="commercial"] .ob5-carrier{transform:translate(430px,445px)}
  [data-ob5-stage="finance"] .ob5-carrier{transform:translate(554px,425px)}
  [data-ob5-stage="logistics"] .ob5-carrier{transform:translate(720px,470px)}
  [data-ob5-stage="field"] .ob5-carrier{transform:translate(858px,520px)}
  [data-ob5-stage="conversion"] .ob5-carrier,[data-ob5-stage="auth"] .ob5-carrier{opacity:0}
  .ob5-carrier circle{fill:var(--ob5-deep)}
  .ob5-carrier path:last-of-type{stroke:white;stroke-width:4}

  .ob5-rail{
    position:absolute;
    z-index:5;
    left:clamp(20px,5.5vw,88px);
    right:clamp(20px,5.5vw,88px);
    bottom:calc(24px + env(safe-area-inset-bottom,0px));
    display:flex;
    gap:8px;
    max-width:620px;
  }
  .ob5-rail button{
    flex:1;
    min-height:44px;
    border:1px solid var(--ob5-line);
    border-radius:14px;
    background:color-mix(in srgb,var(--ob5-surface) 62%,transparent);
    color:var(--ob5-muted);
    font-size:11px;
    font-weight:900;
    backdrop-filter:blur(14px);
  }
  .ob5-rail button[aria-selected="true"]{color:white;background:var(--ob5-accent)}
  .ob5-rail i{display:block;height:3px;margin:6px 8px 0;border-radius:999px;background:currentColor;opacity:.35}

  .ob5-auth-screen{
    min-height:100dvh;
    display:grid;
    grid-template-columns:minmax(0,1fr) minmax(360px,.86fr);
    overflow-y:auto;
    -webkit-overflow-scrolling:touch;
  }
  .ob5-auth-art{
    position:relative;
    min-height:100dvh;
    display:flex;
    flex-direction:column;
    justify-content:flex-end;
    overflow:hidden;
    padding:calc(28px + env(safe-area-inset-top,0px)) clamp(22px,5vw,64px) calc(42px + env(safe-area-inset-bottom,0px));
    background:linear-gradient(145deg,color-mix(in srgb,var(--ob5-accent) 10%,transparent),transparent 62%);
  }
  .ob5-auth-art .ob5-world{position:absolute;inset:8% -20% 22% 0;height:auto;opacity:.8}
  .ob5-auth-caption{position:relative;z-index:2;max-width:420px}
  .ob5-auth-caption p{margin:0 0 10px;color:var(--ob5-accent);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.13em}
  .ob5-auth-caption h2{margin:0;color:var(--ob5-ink);font-size:clamp(34px,4.4vw,58px);line-height:1.05;letter-spacing:-.055em;font-weight:900}
  .ob5-auth-back{
    position:relative;
    z-index:3;
    width:max-content;
    display:inline-flex;
    align-items:center;
    gap:8px;
    padding:0 14px;
    border:1px solid var(--ob5-line);
    background:color-mix(in srgb,var(--ob5-surface) 72%,transparent);
    color:var(--ob5-ink);
  }
  .ob5-auth-panel{
    display:flex;
    align-items:center;
    justify-content:center;
    min-height:100dvh;
    padding:calc(30px + env(safe-area-inset-top,0px)) clamp(20px,4vw,58px) calc(30px + env(safe-area-inset-bottom,0px));
  }
  .ob5-auth-card{width:100%;max-width:456px}
  .ob5-auth-sub{margin:12px 0 22px;color:var(--ob5-muted);line-height:1.58}
  .ob5-google{
    width:100%;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:10px;
    border:1px solid var(--ob5-line);
    background:var(--ob5-surface);
    color:var(--ob5-ink);
  }
  .ob5-google-mark{width:20px;height:20px}
  .ob5-divider{display:flex;align-items:center;gap:12px;margin:20px 0;color:var(--ob5-faint);font-size:12px;font-weight:800}
  .ob5-divider::before,.ob5-divider::after{content:"";height:1px;flex:1;background:var(--ob5-line)}
  .ob5-auth-form{display:grid;gap:13px}
  .ob5-auth-form label{display:grid;gap:7px;color:var(--ob5-ink);font-size:13px;font-weight:850}
  .ob5-auth-form input{
    width:100%;
    height:50px;
    border:1px solid var(--ob5-line);
    border-radius:14px;
    background:var(--ob5-surface);
    color:var(--ob5-ink);
    padding:0 14px;
    font-size:15px;
    outline:0;
  }
  .ob5-auth-form input::placeholder{color:var(--ob5-faint)}
  .ob5-auth-form input:focus{border-color:var(--ob5-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--ob5-accent) 18%,transparent)}
  .ob5-input-shell{position:relative;display:block}
  .ob5-input-shell svg{position:absolute;left:13px;top:50%;width:17px;height:17px;transform:translateY(-50%);color:var(--ob5-faint)}
  .ob5-input-shell input{padding-left:40px}
  .ob5-auth-submit{width:100%;margin-top:4px}
  .ob5-forgot{justify-self:end;min-height:34px;color:var(--ob5-accent)}
  .ob5-terms{margin:0;color:var(--ob5-faint);font-size:12px;line-height:1.48}
  .ob5-notice{
    margin:14px 0 0;
    padding:11px 13px;
    border:1px solid color-mix(in srgb,var(--ob5-accent) 30%,var(--ob5-line));
    border-radius:13px;
    background:color-mix(in srgb,var(--ob5-accent) 10%,var(--ob5-surface));
    color:var(--ob5-ink);
    font-size:13px;
    font-weight:750;
  }
  .ob5-auth-switch{margin:18px 0 0;text-align:center;color:var(--ob5-muted);font-size:13px}
  .ob5-auth-switch button{margin-left:6px;border:0;background:transparent;color:var(--ob5-accent);font-weight:900}
  .ob5-arc{
    --foreground:var(--ob5-ink);
    --surface:var(--ob5-surface);
    --surface-muted:color-mix(in srgb,var(--ob5-accent) 8%,var(--ob5-surface));
    --text-muted:var(--ob5-faint);
    --border:var(--ob5-line);
    --border-strong:var(--ob5-line);
    --danger:#e46f79;
    --warning:#d99a31;
    --success:#2fb77f;
    --space-1:4px;
    --space-2:7px;
    --space-3:11px;
    --space-4:14px;
    --text-xs:12px;
    --text-sm:13px;
    --text-base:16px;
    --leading-body:1.42;
    --tracking-body:0;
    --control-height-md:50px;
    --radius-control:14px;
    --radius-pill:999px;
    --duration-instant:.12s;
    --duration-fast:.16s;
    --duration-exit:.18s;
    --duration-standard:.24s;
    --duration-spring:.3s;
    --ease-enter:cubic-bezier(.16,1,.3,1);
    --ease-exit:cubic-bezier(.7,0,.84,0);
    --ease-standard:cubic-bezier(.22,1,.36,1);
    --ease-spring:cubic-bezier(.22,1,.36,1);
  }
  .ob5-arc label{font-size:13px;font-weight:850;color:var(--ob5-ink)}

  .ob5-dock{
    position:fixed;
    z-index:70;
    left:12px;
    bottom:calc(22px + env(safe-area-inset-bottom,0px));
    display:flex;
    align-items:center;
    gap:8px;
  }
  .ob5-dock-btn{
    position:relative;
    display:grid;
    width:44px;
    height:44px;
    place-items:center;
    border:1px solid var(--glass-line);
    border-radius:14px;
    background:var(--glass-bg);
    color:var(--glass-ink);
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .ob5-dock-dot{
    position:absolute;
    right:6px;
    bottom:6px;
    width:10px;
    height:10px;
    border-radius:999px;
    background:var(--swatch);
    box-shadow:0 0 0 2px var(--glass-bg);
  }
  .ob5-pop{
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
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .ob5-pop-group{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
  .ob5-pop button{
    display:inline-flex;
    align-items:center;
    gap:7px;
    min-height:36px;
    padding:0 11px;
    border-radius:12px;
    color:var(--glass-ink);
    font-size:11px;
    font-weight:800;
    opacity:.78;
    transition:background .16s ease,color .16s ease,opacity .16s ease;
  }
  .ob5-pop button[aria-pressed="true"]{background:var(--chrome-ink);color:var(--primary-ink);opacity:1}
  .ob5-pop-dot{width:10px;height:10px;border-radius:999px;background:var(--swatch);box-shadow:0 0 0 2px rgba(128,128,128,.25)}
  .ob5-pop-close{justify-content:center;width:100%;border-top:1px solid var(--glass-line);border-radius:0 0 12px 12px}

  @keyframes ob5-copy-in{from{opacity:0;transform:translateY(18px);filter:blur(7px)}to{opacity:1;transform:none;filter:none}}
  @keyframes ob5-route{to{stroke-dashoffset:-72}}
  @keyframes ob5-belt{to{stroke-dashoffset:-76}}
  @keyframes ob5-spin{to{transform:rotate(360deg)}}
  @keyframes ob5-space-a{from{transform:translate(-60px,20px);opacity:.4}to{transform:translateX(-20px);opacity:1}}
  @keyframes ob5-space-b{from{transform:translateY(-70px);opacity:.4}to{transform:translateY(-24px);opacity:1}}
  @keyframes ob5-space-c{from{transform:translate(70px,24px);opacity:.4}to{transform:translateX(18px);opacity:1}}
  @keyframes ob5-paper-a{0%{opacity:0;transform:translate(-70px,26px) rotate(-7deg)}18%,68%{opacity:1}100%{opacity:0;transform:translate(214px,-34px) rotate(9deg)}}
  @keyframes ob5-paper-b{0%,24%{opacity:0;transform:translate(-48px,18px)}44%,82%{opacity:1}100%{opacity:0;transform:translate(162px,-31px)}}
  @keyframes ob5-paper-c{0%,48%{opacity:0;transform:translate(-55px,16px)}68%,92%{opacity:1}100%{opacity:0;transform:translate(50px,-12px)}}
  @keyframes ob5-press{0%,35%,70%,100%{transform:translateY(0)}48%,58%{transform:translateY(34px)}}
  @keyframes ob5-tax-a{50%{transform:translate(-8px,-8px)}}
  @keyframes ob5-tax-b{50%{transform:translate(8px,-8px)}}
  @keyframes ob5-ledger-paper{50%{transform:translateY(-10px)}}
  @keyframes ob5-city{to{transform:translateX(-360px)}}
  @keyframes ob5-road{to{stroke-dashoffset:-112}}
  @keyframes ob5-drive{0%{transform:translateX(-360px)}18%,33%{transform:translateX(-70px)}55%,70%{transform:translateX(70px)}100%{transform:translateX(430px)}}
  @keyframes ob5-arm{0%,28%,100%{transform:translateY(0)}40%,58%{transform:translateY(48px)}}
  @keyframes ob5-waybill{0%,20%{opacity:.55;transform:translateY(12px)}45%,82%{opacity:1;transform:none}100%{opacity:.55;transform:translateY(-8px)}}
  @keyframes ob5-tech{to{transform:rotate(2deg)}}
  @keyframes ob5-check{to{stroke-dashoffset:0}}
  @keyframes ob5-final{from{opacity:0;transform:scale(.5);transform-origin:532px 241px}to{opacity:1;transform:scale(1);transform-origin:532px 241px}}

  @media (max-width:900px){
    .ob5-screen{
      grid-template-columns:1fr;
      align-content:start;
      gap:16px;
      padding:calc(28px + env(safe-area-inset-top,0px)) 18px calc(96px + env(safe-area-inset-bottom,0px));
      overflow-y:auto;
    }
    .ob5-story-copy{max-width:none;order:2}
    .ob5-world{order:1;min-height:260px;height:min(46vh,420px)}
    .ob5-story-copy h2{font-size:clamp(34px,10vw,52px)}
    .ob5-story-copy p:not(.ob5-eyebrow):not(.ob5-signal){font-size:15px;line-height:1.58}
    .ob5-actions{margin-top:24px}
    .ob5-primary,.ob5-secondary{flex:1 1 150px}
    .ob5-rail{left:18px;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px))}
    .ob5-auth-screen{grid-template-columns:1fr;overflow-y:auto}
    .ob5-auth-art{min-height:290px;padding:calc(18px + env(safe-area-inset-top,0px)) 18px 22px}
    .ob5-auth-art .ob5-world{inset:8% -32% 6% -10%;opacity:.42}
    .ob5-auth-panel{min-height:auto;padding:20px 18px calc(26px + env(safe-area-inset-bottom,0px));align-items:start}
  }
  @container dlv (max-width: 900px){
    [data-dlv-sim] .ob5-screen{
      grid-template-columns:1fr;
      align-content:start;
      gap:16px;
      padding:calc(28px + env(safe-area-inset-top,0px)) 18px calc(96px + env(safe-area-inset-bottom,0px));
      overflow-y:auto;
    }
    [data-dlv-sim] .ob5-story-copy{max-width:none;order:2}
    [data-dlv-sim] .ob5-world{order:1;min-height:260px;height:min(46vh,420px)}
    [data-dlv-sim] .ob5-story-copy h2{font-size:clamp(34px,10vw,52px)}
    [data-dlv-sim] .ob5-story-copy p:not(.ob5-eyebrow):not(.ob5-signal){font-size:15px;line-height:1.58}
    [data-dlv-sim] .ob5-actions{margin-top:24px}
    [data-dlv-sim] .ob5-primary,[data-dlv-sim] .ob5-secondary{flex:1 1 150px}
    [data-dlv-sim] .ob5-rail{left:18px;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px))}
    [data-dlv-sim] .ob5-auth-screen{grid-template-columns:1fr;overflow-y:auto}
    [data-dlv-sim] .ob5-auth-art{min-height:290px;padding:calc(18px + env(safe-area-inset-top,0px)) 18px 22px}
    [data-dlv-sim] .ob5-auth-art .ob5-world{inset:8% -32% 6% -10%;opacity:.42}
    [data-dlv-sim] .ob5-auth-panel{min-height:auto;padding:20px 18px calc(26px + env(safe-area-inset-bottom,0px));align-items:start}
  }
  @media (max-width:520px){
    .ob5-canvas{overflow-y:auto}
    .ob5-world{min-height:220px;height:35vh}
    .ob5-actions{display:grid;grid-template-columns:1fr}
    .ob5-primary,.ob5-secondary,.ob5-google{width:100%}
    .ob5-rail{position:relative;left:auto;right:auto;bottom:auto;margin-top:18px}
    .ob5-dock{bottom:calc(12px + env(safe-area-inset-bottom,0px))}
    .ob5-pop{bottom:calc(68px + env(safe-area-inset-bottom,0px))}
  }
  @container dlv (max-width: 520px){
    [data-dlv-sim] .ob5-canvas{overflow-y:auto}
    [data-dlv-sim] .ob5-world{min-height:220px;height:35vh}
    [data-dlv-sim] .ob5-actions{display:grid;grid-template-columns:1fr}
    [data-dlv-sim] .ob5-primary,[data-dlv-sim] .ob5-secondary,[data-dlv-sim] .ob5-google{width:100%}
    [data-dlv-sim] .ob5-rail{position:relative;left:auto;right:auto;bottom:auto;margin-top:18px}
    [data-dlv-sim] .ob5-dock{bottom:calc(12px + env(safe-area-inset-bottom,0px))}
    [data-dlv-sim] .ob5-pop{bottom:calc(68px + env(safe-area-inset-bottom,0px))}
  }
  @media (max-height:660px) and (min-width:901px){
    .ob5-screen{padding-top:calc(24px + env(safe-area-inset-top,0px));padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}
    .ob5-world{height:min(78vh,560px)}
    .ob5-story-copy h2{font-size:clamp(36px,4vw,56px)}
    .ob5-story-copy p:not(.ob5-eyebrow):not(.ob5-signal){line-height:1.5}
    .ob5-actions{margin-top:22px}
  }
  @media (prefers-reduced-transparency:reduce){
    .ob5-dock-btn,.ob5-pop{backdrop-filter:none;background:var(--scene-intro)}
  }
  @media (prefers-reduced-motion:reduce){
    .ob5-story-copy,.ob5-layer,.ob5-carrier,.ob5-route-workspaces,.ob5-belt,.ob5-roller,.ob5-wheel,.ob5-fan,.ob5-paper-a,.ob5-paper-b,.ob5-paper-c,.ob5-press,.ob5-fin-wire,.ob5-tax-vat,.ob5-tax-wht,.ob5-ledger-pages,.ob5-skyline-back,.ob5-road-mark,.ob5-truck,.ob5-cargo-arm,.ob5-waybill,.ob5-technician,.ob5-check-path,.ob5-converge,.ob5-final-mark,.ob5-primary,.ob5-secondary,.ob5-google,.ob5-auth-back,.ob5-pop button{
      animation:none!important;
      transition:none!important;
    }
    .ob5-layer{opacity:1;transform:none}
    .ob5-check-path{stroke-dashoffset:0}
    .ob5-carrier{opacity:1}
  }
`
