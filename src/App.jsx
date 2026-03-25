import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
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
  'Tracking projects, invoices, and quotations...',
  'Preparing your client workspace...',
  'Getting your reports and waybills ready...',
  'Syncing business records for a smoother start...',
]

const PageLoader = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background:
        'radial-gradient(circle at top, rgba(204, 0, 0, 0.05), transparent 35%), #F7F7F5',
    }}
  >
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          position: 'relative',
          width: '64px',
          height: '64px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '999px',
            border: '4px solid #E5E7EB',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '999px',
            border: '4px solid transparent',
            borderTopColor: '#CC0000',
            borderRightColor: '#CC0000',
            animation: 'spin 0.9s linear infinite',
          }}
        />
      </div>
    </div>
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
        background:
          'radial-gradient(circle at top, rgba(204, 0, 0, 0.06), transparent 35%), linear-gradient(180deg, #F8F8F6 0%, #F3F3EF 100%)',
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 280ms ease, visibility 280ms ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '84px',
            height: '84px',
            margin: '0 auto 22px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '999px',
              background: 'rgba(204, 0, 0, 0.05)',
              transform: 'scale(1)',
              animation: 'pulseRing 1.8s ease-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '10px',
              borderRadius: '999px',
              border: '4px solid #E5E7EB',
              background: '#FAFAF8',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '10px',
              borderRadius: '999px',
              border: '4px solid transparent',
              borderTopColor: '#CC0000',
              borderRightColor: '#CC0000',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: '#991B1B',
              letterSpacing: '0.08em',
            }}
          >
            BD
          </div>
        </div>

        <div
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#111827',
            letterSpacing: '-0.02em',
            marginBottom: '8px',
          }}
        >
          BigDrops
        </div>

        <div
          style={{
            fontSize: '14px',
            color: '#6B7280',
            lineHeight: 1.6,
            minHeight: '44px',
            maxWidth: '280px',
            margin: '0 auto 18px',
          }}
        >
          {tip}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '999px',
              background: '#CC0000',
              opacity: 0.95,
              animation: 'dotPulse 1.2s ease-in-out infinite',
            }}
          />
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '999px',
              background: '#CC0000',
              opacity: 0.65,
              animation: 'dotPulse 1.2s ease-in-out 0.2s infinite',
            }}
          />
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '999px',
              background: '#CC0000',
              opacity: 0.4,
              animation: 'dotPulse 1.2s ease-in-out 0.4s infinite',
            }}
          />
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
              <Button
                type="button"
                className="flex-1 bg-red-700 hover:bg-red-800"
                onClick={handleSubmit}
                disabled={loading}
              >
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
          <Route
            path="/projects/:projectId/documents/:documentId"
            element={withBoundary(<ProjectDocumentView />)}
          />
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
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulseRing {
        0% { transform: scale(0.9); opacity: 0.45; }
        70% { transform: scale(1.15); opacity: 0; }
        100% { transform: scale(1.15); opacity: 0; }
      }
      @keyframes dotPulse {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
        40% { transform: translateY(-4px); opacity: 1; }
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

      if (session?.user?.id) {
        loadingRef.current = true
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
      }

      setAuthLoading(false)

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN') {
          splashStartRef.current = Date.now()
          setShowSplash(true)
          setAuthLoading(true)
          setSession(session)

          if (session?.user?.id) {
            loadingRef.current = true
            await loadProfile(session.user.id)
          }

          setAuthLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setProfile(null)
          loadingRef.current = false
          setProfileLoading(false)
          setAuthLoading(false)
          setShowSplash(false)
        }
      })

      subscription = data.subscription
    }

    init()

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const loadingDone = !authLoading && !profileLoading

    if (!loadingDone) {
      setShowSplash(true)
      return
    }

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
export { useIsMobile }