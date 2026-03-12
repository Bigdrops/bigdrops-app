import { useState } from 'react'
import { Loader2, Mail, Lock } from 'lucide-react'
import { supabase } from '../supabase'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

function Notice({ kind = 'info', children }) {
  const styles =
    kind === 'error'
      ? 'border-destructive/20 bg-destructive/10 text-destructive'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</div>
}

function GoogleIcon(props) {
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

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const resetFeedback = () => {
    setError('')
    setMessage('')
  }

  const handleSignIn = async () => {
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

  const handleSignUp = async () => {
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
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (err) setError(err.message)
    else setMessage('Account created. Please check your email to confirm.')
  }

  const handleForgotPassword = async () => {
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

  const handleGoogleSignIn = async () => {
    resetFeedback()
    setLoading(true)

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

    setLoading(false)

    if (err) setError(err.message)
  }

  const isSignup = mode === 'signup'

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="space-y-1">
            <div className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              BigDrops ERP
            </div>
            <CardTitle className="text-2xl">
              {isSignup ? 'Create your account' : 'Sign in to continue'}
            </CardTitle>
            <CardDescription>
              {isSignup
                ? 'Set up your account to access your workspace.'
                : 'Access your business workspace from one place.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 pl-9"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 pl-9"
              />
            </div>
          </div>

          {isSignup && (
            <div className="space-y-2 text-left">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pl-9"
                />
              </div>
            </div>
          )}

          {!isSignup && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-primary hover:opacity-80"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <Button
            type="button"
            onClick={isSignup ? handleSignUp : handleSignIn}
            disabled={loading}
            className="h-11 w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="h-11 w-full"
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            Continue with Google
          </Button>

          {error && <Notice kind="error">{error}</Notice>}
          {message && <Notice kind="success">{message}</Notice>}

          <div className="text-center text-sm text-muted-foreground">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              className="font-semibold text-primary hover:opacity-80"
              onClick={() => {
                setMode(isSignup ? 'signin' : 'signup')
                resetFeedback()
              }}
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}