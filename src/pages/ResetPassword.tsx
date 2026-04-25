import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '../supabase'

const fieldClassName = 'mt-1 h-10 rounded-lg border-zinc-200 bg-white px-3 text-sm'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let timeout: NodeJS.Timeout
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
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          await supabase.from('profiles').update({ has_password: true }).eq('id', user.id)
        }
      } catch {
        // Best effort sync for trust; password update already succeeded.
      }
      setMessage('Password updated successfully. Redirecting...')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F5] p-5">
      <Card className="w-full max-w-[420px] rounded-xl bg-white py-0 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <CardHeader className="px-7 pt-7 text-center">
          <CardTitle className="justify-center text-xl font-bold text-gray-900">Set New Password</CardTitle>
          <CardDescription className="text-[13px] text-gray-500">
            Enter a new password for your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 px-7 pb-7">
          <div>
            <Label htmlFor="new-password" className="text-xs font-semibold text-gray-700">New Password</Label>
            <Input
              id="new-password"
              type="password"
              className={fieldClassName}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password"
            />
          </div>

          <div>
            <Label htmlFor="confirm-password" className="text-xs font-semibold text-gray-700">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              className={fieldClassName}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button
            type="button"
            className="mt-3 h-10 w-full rounded-lg bg-[#CC0000] text-sm font-semibold text-white hover:bg-[#b30000]"
            onClick={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
          {message && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{message}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
