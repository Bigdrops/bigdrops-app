import { useState, type SVGProps, type ReactNode, type ChangeEvent } from 'react'
import { Mail, Lock } from 'lucide-react'
import { supabase } from '../supabase'
import { isAndroidNative } from '@/lib/native/capacitor'
import { NATIVE_AUTH_REDIRECT_URL } from '@/components/app/NativeAuthRedirect'

import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { ButtonLoading } from '@/components/loading/AppLoadingStates'
import { Label } from '../components/ui/label'

type AuthMode = 'signin' | 'signup'

type LoginFormState = {
  email: string
  password: string
  confirmPassword: string
}

type NoticeKind = 'info' | 'error' | 'success'

type NoticeProps = {
  kind?: NoticeKind
  children: ReactNode
}

function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M21.805 10.023h-9.8v3.955h5.617c-.242 1.27-.967 2.346-2.06 3.07v2.55h3.33c1.95-1.796 3.073-4.444 3.073-7.598 0-.67-.06-1.314-.16-1.977Z"
        fill="currentColor"
      />
      <path
        d="M12.005 22c2.79 0 5.13-.924 6.84-2.502l-3.33-2.55c-.924.62-2.104.987-3.51.987-2.7 0-4.99-1.823-5.81-4.273H2.75v2.63A10.326 10.326 0 0 0 12.005 22Z"
        fill="currentColor"
      />
      <path
        d="M6.195 13.662a6.2 6.2 0 0 1-.325-1.96c0-.68.117-1.34.325-1.96v-2.63H2.75A10.326 10.326 0 0 0 1.68 11.7c0 1.66.397 3.232 1.07 4.59l3.445-2.628Z"
        fill="currentColor"
      />
      <path
        d="M12.005 5.467c1.52 0 2.887.523 3.962 1.55l2.968-2.968C17.13 2.37 14.79 1.4 12.005 1.4A10.326 10.326 0 0 0 2.75 7.112l3.445 2.63c.82-2.45 3.11-4.275 5.81-4.275Z"
        fill="currentColor"
      />
    </svg>
  )
}

function Notice({ kind = 'info', children }: NoticeProps) {
  const styles =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return <div className={`rounded-xl border px-3 py-2 text-sm ${styles}`}>{children}</div>
}

