import * as React from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Users,
  WalletCards,
} from 'lucide-react'

type ThemeId = 'slate-navy' | 'amber-terracotta' | 'ocean-teal' | 'rose-gold' | 'forest-green'
type PreviewMode = 'interactive' | 'compare'
type Surface = 'onboarding' | 'auth'
type AuthMode = 'signin' | 'signup'

type ThemeSpec = {
  id: ThemeId
  name: string
  short: string
  source: string
  vars: React.CSSProperties & Record<`--${string}`, string>
}

const THEMES: ThemeSpec[] = [
  {
    id: 'slate-navy',
    name: 'Slate Navy',
    short: 'Navy',
    source: 'LIQUID_ONYX_CORE',
    vars: {
      '--bg': '#0f172a',
      '--surface': '#1e293b',
      '--surface-soft': 'rgba(30,41,59,.62)',
      '--ink': '#f1f5f9',
      '--ink-muted': '#cbd5e1',
      '--ink-soft': '#94a3b8',
      '--primary': '#60a5fa',
      '--primary-strong': '#3b82f6',
      '--accent': '#93c5fd',
      '--accent-2': '#fbbf24',
      '--danger': '#f87171',
      '--glass-line': 'rgba(148,163,184,.22)',
      '--glass-fill': 'rgba(15,23,42,.52)',
      '--scene': 'linear-gradient(145deg,#07111f 0%,#16283f 42%,#1e3a5f 72%,#7d97b4 120%)',
      '--scene-2': 'linear-gradient(160deg,#101d30 0%,#1e3a5f 58%,#4a6890 112%)',
      '--glow-a': 'rgba(96,165,250,.44)',
      '--glow-b': 'rgba(147,197,253,.28)',
    },
  },
  {
    id: 'amber-terracotta',
    name: 'Amber Terracotta',
    short: 'Amber',
    source: 'AMBER_DARK',
    vars: {
      '--bg': '#1a1714',
      '--surface': '#242019',
      '--surface-soft': 'rgba(36,32,25,.66)',
      '--ink': '#f5f0e8',
      '--ink-muted': '#c4b8a8',
      '--ink-soft': '#7d7264',
      '--primary': '#f59e0b',
      '--primary-strong': '#d97706',
      '--accent': '#fbbf24',
      '--accent-2': '#fb923c',
      '--danger': '#f87171',
      '--glass-line': 'rgba(251,191,36,.24)',
      '--glass-fill': 'rgba(36,32,25,.56)',
      '--scene': 'linear-gradient(145deg,#100c08 0%,#2b1b0d 42%,#7c3f11 78%,#f59e0b 122%)',
      '--scene-2': 'linear-gradient(160deg,#120f0c 0%,#422710 54%,#a16207 116%)',
      '--glow-a': 'rgba(245,158,11,.42)',
      '--glow-b': 'rgba(251,146,60,.28)',
    },
  },
  {
    id: 'ocean-teal',
    name: 'Ocean Teal',
    short: 'Teal',
    source: 'TEAL_DARK',
    vars: {
      '--bg': '#0f1a1a',
      '--surface': '#162424',
      '--surface-soft': 'rgba(16,42,42,.64)',
      '--ink': '#e8f5f5',
      '--ink-muted': '#a8d0d0',
      '--ink-soft': '#5a8888',
      '--primary': '#2dd4bf',
      '--primary-strong': '#0d9488',
      '--accent': '#5eead4',
      '--accent-2': '#22d3ee',
      '--danger': '#fb7185',
      '--glass-line': 'rgba(94,234,212,.24)',
      '--glass-fill': 'rgba(16,42,42,.55)',
      '--scene': 'linear-gradient(145deg,#061313 0%,#0b2b2a 44%,#0f766e 78%,#67e8f9 122%)',
      '--scene-2': 'linear-gradient(160deg,#061413 0%,#0f3a38 54%,#0891b2 116%)',
      '--glow-a': 'rgba(45,212,191,.42)',
      '--glow-b': 'rgba(34,211,238,.28)',
    },
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    short: 'Rose',
    source: 'ROSE_DARK',
    vars: {
      '--bg': '#1a0f12',
      '--surface': '#24141c',
      '--surface-soft': 'rgba(36,20,28,.66)',
      '--ink': '#f5e8ee',
      '--ink-muted': '#d0a8b8',
      '--ink-soft': '#8a5a6a',
      '--primary': '#f472b6',
      '--primary-strong': '#be185d',
      '--accent': '#f9a8d4',
      '--accent-2': '#fb7185',
      '--danger': '#f87171',
      '--glass-line': 'rgba(249,168,212,.24)',
      '--glass-fill': 'rgba(36,20,28,.57)',
      '--scene': 'linear-gradient(145deg,#12080c 0%,#31121f 43%,#9f1239 78%,#f9a8d4 124%)',
      '--scene-2': 'linear-gradient(160deg,#13090d 0%,#4a182b 54%,#be185d 116%)',
      '--glow-a': 'rgba(244,114,182,.42)',
      '--glow-b': 'rgba(251,113,133,.27)',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    short: 'Forest',
    source: 'FOREST_DARK',
    vars: {
      '--bg': '#0a1a0c',
      '--surface': '#142218',
      '--surface-soft': 'rgba(20,34,24,.66)',
      '--ink': '#e8f5ec',
      '--ink-muted': '#a8d0b0',
      '--ink-soft': '#5a8860',
      '--primary': '#4ade80',
      '--primary-strong': '#16a34a',
      '--accent': '#86efac',
      '--accent-2': '#22c55e',
      '--danger': '#f87171',
      '--glass-line': 'rgba(134,239,172,.23)',
      '--glass-fill': 'rgba(20,34,24,.57)',
      '--scene': 'linear-gradient(145deg,#051006 0%,#0d2514 44%,#166534 78%,#86efac 122%)',
      '--scene-2': 'linear-gradient(160deg,#061207 0%,#12301a 54%,#15803d 116%)',
      '--glow-a': 'rgba(74,222,128,.42)',
      '--glow-b': 'rgba(34,197,94,.27)',
    },
  },
]

const SLIDES = [
  {
    eyebrow: 'Unified business operations',
    title: 'Your business. One connected workspace.',
    copy: 'Manage quotations, invoices, cost and pricing sheets, service reports, waybills, and everyday operations in one place.',
  },
  {
    eyebrow: 'Workspaces and Team Hub',
    title: 'Multiple businesses. Teams in sync.',
    copy: 'Organize business workspaces, manage team members, and control access based on responsibilities.',
  },
  {
    eyebrow: 'Tax and compliance',
    title: 'Stay ahead of your obligations.',
    copy: 'Keep tax-related records and compliance activities organized alongside your daily operations.',
  },
  {
    eyebrow: 'Financial visibility',
    title: 'Know where your business stands.',
    copy: 'Bring payments, expenses, financial records, and reporting into a clearer operational picture.',
  },
] as const

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M21.805 10.023h-9.8v3.955h5.617c-.242 1.27-.967 2.346-2.06 3.07v2.55h3.33c1.95-1.796 3.073-4.444 3.073-7.598 0-.67-.06-1.314-.16-1.977Z" fill="currentColor" />
      <path d="M12.005 22c2.79 0 5.13-.924 6.84-2.502l-3.33-2.55c-.924.62-2.104.987-3.51.987-2.7 0-4.99-1.823-5.81-4.273H2.75v2.63A10.326 10.326 0 0 0 12.005 22Z" fill="currentColor" />
      <path d="M6.195 13.662a6.2 6.2 0 0 1-.325-1.96c0-.68.117-1.34.325-1.96v-2.63H2.75A10.326 10.326 0 0 0 1.68 11.7c0 1.66.397 3.232 1.07 4.59l3.445-2.628Z" fill="currentColor" />
      <path d="M12.005 5.467c1.52 0 2.887.523 3.962 1.55l2.968-2.968C17.13 2.37 14.79 1.4 12.005 1.4A10.326 10.326 0 0 0 2.75 7.112l3.445 2.63c.82-2.45 3.11-4.275 5.81-4.275Z" fill="currentColor" />
    </svg>
  )
}

