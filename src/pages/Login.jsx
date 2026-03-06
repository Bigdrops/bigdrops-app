import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    setError('')
    setMessage('')
    if (!email || !password) {
      setError('Please enter email and password.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setMessage('Signed in successfully.')
    }
  }

  const handleSignUp = async () => {
    setError('')
    setMessage('')
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
    if (err) {
      setError(err.message)
    } else {
      setMessage('Account created. Please check your email to confirm.')
    }
  }

  const handleForgotPassword = async () => {
    setError('')
    setMessage('')
    if (!email) {
      setError('Please enter your email to reset password.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setMessage('Password reset email sent. Please check your inbox.')
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    }
  }

  const isSignup = mode === 'signup'

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F5',
    padding: '20px',
  }

  const cardStyle = {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    padding: '28px 28px 24px',
    color: '#1a1a1a',  // ← ADDED: Explicit dark text for card contents
  }

  const titleStyle = {
    textAlign: 'center',
    marginBottom: '4px',
    color: '#CC0000',
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  }

  const taglineStyle = {
    textAlign: 'center',
    marginBottom: '20px',
    color: '#888',
    fontSize: '11px',
    letterSpacing: '0.04em',
  }

  const headingStyle = {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '4px',
    textAlign: 'center',
    color: '#111827',
  }

  const subHeadingStyle = {
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '16px',
    textAlign: 'center',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '4px',
  }

  const inputStyle = {
    width: '100%',
    padding: '9px 11px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    fontSize: '16px',  // ← CHANGED: Was '13px', now '16px' to prevent iOS zoom
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#FFFFFF',
    color: '#1a1a1a',  // ← ADDED: Explicit dark text for inputs
  }

  const primaryButtonStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: '#CC0000',
    color: 'white',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '4px',
  }

  const googleButtonStyle = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '999px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#FFFFFF',
    color: '#374151',
    fontWeight: 500,
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '8px',
  }

  const linkButtonStyle = {
    border: 'none',
    background: 'none',
    color: '#2563EB',
    fontSize: '12px',
    padding: 0,
    cursor: 'pointer',
  }

  const errorStyle = {
    marginTop: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    fontSize: '12px',
  }

  const messageStyle = {
    marginTop: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    backgroundColor: '#ECFDF3',
    color: '#166534',
    fontSize: '12px',
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>SUN & SHIELD</div>
        <div style={taglineStyle}>Powering Your World, Shielding Your Future</div>

        <div style={headingStyle}>{isSignup ? 'Create your account' : 'Sign in to your account'}</div>
        <div style={subHeadingStyle}>
          {isSignup ? 'Enter your details to get started.' : 'Use your work email to continue.'}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            style={inputStyle}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div style={{ marginBottom: isSignup ? '12px' : '8px' }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            style={inputStyle}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {isSignup && (
          <div style={{ marginBottom: '8px' }}>
            <label style={labelStyle}>Confirm Password</label>
            <input
              type="password"
              style={inputStyle}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        )}

        {!isSignup && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button type="button" style={linkButtonStyle} onClick={handleForgotPassword}>
              Forgot Password?
            </button>
          </div>
        )}

        <button
          type="button"
          style={{ ...primaryButtonStyle, opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
          onClick={isSignup ? handleSignUp : handleSignIn}
        >
          {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
        </button>

        <button
          type="button"
          style={googleButtonStyle}
          onClick={handleGoogleSignIn}
        >
          <span style={{ fontSize: '16px' }}>G</span>
          <span>Sign in with Google</span>
        </button>

        {error && <div style={errorStyle}>{error}</div>}
        {message && <div style={messageStyle}>{message}</div>}

        <div style={{ marginTop: '14px', fontSize: '12px', textAlign: 'center', color: '#6B7280' }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            style={linkButtonStyle}
            onClick={() => {
              setMode(isSignup ? 'signin' : 'signup')
              setError('')
              setMessage('')
            }}
          >
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}