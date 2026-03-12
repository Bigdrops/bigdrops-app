import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

// Refined Notice Component
function Notice({ kind = 'info', children }) {
  const styles =
    kind === 'error'
      ? 'text-red-400 bg-red-400/10 border-red-400/20'
      : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'

  return <div className={`rounded-md border px-4 py-3 text-xs font-medium mt-4 ${styles}`}>{children}</div>
}

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isSignup = mode === 'signup'

  // ... (Keep handleSignIn, handleSignUp, handleGoogleSignIn, handleForgotPassword from your original code)

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white antialiased">
      {/* LEFT SIDE: Visual Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center items-center bg-[#111] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
        {/* Replace this div with your 3D Cloud Image Asset */}
        <div className="relative z-10 w-64 h-64 bg-gradient-to-b from-zinc-700 to-zinc-900 rounded-[3rem] rotate-12 shadow-2xl blur-[1px] opacity-80" />
        <div className="mt-12 text-center z-10">
          <h2 className="text-3xl font-bold tracking-tighter italic">BIGDROPS</h2>
          <p className="text-zinc-500 mt-2 text-sm uppercase tracking-widest">Enterprise Resource Planning</p>
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-8 md:px-24 xl:px-48">
        <div className="mx-auto w-full max-w-sm space-y-8">
          
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {isSignup ? 'Create account' : 'Welcome back'}
            </h1>
            <p className="text-zinc-400 text-sm">
              {isSignup ? 'Enter your details to get started.' : 'Sign in to access your workspace.'}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-400 text-xs uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="bg-zinc-900/50 border-zinc-800 h-12 rounded-xl focus:ring-1 focus:ring-white transition-all placeholder:text-zinc-600"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-400 text-xs uppercase tracking-wider">Password</Label>
                {!isSignup && (
                  <button onClick={handleForgotPassword} className="text-[11px] text-zinc-500 hover:text-white transition-colors">
                    Forgot?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-zinc-900/50 border-zinc-800 h-12 rounded-xl focus:ring-1 focus:ring-white transition-all placeholder:text-zinc-600"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-zinc-400 text-xs uppercase tracking-wider">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="bg-zinc-900/50 border-zinc-800 h-12 rounded-xl focus:ring-1 focus:ring-white transition-all placeholder:text-zinc-600"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <div className="pt-2 space-y-4">
              <Button 
                onClick={isSignup ? handleSignUp : handleSignIn}
                disabled={loading}
                className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-transform active:scale-[0.98]"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : isSignup ? 'Sign Up' : 'Sign In'}
              </Button>

              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                className="w-full h-12 border-zinc-800 bg-transparent hover:bg-zinc-900 text-white rounded-xl"
              >
                <GoogleIcon className="mr-2 h-4 w-4" />
                Google
              </Button>
            </div>
          </div>

          {(error || message) && (
            <Notice kind={error ? 'error' : 'success'}>
              {error || message}
            </Notice>
          )}

          <div className="text-center">
            <button
              onClick={() => {
                setMode(isSignup ? 'signin' : 'signup')
                resetFeedback()
              }}
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