function BrandMark({ logoSrc, size = 'normal' }: { logoSrc: string; size?: 'normal' | 'large' }) {
  return (
    <span className={`phv3-logo phv3-logo-${size}`}>
      <img src={logoSrc} alt="" />
    </span>
  )
}

function OperationsArt() {
  const docs = ['RFQ', 'Quotation', 'CPS', 'Invoice', 'Waybill', 'CSR']
  return (
    <div className="phv3-art phv3-art-ops" aria-hidden="true">
      <svg viewBox="0 0 560 360" role="presentation">
        <path className="phv3-flow-line" d="M86 186 C154 108 236 115 285 174 S412 262 488 168" />
        <path className="phv3-flow-line muted" d="M136 250 C196 214 244 226 289 266 S402 304 470 250" />
        {docs.map((doc, index) => {
          const x = 48 + index * 88
          const y = index % 2 === 0 ? 94 : 196
          return (
            <g className="phv3-doc" style={{ '--d': `${index * 90}ms` } as React.CSSProperties} key={doc}>
              <rect x={x} y={y} width="76" height="92" rx="16" />
              <path d={`M${x + 18} ${y + 28}h38M${x + 18} ${y + 45}h30M${x + 18} ${y + 62}h42`} />
              <text x={x + 38} y={y + 116} textAnchor="middle">{doc}</text>
            </g>
          )
        })}
        <circle className="phv3-pulse" cx="86" cy="186" r="7" />
      </svg>
    </div>
  )
}

