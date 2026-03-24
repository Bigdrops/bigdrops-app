import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from './supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useIsMobile } from './hooks/useIsMobile'
import { lazy, Suspense } from 'react'
import { Toaster } from '@/components/ui/toaster'
import ErrorBoundary from '@/components/ErrorBoundary'

// Lazy-loaded routes — each page loads only when first visited, not upfront
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const Invoices       = lazy(() => import('./pages/Invoices'))
const Quotations     = lazy(() => import('./pages/Quotations'))
const NewQuotation   = lazy(() => import('./pages/NewQuotation'))
const ViewQuotation  = lazy(() => import('./pages/ViewQuotation'))
const EditQuotation  = lazy(() => import('./pages/EditQuotation'))
const CSR            = lazy(() => import('./pages/CSR'))
const Clients        = lazy(() => import('./pages/Clients'))
const AddClient      = lazy(() => import('./pages/AddClient'))
const EditClient     = lazy(() => import('./pages/EditClient'))
const ClientDetail   = lazy(() => import('./pages/ClientDetail.tsx'))
const NewInvoice     = lazy(() => import('./pages/NewInvoice'))
const ViewInvoice    = lazy(() => import('./pages/ViewInvoice'))
const EditInvoice    = lazy(() => import('./pages/EditInvoice'))
const NewCSR         = lazy(() => import('./pages/NewCSR'))
const ViewCSR        = lazy(() => import('./pages/ViewCSR'))
const EditCSR        = lazy(() => import('./pages/EditCSR'))
const Settings       = lazy(() => import('./pages/Settings'))
const Projects       = lazy(() => import('./pages/Projects'))        // ← Added
const NewProject     = lazy(() => import('./pages/NewProject'))      // ← Added
const ProjectDetail  = lazy(() => import('./pages/ProjectDetail'))   // ← Added
const Reports        = lazy(() => import('./pages/Reports'))         // ← Added
const Waybills       = lazy(() => import('./pages/Waybills'))
const NewWaybill     = lazy(() => import('./pages/NewWaybill'))
const EditWaybill    = lazy(() => import('./pages/EditWaybill'))
const ViewWaybill    = lazy(() => import('./pages/ViewWaybill'))
const Login          = lazy(() => import('./pages/Login'))
const PendingApproval = lazy(() => import('./pages/PendingApproval'))
const ResetPassword  = lazy(() => import('./pages/ResetPassword'))

const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
    <div style={{ width: '28px', height: '28px', borderRadius: '999px', border: '3px solid #E5E7EB', borderTopColor: '#CC0000', animation: 'spin 1s linear infinite' }} />
  </div>
)

const withBoundary = (element) => <ErrorBoundary>{element}</ErrorBoundary>

function SetPasswordModal({ onComplete }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return    }
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
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">                {error}
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
  const provider = session?.user?.app_metadata?.provider
  const showSetPassword = Boolean(profile && !profile.has_password && provider !== 'email')

  return (
    <>
      {showSetPassword && (
        <SetPasswordModal onComplete={onProfileUpdate} />
      )}
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={withBoundary(<Dashboard session={session} />)} />
        <Route path="/invoices" element={withBoundary(<Invoices />)} />
        <Route path="/invoices/new" element={withBoundary(<NewInvoice />)} />
        <Route path="/invoices/edit/:id" element={withBoundary(<EditInvoice />)} />
        <Route path="/invoices/:id" element={withBoundary(<ViewInvoice />)} />
        <Route path="/quotations" element={withBoundary(<Quotations />)} />
        <Route path="/quotations/new" element={withBoundary(<NewQuotation />)} />
        <Route path="/quotations/edit/:id" element={withBoundary(<EditQuotation />)} />
        <Route path="/quotations/:id" element={withBoundary(<ViewQuotation />)} />
        <Route path="/csr" element={withBoundary(<CSR />)} />
        <Route path="/csr/new" element={withBoundary(<NewCSR />)} />
        <Route path="/csr/edit/:id" element={withBoundary(<EditCSR />)} />
        <Route path="/csr/:id" element={withBoundary(<ViewCSR />)} />
        <Route path="/clients" element={withBoundary(<Clients />)} />
        <Route path="/clients/new" element={withBoundary(<AddClient />)} />
        <Route path="/clients/edit/:id" element={withBoundary(<EditClient />)} />
        <Route path="/clients/:id" element={withBoundary(<ClientDetail />)} />
        <Route path="/settings" element={withBoundary(<Settings />)} />
        <Route path="/projects" element={withBoundary(<Projects />)} />              {/* ← Added */}
        <Route path="/projects/new" element={withBoundary(<NewProject />)} />        {/* ← Added */}        <Route path="/projects/:id" element={withBoundary(<ProjectDetail />)} />     {/* ← Added */}
        <Route path="/reports" element={withBoundary(<Reports />)} />                {/* ← Added */}
        <Route path="/waybills" element={withBoundary(<Waybills />)} />
        <Route path="/waybills/new" element={withBoundary(<NewWaybill />)} />
        <Route path="/waybills/:id/edit" element={withBoundary(<EditWaybill />)} />
        <Route path="/waybills/:id" element={withBoundary(<ViewWaybill />)} />
      </Routes>
      </Suspense>
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
      if (!error && data) {
        const { data: authData } = await supabase.auth.getUser()
        const provider = authData.user?.app_metadata?.provider
        if (provider === 'email' && !data.has_password) {
          await supabase.from('profiles').update({ has_password: true }).eq('id', userId)
          setProfile({ ...data, has_password: true })
          return
        }
        setProfile(data)
      }
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
    return (      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <div style={{ textAlign: 'center', color: '#4B5563', fontSize: '14px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '999px', border: '3px solid #E5E7EB', borderTopColor: '#CC0000', margin: '0 auto 10px', animation: 'spin 1s linear infinite' }} />
          Checking authentication...
        </div>
      </div>
    )
  }

  const approved = profile?.is_approved === true

  return (
    <BrowserRouter>
      <Toaster />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/reset-password" element={withBoundary(<ResetPassword />)} />
        <Route path="/*" element={
          !session
            ? withBoundary(<Login />)
            : !approved
            ? withBoundary(<PendingApproval email={session?.user?.email || ''} />)
            : withBoundary(<AppShell session={session} profile={profile} onProfileUpdate={() => loadProfile(session.user.id)} />)
        } />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
export { useIsMobile }

