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
import { BusinessWorld } from './onboarding-v5-scenes'
import './onboarding-v5-scenes.css'

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
    title: 'One platform. Separate businesses.',
    copy: 'Activa Electrical, Northline Fleet and Marketline Supply each keep their own workspace, team and records.',
    signal: 'Switch business context without mixing the work.',
  },
  {
    id: 'commercial',
    eyebrow: 'Chapter 2',
    title: 'A request becomes a decision.',
    copy: 'Follow a client brief into a quotation, review the price, then prepare the document that moves work forward.',
    signal: 'Request, quotation and approval have a clear handoff.',
  },
  {
    id: 'finance',
    eyebrow: 'Chapter 3',
    title: 'Know what is paid, owed and due.',
    copy: 'Review the transaction, separate its VAT and WHT records, then bring the documents into an obligation review.',
    signal: 'A clear path from transaction to tax record.',
  },
  {
    id: 'logistics',
    eyebrow: 'Chapter 4',
    title: 'Dispatch has a paper trail.',
    copy: 'A vehicle leaves the yard with a waybill and reaches a documented delivery handoff.',
    signal: 'The route and its document stay in view.',
  },
  {
    id: 'field',
    eyebrow: 'Chapter 5',
    title: 'Field work returns as a record.',
    copy: 'A technician inspects equipment, completes the service and returns a report to the business.',
    signal: 'Inspection, maintenance and completion belong together.',
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
        <h2 id="ob5-arrival-title">Every business has its own work.</h2>
        <p>
          BOURXE gives separate businesses room for their teams, documents and operations.
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
        <h2 id="ob5-conversion-title">Work has a place.</h2>
        <p>
          Start with a workspace. Keep each business and its people in a clear operating context.
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
    --ob5-deep:color-mix(in srgb,var(--ob5-accent) 18%,var(--ob5-surface) 82%);
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
    padding:calc(72px + env(safe-area-inset-top,0px)) clamp(22px,5.5vw,88px) calc(72px + env(safe-area-inset-bottom,0px));
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
    padding:0 0 0 13px;
    border-left:3px solid var(--ob5-accent);
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
  .ob5-rail{
    position:absolute;
    z-index:5;
    left:clamp(20px,5.5vw,88px);
    right:clamp(20px,5.5vw,88px);
    bottom:calc(24px + env(safe-area-inset-bottom,0px));
    display:flex;
    gap:8px;
    max-width:440px;
  }
  .ob5-rail button{
    flex:1;
    min-height:44px;
    border:0;
    border-bottom:2px solid var(--ob5-line);
    border-radius:0;
    background:transparent;
    color:var(--ob5-muted);
    font-size:12px;
    font-weight:900;
  }
  .ob5-rail button[aria-selected="true"]{color:var(--ob5-accent);border-bottom-color:var(--ob5-accent)}
  .ob5-rail i{display:none}

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
    right:12px;
    top:calc(10px + env(safe-area-inset-top,0px));
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
    right:12px;
    top:calc(64px + env(safe-area-inset-top,0px));
    display:flex;
    flex-direction:column;
    gap:8px;
    width:min(340px,calc(100vw - 24px));
    max-height:calc(100dvh - 84px - env(safe-area-inset-top,0px));
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
  @media (max-width:900px){
    .ob5-screen{
      grid-template-columns:1fr;
      align-content:start;
      gap:16px;
      padding:calc(76px + env(safe-area-inset-top,0px)) 18px calc(28px + env(safe-area-inset-bottom,0px));
      overflow-y:auto;
    }
    .ob5-story-copy{max-width:none;order:2}
    .ob5-world{order:1;min-height:260px;height:min(46vh,420px)}
    .ob5-story-copy h2{font-size:clamp(34px,10vw,52px)}
    .ob5-story-copy p:not(.ob5-eyebrow):not(.ob5-signal){font-size:15px;line-height:1.58}
    .ob5-actions{margin-top:24px}
    .ob5-primary,.ob5-secondary{flex:1 1 150px}
    .ob5-rail{position:relative;left:auto;right:auto;bottom:auto;max-width:none;order:3;margin-top:10px}
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
      padding:calc(76px + env(safe-area-inset-top,0px)) 18px calc(28px + env(safe-area-inset-bottom,0px));
      overflow-y:auto;
    }
    [data-dlv-sim] .ob5-story-copy{max-width:none;order:2}
    [data-dlv-sim] .ob5-world{order:1;min-height:260px;height:min(46vh,420px)}
    [data-dlv-sim] .ob5-story-copy h2{font-size:clamp(34px,10vw,52px)}
    [data-dlv-sim] .ob5-story-copy p:not(.ob5-eyebrow):not(.ob5-signal){font-size:15px;line-height:1.58}
    [data-dlv-sim] .ob5-actions{margin-top:24px}
    [data-dlv-sim] .ob5-primary,[data-dlv-sim] .ob5-secondary{flex:1 1 150px}
    [data-dlv-sim] .ob5-rail{position:relative;left:auto;right:auto;bottom:auto;max-width:none;order:3;margin-top:10px}
    [data-dlv-sim] .ob5-auth-screen{grid-template-columns:1fr;overflow-y:auto}
    [data-dlv-sim] .ob5-auth-art{min-height:290px;padding:calc(18px + env(safe-area-inset-top,0px)) 18px 22px}
    [data-dlv-sim] .ob5-auth-art .ob5-world{inset:8% -32% 6% -10%;opacity:.42}
    [data-dlv-sim] .ob5-auth-panel{min-height:auto;padding:20px 18px calc(26px + env(safe-area-inset-bottom,0px));align-items:start}
  }
  @media (max-width:520px){
    .ob5-canvas{overflow-y:auto}
    .ob5-world{min-height:290px;height:38vh}
    .ob5-world[data-ob5-world-stage="workspaces"],.ob5-world[data-ob5-world-stage="arrival"]{min-height:345px}
    .ob5-world[data-ob5-world-stage="finance"]{min-height:435px}
    .ob5-actions{display:grid;grid-template-columns:1fr}
    .ob5-primary,.ob5-secondary,.ob5-google{width:100%}
    .ob5-story-copy h2{font-size:clamp(31px,9vw,43px)}
    .ob5-eyebrow{margin-bottom:10px}
  }
  @container dlv (max-width: 520px){
    [data-dlv-sim] .ob5-canvas{overflow-y:auto}
    [data-dlv-sim] .ob5-world{min-height:290px;height:38vh}
    [data-dlv-sim] .ob5-world[data-ob5-world-stage="workspaces"],[data-dlv-sim] .ob5-world[data-ob5-world-stage="arrival"]{min-height:345px}
    [data-dlv-sim] .ob5-world[data-ob5-world-stage="finance"]{min-height:435px}
    [data-dlv-sim] .ob5-actions{display:grid;grid-template-columns:1fr}
    [data-dlv-sim] .ob5-primary,[data-dlv-sim] .ob5-secondary,[data-dlv-sim] .ob5-google{width:100%}
    [data-dlv-sim] .ob5-story-copy h2{font-size:clamp(31px,9vw,43px)}
    [data-dlv-sim] .ob5-eyebrow{margin-bottom:10px}
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
    .ob5-story-copy,.ob5-primary,.ob5-secondary,.ob5-google,.ob5-auth-back,.ob5-pop button{
      animation:none!important;
      transition:none!important;
    }
  }
`