function TeamsArt() {
  return (
    <div className="phv3-art phv3-art-teams" aria-hidden="true">
      <div className="phv3-workspace left">
        <Building2 size={18} />
        <b>Workspace</b>
        <span>Operations company</span>
      </div>
      <div className="phv3-workspace right">
        <Building2 size={18} />
        <b>Workspace</b>
        <span>Service company</span>
      </div>
      <div className="phv3-team-console">
        <div className="phv3-avatar-row">
          <span>AO</span><span>FM</span><span>CS</span>
        </div>
        <div className="phv3-permission-row"><ShieldCheck size={14} />Documents · view / create</div>
        <div className="phv3-permission-row"><ShieldCheck size={14} />Operations · custom access</div>
        <div className="phv3-permission-row"><ShieldCheck size={14} />Company · owner controlled</div>
      </div>
    </div>
  )
}

function ComplianceArt() {
  return (
    <div className="phv3-art phv3-art-compliance" aria-hidden="true">
      {[
        ['VAT inputs', 'Recorded'],
        ['WHT receipts', 'Review'],
        ['Tax filings', 'Draft'],
        ['Obligations', 'Due'],
      ].map(([label, status], index) => (
        <div className="phv3-compliance-card" style={{ '--d': `${index * 110}ms` } as React.CSSProperties} key={label}>
          <Calculator size={17} />
          <b>{label}</b>
          <span>{status}</span>
        </div>
      ))}
      <div className="phv3-compliance-core">
        <ShieldCheck size={28} />
        <span>Compliance Hub</span>
      </div>
    </div>
  )
}

function FinanceArt() {
  return (
    <div className="phv3-art phv3-art-finance" aria-hidden="true">
      <div className="phv3-finance-chart">
        <i style={{ height: '34%' }} />
        <i style={{ height: '58%' }} />
        <i style={{ height: '46%' }} />
        <i style={{ height: '76%' }} />
        <i style={{ height: '62%' }} />
      </div>
      <div className="phv3-finance-stack">
        <span><WalletCards size={15} />Payments</span>
        <span><FileText size={15} />Expenses</span>
        <span><BarChart3 size={15} />Reports</span>
      </div>
    </div>
  )
}

const ART = [OperationsArt, TeamsArt, ComplianceArt, FinanceArt] as const

