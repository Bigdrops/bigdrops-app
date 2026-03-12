
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from './supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useIsMobile } from './hooks/useIsMobile'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import Quotations from './pages/Quotations'
import CSR from './pages/CSR'
import Clients from './pages/Clients'
import AddClient from './pages/AddClient'
import EditClient from './pages/EditClient'
import NewInvoice from './pages/NewInvoice'
import ViewInvoice from './pages/ViewInvoice'
import EditInvoice from './pages/EditInvoice'
import NewCSR from './pages/NewCSR'
import ViewCSR from './pages/ViewCSR'
import EditCSR from './pages/EditCSR'
import Settings from './pages/Settings'
import Login from './pages/Login'
import PendingApproval from './pages/PendingApproval'
import ResetPassword from './pages/ResetPassword'

function SetPasswordModal({ onComplete }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ has_password: true }).eq('id', user.id)
    setDone(true)
    setTimeout(() => onComplete(), 1500)
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader>
          <DialogTitle className="text-red-700">Set System Password</DialogTitle>
          <DialogDescription>
            Set a password to sign in with email. You only need to do this once.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
            Password set successfully.
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onComplete}>
                Skip for now
              </Button>
              <Button type="button" className="flex-1 bg-red-700 hover:bg-red-800" onClick={handleSubmit} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Setting...' : 'Set Password'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function AppShell({ session, profile, onProfileUpdate }) {
  const [showSetPassword, setShowSetPassword] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (profile && !profile.has_password) setShowSetPassword(true)
  }, [profile])

  return (
    <>
      {showSetPassword && (
        <SetPasswordModal onComplete={() => { setShowSetPassword(false); onProfileUpdate() }} />
      )}
      <Routes>
        <Route path="/" element={<Dashboard session={session} />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<NewInvoice />} />
        <Route path="/invoices/edit/:id" element={<EditInvoice />} />
        <Route path="/invoices/:id" element={<ViewInvoice />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/csr" element={<CSR />} />
        <Route path="/csr/new" element={<NewCSR />} />
        <Route path="/csr/edit/:id" element={<EditCSR />} />
        <Route path="/csr/:id" element={<ViewCSR />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/new" element={<AddClient />} />
        <Route path="/clients/edit/:id" element={<EditClient />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </>
  )
}

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const loadingRef = useRef(false)

  const loadProfile = async (userId) => {
    if (!userId) return
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (!error && data) setProfile(data)
    } catch (err) {
      console.error('Profile fetch error:', err)
    }
  }

  useEffect(() => {
    let subscription = null
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session?.user?.id && !loadingRef.current) {
        loadingRef.current = true
        await loadProfile(session.user.id)
      }
      setAuthLoading(false)
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          setSession(session)
          if (session?.user?.id) { loadingRef.current = true; loadProfile(session.user.id) }
        } else if (event === 'SIGNED_OUT') {
          setSession(null); setProfile(null); loadingRef.current = false; setAuthLoading(false)
        }
      })
      subscription = data.subscription
    }
    init()
    return () => { subscription?.unsubscribe() }
  }, [])

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <div style={{ textAlign: 'center', color: '#4B5563', fontSize: '14px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '999px', border: '3px solid #E5E7EB', borderTopColor: '#CC0000', margin: '0 auto 10px', animation: 'spin 1s linear infinite' }} />
          Checking authentication…
        </div>
      </div>
    )
  }

  const approved = profile?.is_approved === true

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/*" element={
          !session
            ? <Login />
            : !approved
            ? <PendingApproval email={session?.user?.email || ''} />
            : <AppShell session={session} profile={profile} onProfileUpdate={() => loadProfile(session.user.id)} />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
export { useIsMobile }
