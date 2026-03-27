import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { supabase } from './supabase'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useIsMobile } from './hooks/useIsMobile'
import { Toaster } from '@/components/ui/toaster'
import ErrorBoundary from '@/components/ErrorBoundary'

// Lazy-loaded routes — each page loads only when first visited, not upfront
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Invoices = lazy(() => import('./pages/Invoices'))
const Quotations = lazy(() => import('./pages/Quotations'))
const NewQuotation = lazy(() => import('./pages/NewQuotation'))
const ViewQuotation = lazy(() => import('./pages/ViewQuotation'))
const EditQuotation = lazy(() => import('./pages/EditQuotation'))
const CSR = lazy(() => import('./pages/CSR'))
const Clients = lazy(() => import('./pages/Clients'))
const AddClient = lazy(() => import('./pages/AddClient'))
const EditClient = lazy(() => import('./pages/EditClient'))
const ClientDetail = lazy(() => import('./pages/ClientDetail.tsx'))
const NewInvoice = lazy(() => import('./pages/NewInvoice'))
const ViewInvoice = lazy(() => import('./pages/ViewInvoice'))
const EditInvoice = lazy(() => import('./pages/EditInvoice'))
const NewCSR = lazy(() => import('./pages/NewCSR'))
const ViewCSR = lazy(() => import('./pages/ViewCSR'))
const EditCSR = lazy(() => import('./pages/EditCSR'))
const Settings = lazy(() => import('./pages/Settings'))
const Projects = lazy(() => import('./pages/Projects'))
const NewProject = lazy(() => import('./pages/NewProject'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'))
const ProjectDocumentView = lazy(() => import('./pages/ProjectDocumentView.tsx'))
const Reports = lazy(() => import('./pages/Reports'))
const Waybills = lazy(() => import('./pages/Waybills'))
const NewWaybill = lazy(() => import('./pages/NewWaybill'))
const EditWaybill = lazy(() => import('./pages/EditWaybill'))
const ViewWaybill = lazy(() => import('./pages/ViewWaybill'))
const Login = lazy(() => import('./pages/Login'))
const PendingApproval = lazy(() => import('./pages/PendingApproval'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

const SPLASH_TIPS = [
  'Arranging your papers and records...',
  'Preparing your workspace...',
  'Getting documents and projects in order...',
]

const PageLoader = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fafaf9',
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 18,
        background: '#ffffff',
        border: '1px solid rgba(24,24,27,0.08)',
        boxShadow: '0 6px 18px rgba(24,24,27,0.05)',
      }}
    />
  </div>
)

const withBoundary = (element) => <ErrorBoundary>{element}</ErrorBoundary>

function SplashOverlay({ visible, tip }) {
  return (
    <div
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)',
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 260ms ease, visibility 260ms ease',
      }}
    >
      <div
        style={{
          width: 'min(92vw, 390px)',
          padding: '28px 24px 24px',
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.84)',
          border: '1px solid rgba(24,24,27,0.06)',
          boxShadow: '0 18px 50px rgba(24,24,27,0.07)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '148px',
            marginBottom: '18px',
            overflow: 'hidden',
            borderRadius: '22px',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8f8f7 100%)',
            border: '1px solid rgba(24,24,27,0.05)',
          }}
        >
          {/* Paper and runner animations omitted for brevity */}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 650,
            letterSpacing: '-0.02em',
            color: '#18181b',
            marginBottom: 8,
          }}
        >
          BigDrops
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: '#71717a',
            minHeight: 42,
            maxWidth: 260,
            margin: '0 auto',
          }}
        >
          {tip}
        </div>
      </div>
    </div>
  )
}

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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('profiles').update({ has_password: true }).eq('id', user.id)
    setDone(true)
    setTimeout(() => onComplete(), 1500)
  }

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader>
          <DialogTitle>Set System Password</DialogTitle>
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
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
              <Button type="button" className="flex-1" onClick={handleSubmit} disabled={loading}>
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
      {showSetPassword && <SetPasswordModal onComplete={onProfileUpdate} />}
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
          <Route path="/projects" element={withBoundary(<Projects />)} />
          <Route path="/projects/new" element={withBoundary(<NewProject />)} />
          <Route path="/projects/:projectId/documents/:documentId" element={withBoundary(<ProjectDocumentView />)} />
          <Route path="/projects/:id" element={withBoundary(<ProjectDetail />)} />
          <Route path="/reports" element={withBoundary(<Reports />)} />
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
  const [profileLoading, setProfileLoading] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tipIndex, setTipIndex] = useState(0)

  const loadingRef = useRef(false)
  const splashStartRef = useRef(Date.now())
  const hasBootedRef = useRef(false)
  const lastUserIdRef = useRef(null)

  const loadProfile = async (userId) => {
    if (!userId) return
    setProfileLoading(true)
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (!error && data) {
        const { data: authData } = await supabase.auth.getUser()
        const provider = authData.user?.app_metadata?.provider
        if (provider === 'email' && !data.has_password) {
          await supabase.from('profiles').update({ has_password: true }).eq('id', userId)
          setProfile({ ...data, has_password: true })
        } else {
          setProfile(data)
        }
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
    } finally {
      setProfileLoading(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `
      @keyframes runnerMove {
        0% { transform: translateX(4px); }
        50% { transform: translateX(250px); }
        100% { transform: translateX(4px); }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SPLASH_TIPS.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let subscription = null
    const init = async () => {
      splashStartRef.current = Date.now()
      setAuthLoading(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
      lastUserIdRef.current = session?.user?.id || null
      if (session?.user?.id) {
        loadingRef.current = true
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setAuthLoading(false)
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        const nextUserId = session?.user?.id || null
        const previousUserId = lastUserIdRef.current
        const isRealNewSignIn = !previousUserId && !!nextUserId
        if (event === 'SIGNED_OUT') {
          lastUserIdRef.current = null
          setSession(null)
          setProfile(null)
          loadingRef.current = false
          setProfileLoading(false)
          setAuthLoading(false)
          setShowSplash(false)
          return
        }
        if (event === 'SIGNED_IN') {
          lastUserIdRef.current = nextUserId
          setSession(session)
          if (isRealNewSignIn && hasBootedRef.current) {
            splashStartRef.current = Date.now()
            setShowSplash(true)
          }
          if (nextUserId) {
            setAuthLoading(true)
            loadingRef.current = true
            await loadProfile(nextUserId)
            setAuthLoading(false)
          }
          return
        }
        setSession(session)
        lastUserIdRef.current = nextUserId
      })
      subscription = data.subscription
    }
    init()
    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    hasBootedRef.current = true
  }, [])

  useEffect(() => {
    const loadingDone = !authLoading && !profileLoading
    if (!loadingDone) return
    const elapsed = Date.now() - splashStartRef.current
    const minimumVisible = 600
    const remaining = Math.max(0, minimumVisible - elapsed)
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, remaining)
    return () => clearTimeout(timer)
  }, [authLoading, profileLoading])

  const approved = profile?.is_approved === true
  return (
    <>
      <BrowserRouter>
        <Toaster />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/reset-password" element={withBoundary(<ResetPassword />)} />
            <Route
              path="/*"
              element={
                !session
                  ? withBoundary(<Login />)
                  : !approved
                    ? withBoundary(<PendingApproval email={session?.user?.email || ''} />)
                    : withBoundary(
                        <AppShell
                          session={session}
                          profile={profile}
                          onProfileUpdate={() => loadProfile(session.user.id)}
                        />
                      )
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <SplashOverlay visible={showSplash} tip={SPLASH_TIPS[tipIndex]} />
    </>
  )
}

export default App