function CompareView({ logoSrc }: { logoSrc: string }) {
  return (
    <section className="phv3-compare" aria-labelledby="phv3-compare-title">
      <div className="phv3-compare-head">
        <h2 id="phv3-compare-title">BOURXE PhotoHero V3 theme comparison</h2>
        <p>Five real BIGDROPS theme families remain locked to a dark cinematic foundation for this preview.</p>
      </div>
      <div className="phv3-compare-grid">
        {THEMES.map((theme) => (
          <article className="phv3-compare-card" style={theme.vars} key={theme.id}>
            <div className="phv3-bg" />
            <div className="phv3-compare-brand">
              <BrandMark logoSrc={logoSrc} />
              <span>{theme.name}</span>
            </div>
            <div className="phv3-compare-glass">
              <small>{theme.source}</small>
              <strong>BOURXE</strong>
              <p>Gradient energy, blurred light, and glass borders follow this theme mapping.</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function AuthPanel({
  authMode,
  logoSrc,
  onModeChange,
  onBack,
}: {
  authMode: AuthMode
  logoSrc: string
  onModeChange: (mode: AuthMode) => void
  onBack: () => void
}) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const isSignup = authMode === 'signup'
  const passwordsMatch = !isSignup || confirmPassword.length === 0 || password === confirmPassword

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSignup && password !== confirmPassword) {
      setNotice('Passwords must match before this prototype can continue.')
      return
    }
    setNotice(isSignup ? 'Prototype only. No account was created.' : 'Prototype only. Credentials were not sent.')
  }

  return (
    <section className="phv3-auth" aria-labelledby="phv3-auth-title">
      <button type="button" className="phv3-auth-back" onClick={onBack}>
        <ArrowLeft size={17} />
        Onboarding
      </button>
      <div className="phv3-auth-card">
        <div className="phv3-auth-brand">
          <BrandMark logoSrc={logoSrc} size="large" />
          <span>BOURXE</span>
        </div>
        <h2 id="phv3-auth-title">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
        <p>{isSignup ? 'Set up your access to a business workspace.' : 'Sign in to continue to your workspace.'}</p>

        <form className="phv3-auth-form" onSubmit={submit}>
          {isSignup ? (
            <label>
              <span>Full name</span>
              <div><User size={16} /><input autoComplete="name" name="name" required type="text" /></div>
            </label>
          ) : null}
          <label>
            <span>Email address</span>
            <div><Mail size={16} /><input autoComplete="email" name="email" required type="email" /></div>
          </label>
          <label>
            <span>Password</span>
            <div>
              <Lock size={16} />
              <input
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                name="password"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {isSignup ? (
            <label>
              <span>Confirm password</span>
              <div data-invalid={!passwordsMatch || undefined}>
                <Lock size={16} />
                <input
                  autoComplete="new-password"
                  name="confirmPassword"
                  required
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  aria-invalid={!passwordsMatch}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}
                  onClick={() => setShowConfirm((value) => !value)}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <em aria-live="polite">{confirmPassword ? (passwordsMatch ? 'Passwords match.' : 'Passwords do not match.') : 'Repeat the password.'}</em>
            </label>
          ) : (
            <button type="button" className="phv3-forgot" onClick={() => setNotice('Prototype only. Password reset was not sent.')}>
              Forgot password?
            </button>
          )}
          <button type="submit" className="phv3-primary">
            {isSignup ? 'Create Account' : 'Sign In'}
          </button>
          <button type="button" className="phv3-google" onClick={() => setNotice('Prototype only. Google sign-in was not started.')}>
            <GoogleIcon className="h-4 w-4" />
            Continue with Google
          </button>
          {notice ? <p className="phv3-notice" role="status">{notice}</p> : null}
        </form>

        <p className="phv3-auth-switch">
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => onModeChange(isSignup ? 'signin' : 'signup')}>
            {isSignup ? 'Sign In' : 'Create Account'}
          </button>
        </p>
      </div>
    </section>
  )
}