export default function Login() {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [form, setForm] = useState<LoginFormState>({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [signupCompleteEmail, setSignupCompleteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { email, password, confirmPassword } = form
  const isSignup = mode === 'signup'

  const resetFeedback = () => {
    setError('')
    setMessage('')
  }

  const updateField =
    (field: keyof LoginFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }))
    }

  const handleSignIn = async (): Promise<void> => {
    resetFeedback()

    if (!email || !password) {
      setError('Please enter email and password.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (err) setError(err.message)
    else setMessage('Signed in successfully.')
  }

  const handleSignUp = async (): Promise<void> => {
    resetFeedback()

    if (!email || !password || !confirmPassword) {
      setError('Please fill all fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (err) setError(err.message)
    else {
      const userId = data?.user?.id
      if (userId) {
        try {
          await supabase.from('profiles').upsert(
            { id: userId, email, has_password: true },
            { onConflict: 'id' }
          )
        } catch {
          // Best effort only; the app also self-heals this flag after sign-in/reset.
        }
      }
      setSignupCompleteEmail(email)
      setMessage('')
    }
  }

  const handleForgotPassword = async (): Promise<void> => {
    resetFeedback()

    if (!email) {
      setError('Please enter your email to reset password.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)

    if (err) setError(err.message)
    else setMessage('Password reset email sent. Please check your inbox.')
  }

  const handleGoogleSignIn = async (): Promise<void> => {
    resetFeedback()
    setLoading(true)

    const redirectTo = isAndroidNative()
      ? NATIVE_AUTH_REDIRECT_URL
      : window.location.origin

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    setLoading(false)

    if (err) setError(err.message)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f6f6f4] text-foreground">
      {/* floating background forms */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-24 h-40 w-40 rounded-[2.5rem] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.08)] md:-left-10 md:top-20 md:h-56 md:w-56" />
        <div className="absolute right-[-3.5rem] top-14 h-32 w-32 rounded-full bg-[#111111] shadow-[0_30px_60px_rgba(0,0,0,0.18)] md:right-[8%] md:top-24 md:h-44 md:w-44" />
        <div className="absolute bottom-28 left-[-2rem] h-28 w-28 rounded-full border border-black/10 bg-white/90 shadow-[0_20px_40px_rgba(0,0,0,0.06)] md:bottom-24 md:left-[10%] md:h-36 md:w-36" />
        <div className="absolute bottom-16 right-6 h-24 w-24 rounded-[1.75rem] bg-[#d9d9d4] shadow-[0_20px_40px_rgba(0,0,0,0.08)] md:bottom-20 md:right-[14%] md:h-28 md:w-28" />
        <div className="absolute left-1/2 top-1/2 hidden h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 blur-3xl md:block" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-10 lg:px-10">
        {/* left content */}
        <div className="mb-8 hidden lg:block">
          <div className="max-w-xl">
            <div className="brand-wordmark mb-4 inline-flex rounded-full border border-black/10 bg-white/70 px-4 py-1 text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground backdrop-blur">
              BigDrops ERP
            </div>

            <h1 className="max-w-lg text-5xl font-semibold leading-[1.05] tracking-tight text-foreground">
              Run operations in one controlled workspace.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Invoices, quotations, reports and workflow tools in one controlled workspace.
            </p>

            <div className="mt-10 grid max-w-md grid-cols-2 gap-4">
              <div className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.06)] backdrop-blur">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
                <div className="mt-2 text-2xl font-semibold">Business ops</div>
              </div>

              <div className="rounded-3xl bg-[#111111] p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
                <div className="text-xs uppercase tracking-[0.18em] text-white/60">Control</div>
                <div className="mt-2 text-2xl font-semibold">One ERP</div>
              </div>
            </div>
          </div>
        </div>

        {/* form */}
        <div className="w-full">
          <Card className="mx-auto w-full max-w-md rounded-[2rem] border border-black/10 bg-white/80 shadow-[0_25px_80px_rgba(0,0,0,0.10)] backdrop-blur">
            <CardContent className="p-6 sm:p-8">
              {signupCompleteEmail ? (
                <div className="space-y-5">
                  <div className="text-center lg:text-left">
                    <div className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                      Account Created
                    </div>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                      Check your email
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      We sent a confirmation link to <span className="font-semibold text-foreground">{signupCompleteEmail}</span>.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                    <div className="font-semibold">Next steps</div>
                    <div className="mt-2">1. Open the confirmation email.</div>
                    <div>2. Confirm your account.</div>
                    <div>3. Return here and sign in.</div>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4 text-sm text-muted-foreground">
                    If you already confirmed your email, you can go straight back to sign in.
                  </div>

                  <Button
                    type="button"
                    onClick={() => {
                      setMode('signin')
                      setSignupCompleteEmail('')
                      resetFeedback()
                    }}
                    className="h-12 w-full rounded-xl bg-[#111111] text-white hover:bg-black"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-6 text-center lg:text-left">
                    <div className="brand-wordmark text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
                      BigDrops ERP
                    </div>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                      {isSignup ? 'Create your account' : 'Sign in to continue'}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {isSignup
                        ? 'Set up your account and access your workspace.'
                        : 'Access your business workspace from one place.'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={updateField('email')}
                          placeholder="you@example.com"
                          className="h-12 rounded-xl border-black/10 bg-background pl-9 text-base shadow-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={updateField('password')}
                          placeholder="Password"
                          className="h-12 rounded-xl border-black/10 bg-background pl-9 text-base shadow-none"
                        />
                      </div>
                    </div>

                    {isSignup && (
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-slate-700">
                          Confirm Password
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={updateField('confirmPassword')}
                            placeholder="Confirm password"
                            className="h-12 rounded-xl border-black/10 bg-background pl-9 text-base shadow-none"
                          />
                        </div>
                      </div>
                    )}

                    {!isSignup && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={isSignup ? handleSignUp : handleSignIn}
                      disabled={loading}
                      className="h-12 w-full rounded-xl bg-[#111111] text-white hover:bg-black"
                    >
                      <ButtonLoading
                        loading={loading}
                        loadingLabel={isSignup ? 'Creating account' : 'Signing in'}
                        idleLabel={isSignup ? 'Create Account' : 'Sign In'}
                      />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="h-12 w-full rounded-xl border-black/10 bg-card text-foreground hover:bg-muted/50"
                    >
                      <GoogleIcon className="mr-2 h-4 w-4" />
                      Continue with Google
                    </Button>

                    {error && <Notice kind="error">{error}</Notice>}
                    {message && <Notice kind="success">{message}</Notice>}

                    <div className="pt-2 text-center text-sm text-muted-foreground">
                      {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                      <button
                        type="button"
                        className="font-semibold text-foreground underline underline-offset-4"
                        onClick={() => {
                          setMode(isSignup ? 'signin' : 'signup')
                          resetFeedback()
                        }}
                      >
                        {isSignup ? 'Sign In' : 'Sign Up'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* mobile support copy */}
          <div className="mx-auto mt-6 max-w-md lg:hidden">
            <div className="rounded-3xl border border-black/10 bg-white/70 px-5 py-4 text-center shadow-[0_20px_50px_rgba(0,0,0,0.06)] backdrop-blur">
              <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                One workspace
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Invoices, quotations, reports and business tools in one controlled system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
