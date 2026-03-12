import { useState } from 'react'
import { Loader2, Mail, Lock, Chrome } from 'lucide-react'
import { supabase } from '../supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function Notice({ kind = 'info', children }) {
  const styles = kind === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md border-slate-200 shadow-xl shadow-slate-200/40">
        <CardHeader className="space-y-3 text-center">
          <div>
            <div className="text-xl font-black uppercase tracking-[0.2em] text-red-700">SUN &amp; SHIELD</div>
            <div className="mt-1 text-xs tracking-wide text-slate-500">
              Powering Your World, Shielding Your Future
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl text-slate-900">
              {isSignup ? 'Create your account' : 'Sign in to your account'}
            </CardTitle>
            <CardDescription>
              {isSignup ? 'Enter your details to get started.' : 'Use your work email to continue.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 text-left">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 pl-9 text-base"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 pl-9 text-base"
              />
            </div>
          </div>

          {isSignup && (
            <div className="space-y-2 text-left">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pl-9 text-base"
                />
              </div>
            </div>
          )}

          {!isSignup && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <Button
            type="button"
            onClick={isSignup ? handleSignUp : handleSignIn}
            disabled={loading}
            className="h-11 w-full rounded-full bg-red-700 hover:bg-red-800"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="h-11 w-full rounded-full"
          >
            <Chrome className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>

          {error && <Notice kind="error">{error}</Notice>}
          {message && <Notice kind="success">{message}</Notice>}

          <div className="text-center text-sm text-slate-600">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              className="font-semibold text-blue-600 transition-colors hover:text-blue-700"
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