export function BourxePhotoHeroV3Preview({ logoSrc }: { logoSrc: string }) {
  const [themeId, setThemeId] = React.useState<ThemeId>('slate-navy')
  const [mode, setMode] = React.useState<PreviewMode>('interactive')
  const [surface, setSurface] = React.useState<Surface>('onboarding')
  const [slideIndex, setSlideIndex] = React.useState(0)
  const [authMode, setAuthMode] = React.useState<AuthMode>('signin')

  const theme = THEMES.find((item) => item.id === themeId) ?? THEMES[0]
  const ActiveArt = ART[slideIndex]
  const slide = SLIDES[slideIndex]

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (surface !== 'onboarding' || target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'ArrowRight') setSlideIndex((index) => Math.min(index + 1, SLIDES.length - 1))
      if (event.key === 'ArrowLeft') setSlideIndex((index) => Math.max(index - 1, 0))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [surface])

  const goNext = () => {
    if (slideIndex === SLIDES.length - 1) {
      setSurface('auth')
      setAuthMode('signin')
    } else {
      setSlideIndex((index) => index + 1)
    }
  }

  return (
    <main className="phv3" style={theme.vars} aria-label="BOURXE PhotoHero V3 preview">
      <style>{PHOTOHERO_V3_CSS}</style>
      <div className="phv3-bg" aria-hidden="true" />
      <div className="phv3-controls" aria-label="PhotoHero V3 preview controls">
        <div className="phv3-segment" role="group" aria-label="Preview mode">
          <button type="button" aria-pressed={mode === 'interactive'} onClick={() => setMode('interactive')}>Interactive</button>
          <button type="button" aria-pressed={mode === 'compare'} onClick={() => setMode('compare')}>Compare</button>
        </div>
        <div className="phv3-theme-list" role="group" aria-label="Theme">
          {THEMES.map((item) => (
            <button
              type="button"
              aria-pressed={themeId === item.id}
              onClick={() => setThemeId(item.id)}
              key={item.id}
            >
              {item.short}
            </button>
          ))}
        </div>
      </div>

      {mode === 'compare' ? (
        <CompareView logoSrc={logoSrc} />
      ) : (
        <>
          <header className="phv3-top">
            <div className="phv3-brand">
              <BrandMark logoSrc={logoSrc} />
              <span>BOURXE</span>
            </div>
            {surface === 'onboarding' ? (
              <button type="button" className="phv3-skip" onClick={() => { setSurface('auth'); setAuthMode('signin') }}>
                Skip
              </button>
            ) : null}
          </header>

          {surface === 'onboarding' ? (
            <section className="phv3-slide" aria-labelledby="phv3-slide-title">
              <div className="phv3-hero">
                <ActiveArt />
              </div>
              <div className="phv3-copy">
                <p>{slide.eyebrow}</p>
                <h1 id="phv3-slide-title">{slide.title}</h1>
                <span>{slide.copy}</span>
              </div>
              <footer className="phv3-footer">
                <button
                  type="button"
                  className="phv3-round"
                  aria-label="Previous onboarding screen"
                  disabled={slideIndex === 0}
                  onClick={() => setSlideIndex((index) => Math.max(index - 1, 0))}
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="phv3-dots" role="tablist" aria-label="Onboarding screens">
                  {SLIDES.map((item, index) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={slideIndex === index}
                      aria-label={`Show ${item.eyebrow}`}
                      onClick={() => setSlideIndex(index)}
                      key={item.title}
                    />
                  ))}
                </div>
                <button type="button" className="phv3-next" onClick={goNext}>
                  {slideIndex === SLIDES.length - 1 ? 'Continue' : 'Next'}
                  <ArrowRight size={18} />
                </button>
              </footer>
            </section>
          ) : (
            <AuthPanel
              authMode={authMode}
              logoSrc={logoSrc}
              onModeChange={setAuthMode}
              onBack={() => setSurface('onboarding')}
            />
          )}

          <p className="phv3-live" aria-live="polite">
            {surface === 'auth' ? `${authMode === 'signin' ? 'Sign in' : 'Create account'} preview.` : `Screen ${slideIndex + 1} of ${SLIDES.length}: ${slide.title}`}
          </p>
        </>
      )}
    </main>
  )
}

