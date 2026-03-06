import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let timeout
    if (message) {
      timeout = setTimeout(() => {
        navigate('/')
      }, 3000)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [message, navigate])

  const handleUpdatePassword = async () => {
    setError('')
    setMessage('')

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      setMessage('Password updated successfully. Redirecting...')
    }
  }

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
    padding: '28px',
  }

  const titleStyle = {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '6px',
    textAlign: 'center',
    color: '#111827',
  }

  const descriptionStyle = {
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '18px',
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
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#FFFFFF',
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
    marginTop: '12px',
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
        <div style={titleStyle}>Set New Password</div>
        <div style={descriptionStyle}>Enter a new password for your account.</div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>New Password</label>
          <input
            type="password"
            style={inputStyle}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={labelStyle}>Confirm New Password</label>
          <input
            type="password"
            style={inputStyle}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <button
          type="button"
          style={{ ...primaryButtonStyle, opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
          onClick={handleUpdatePassword}
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>

        {error && <div style={errorStyle}>{error}</div>}
        {message && <div style={messageStyle}>{message}</div>}
      </div>
    </div>
  )
}