const PHOTOHERO_V3_CSS = `
.phv3{position:absolute;inset:0;overflow:hidden;background:var(--bg);color:var(--ink);font-family:Manrope,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;isolation:isolate}
.phv3,.phv3 *{box-sizing:border-box}
.phv3 button{font:inherit;color:inherit}
.phv3 :focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.phv3-bg{position:absolute;inset:0;z-index:-2;background:var(--scene)}
.phv3-bg:before,.phv3-bg:after{content:"";position:absolute;border-radius:999px;filter:blur(44px);opacity:.82}
.phv3-bg:before{width:48vw;height:34vh;left:-8vw;top:4vh;background:var(--glow-a)}
.phv3-bg:after{width:42vw;height:34vh;right:-10vw;top:20vh;background:var(--glow-b)}
.phv3:after{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 50% 34%,transparent 0 22%,rgba(0,0,0,.25) 58%,rgba(0,0,0,.72) 100%),linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.58));pointer-events:none}
.phv3-controls{position:absolute;z-index:5;left:calc(14px + env(safe-area-inset-left,0px));top:calc(12px + env(safe-area-inset-top,0px));display:flex;max-width:min(720px,calc(100vw - 86px));gap:8px;align-items:center;overflow:auto;padding:5px;border:1px solid var(--glass-line);border-radius:18px;background:rgba(4,8,15,.42);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);box-shadow:0 18px 44px rgba(0,0,0,.28)}
.phv3-segment,.phv3-theme-list{display:flex;gap:3px;align-items:center;flex:0 0 auto}
.phv3-controls button{min-height:34px;border:0;border-radius:12px;background:transparent;padding:0 10px;font-size:11px;font-weight:800;color:rgba(255,255,255,.76);white-space:nowrap}
.phv3-controls button[aria-pressed=true]{background:var(--ink);color:var(--bg)}
.phv3-top{position:absolute;z-index:4;left:0;right:0;top:0;display:flex;align-items:center;justify-content:space-between;padding:calc(68px + env(safe-area-inset-top,0px)) 22px 0}
.phv3-brand{display:flex;align-items:center;gap:10px;color:#fff;font-weight:900;letter-spacing:.08em;text-shadow:0 12px 28px rgba(0,0,0,.5)}
.phv3-logo{display:inline-grid;place-items:center;width:32px;height:32px;border-radius:10px;overflow:hidden;background:#07111f;border:1px solid rgba(255,255,255,.22);box-shadow:0 16px 34px rgba(0,0,0,.34)}
.phv3-logo-large{width:54px;height:54px;border-radius:17px}
.phv3-logo img{width:100%;height:100%;object-fit:cover;display:block}
.phv3-skip,.phv3-auth-back{min-height:42px;border:1px solid var(--glass-line);border-radius:14px;background:var(--glass-fill);padding:0 14px;color:rgba(255,255,255,.86);font-weight:800;-webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%)}
.phv3-slide{height:100%;display:grid;grid-template-rows:minmax(0,1fr) auto auto;padding:calc(114px + env(safe-area-inset-top,0px)) 22px calc(18px + env(safe-area-inset-bottom,0px));gap:16px}
.phv3-hero{min-height:0;display:grid;place-items:center}
.phv3-art{width:min(720px,96vw);height:min(48vh,430px);position:relative}
.phv3-art svg{width:100%;height:100%;overflow:visible}
.phv3-flow-line{fill:none;stroke:var(--accent);stroke-width:2;stroke-dasharray:9 12;opacity:.62;filter:drop-shadow(0 0 10px var(--primary))}
.phv3-flow-line.muted{stroke:var(--primary);opacity:.35}
.phv3-doc rect,.phv3-doc path{fill:var(--glass-fill);stroke:var(--glass-line);stroke-width:1.4}
.phv3-doc path{fill:none;stroke:rgba(255,255,255,.58)}
.phv3-doc text{fill:var(--ink);font-size:13px;font-weight:900}
.phv3-pulse{fill:var(--accent);filter:drop-shadow(0 0 18px var(--accent))}
.phv3-workspace,.phv3-team-console,.phv3-compliance-card,.phv3-compliance-core,.phv3-finance-stack,.phv3-finance-chart{border:1px solid var(--glass-line);background:var(--glass-fill);-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%);box-shadow:0 22px 56px rgba(0,0,0,.28)}
.phv3-workspace{position:absolute;top:18%;width:210px;border-radius:24px;padding:16px;display:grid;gap:5px}
.phv3-workspace.left{left:4%}.phv3-workspace.right{right:4%}
.phv3-workspace b,.phv3-compliance-card b{font-size:15px}.phv3-workspace span,.phv3-compliance-card span{color:var(--ink-muted);font-size:12px;font-weight:800}
.phv3-team-console{position:absolute;left:50%;top:43%;transform:translateX(-50%);width:min(360px,88vw);border-radius:28px;padding:18px;display:grid;gap:10px}
.phv3-avatar-row{display:flex}.phv3-avatar-row span{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;margin-right:-8px;background:var(--primary);color:var(--bg);border:2px solid rgba(255,255,255,.5);font-size:12px;font-weight:900}
.phv3-permission-row{display:flex;align-items:center;gap:8px;border-radius:13px;background:rgba(255,255,255,.08);padding:10px 12px;color:var(--ink-muted);font-size:12px;font-weight:800}
.phv3-compliance-card{position:absolute;border-radius:22px;padding:14px 16px;display:grid;gap:6px;min-width:150px}
.phv3-compliance-card:nth-child(1){left:5%;top:8%}.phv3-compliance-card:nth-child(2){right:7%;top:12%}.phv3-compliance-card:nth-child(3){left:12%;bottom:14%}.phv3-compliance-card:nth-child(4){right:11%;bottom:8%}
.phv3-compliance-core{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:168px;height:168px;border-radius:50%;display:grid;place-items:center;text-align:center;color:var(--ink);font-weight:900}
.phv3-finance-chart{position:absolute;left:8%;top:12%;right:8%;height:58%;border-radius:30px;padding:30px;display:flex;align-items:end;justify-content:center;gap:18px}
.phv3-finance-chart i{width:12%;border-radius:999px 999px 0 0;background:linear-gradient(180deg,var(--accent),var(--primary-strong));box-shadow:0 0 22px var(--glow-a)}
.phv3-finance-stack{position:absolute;left:50%;bottom:5%;transform:translateX(-50%);display:flex;gap:10px;border-radius:22px;padding:12px}
.phv3-finance-stack span{display:flex;align-items:center;gap:7px;border-radius:14px;background:rgba(255,255,255,.08);padding:10px 12px;font-size:12px;font-weight:900}
.phv3-copy{position:relative;z-index:2;max-width:760px;margin:0 auto;text-align:center;text-shadow:0 16px 40px rgba(0,0,0,.66)}
.phv3-copy p{margin:0 0 8px;color:var(--accent);font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
.phv3-copy h1{margin:0;font-size:clamp(2rem,7vw,4.7rem);line-height:.98;letter-spacing:-.045em}
.phv3-copy span{display:block;max-width:58ch;margin:14px auto 0;color:var(--ink-muted);font-size:clamp(.95rem,2vw,1.1rem);line-height:1.6}
.phv3-footer{display:flex;align-items:center;justify-content:center;gap:14px;min-height:58px}
.phv3-round,.phv3-next{border:1px solid var(--glass-line);background:var(--glass-fill);color:#fff;-webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%);box-shadow:0 16px 34px rgba(0,0,0,.24)}
.phv3-round{width:46px;height:46px;border-radius:50%;display:grid;place-items:center}.phv3-round:disabled{opacity:.35}
.phv3-next{min-height:50px;border-radius:999px;padding:0 22px;display:inline-flex;align-items:center;gap:8px;font-weight:900}
.phv3-dots{display:flex;gap:8px}.phv3-dots button{width:34px;height:34px;border:0;background:transparent;position:relative}.phv3-dots button:after{content:"";position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:999px;background:rgba(255,255,255,.38);transform:translate(-50%,-50%)}.phv3-dots button[aria-selected=true]:after{width:24px;background:var(--accent)}
.phv3-auth{height:100%;display:grid;place-items:center;padding:calc(88px + env(safe-area-inset-top,0px)) 18px calc(20px + env(safe-area-inset-bottom,0px));overflow:auto}
.phv3-auth-back{position:absolute;left:22px;top:calc(74px + env(safe-area-inset-top,0px));display:inline-flex;align-items:center;gap:8px}
.phv3-auth-card{width:min(440px,100%);border:1px solid var(--glass-line);border-radius:30px;background:var(--glass-fill);padding:24px;box-shadow:0 28px 70px rgba(0,0,0,.36);-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%)}
.phv3-auth-brand{display:flex;align-items:center;gap:12px;font-size:18px;font-weight:900;letter-spacing:.08em}.phv3-auth-card h2{margin:22px 0 6px;font-size:clamp(1.8rem,6vw,2.5rem);letter-spacing:-.035em}.phv3-auth-card p{margin:0;color:var(--ink-muted);line-height:1.55}
.phv3-auth-form{display:grid;gap:13px;margin-top:22px}.phv3-auth-form label{display:grid;gap:7px;color:var(--ink-muted);font-size:12px;font-weight:900}.phv3-auth-form label>div{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;min-height:48px;border:1px solid var(--glass-line);border-radius:15px;background:rgba(255,255,255,.08);padding:0 12px}.phv3-auth-form input{min-width:0;border:0;outline:0;background:transparent;color:var(--ink);font:inherit}.phv3-auth-form label>div[data-invalid=true]{border-color:var(--danger)}.phv3-auth-form em{font-style:normal;color:var(--ink-soft)}
.phv3-auth-form label button{width:34px;height:34px;border:0;border-radius:10px;background:transparent;color:var(--ink-muted)}.phv3-forgot{justify-self:end;border:0;background:transparent;color:var(--accent);font-weight:900}.phv3-primary,.phv3-google{min-height:50px;border-radius:999px;font-weight:900}.phv3-primary{border:0;background:var(--ink);color:var(--bg)}.phv3-google{border:1px solid var(--glass-line);background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;gap:9px}.phv3-notice{border-radius:15px;background:rgba(255,255,255,.09);padding:12px 14px;color:var(--ink)}.phv3-auth-switch{margin-top:18px;text-align:center}.phv3-auth-switch button{border:0;background:transparent;color:var(--accent);font-weight:900}
.phv3-compare{height:100%;overflow:auto;padding:calc(90px + env(safe-area-inset-top,0px)) 18px calc(24px + env(safe-area-inset-bottom,0px))}
.phv3-compare-head{text-align:center;max-width:760px;margin:0 auto 22px}.phv3-compare-head h2{font-size:clamp(1.7rem,5vw,3.4rem);line-height:1;letter-spacing:-.04em}.phv3-compare-head p{color:var(--ink-muted);margin:10px auto 0}
.phv3-compare-grid{display:grid;grid-template-columns:repeat(5,minmax(160px,1fr));gap:14px;max-width:1180px;margin:0 auto}.phv3-compare-card{position:relative;min-height:380px;overflow:hidden;border:1px solid var(--glass-line);border-radius:26px;background:var(--bg);box-shadow:0 22px 58px rgba(0,0,0,.34);padding:16px}.phv3-compare-card .phv3-bg{position:absolute}.phv3-compare-brand,.phv3-compare-glass{position:relative;z-index:2}.phv3-compare-brand{display:flex;align-items:center;gap:9px;font-weight:900}.phv3-compare-glass{margin-top:88px;border:1px solid var(--glass-line);border-radius:22px;background:var(--glass-fill);padding:16px;-webkit-backdrop-filter:blur(18px) saturate(150%);backdrop-filter:blur(18px) saturate(150%)}.phv3-compare-glass small{color:var(--accent);font-weight:900}.phv3-compare-glass strong{display:block;margin:10px 0;font-size:1.6rem}.phv3-compare-glass p{color:var(--ink-muted);font-size:12px;line-height:1.5}
.phv3-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:760px){.phv3-controls{right:76px;max-width:calc(100vw - 100px)}.phv3-theme-list button{padding:0 8px}.phv3-slide{padding-left:16px;padding-right:16px;gap:10px}.phv3-art{height:42vh}.phv3-copy{text-align:left}.phv3-copy h1{font-size:clamp(2.35rem,11vw,3.3rem)}.phv3-copy span{margin-left:0}.phv3-workspace{width:168px}.phv3-workspace.left{left:-18px}.phv3-workspace.right{right:-18px}.phv3-team-console{top:46%;width:92vw}.phv3-compliance-card{min-width:132px}.phv3-finance-stack{width:94vw;justify-content:center;flex-wrap:wrap}.phv3-footer{justify-content:space-between}.phv3-dots{gap:2px}.phv3-compare-grid{grid-template-columns:1fr}.phv3-auth{place-items:start center;padding-top:calc(126px + env(safe-area-inset-top,0px))}.phv3-auth-back{top:calc(74px + env(safe-area-inset-top,0px));left:18px}}
@media (min-width:761px) and (max-width:1060px){.phv3-compare-grid{grid-template-columns:repeat(2,minmax(220px,1fr))}}
@media (max-height:700px){.phv3-slide{padding-top:calc(94px + env(safe-area-inset-top,0px))}.phv3-art{height:34vh}.phv3-copy h1{font-size:clamp(1.8rem,8vw,3.3rem)}.phv3-copy span{font-size:.92rem}.phv3-footer{min-height:50px}.phv3-auth-card{padding:18px}.phv3-auth-form{gap:9px}.phv3-auth-form label>div{min-height:44px}}
@media (prefers-reduced-motion:no-preference){.phv3-flow-line{animation:phv3-dash 4.8s linear infinite}.phv3-pulse{animation:phv3-pulse 2.2s ease-in-out infinite}.phv3-doc,.phv3-compliance-card{animation:phv3-rise .55s cubic-bezier(.23,1,.32,1) both;animation-delay:var(--d,0ms)}.phv3-finance-chart i{animation:phv3-bars 3.6s ease-in-out infinite}.phv3-workspace,.phv3-team-console,.phv3-compliance-core,.phv3-finance-stack{animation:phv3-float 4.4s ease-in-out infinite}@keyframes phv3-dash{to{stroke-dashoffset:-84}}@keyframes phv3-pulse{50%{r:11;opacity:.55}}@keyframes phv3-rise{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}@keyframes phv3-bars{50%{transform:scaleY(.82)}}@keyframes phv3-float{50%{transform:translateY(-6px)}}.phv3-team-console,.phv3-compliance-core,.phv3-finance-stack{animation-name:phv3-float-centered}@keyframes phv3-float-centered{50%{translate:0 -6px}}}
@media (prefers-reduced-motion:reduce){.phv3 *{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}.phv3-flow-line{stroke-dasharray:none}.phv3-pulse{r:9}}
`
