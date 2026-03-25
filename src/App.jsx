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
          <div
            style={{
              position: 'absolute',
              top: '22px',
              left: '52px',
              width: '74px',
              height: '92px',
              borderRadius: '14px',
              background: '#ffffff',
              border: '1px solid rgba(24,24,27,0.08)',
              boxShadow: '0 10px 20px rgba(24,24,27,0.05)',
              transform: 'rotate(-10deg)',
              animation: 'paperFloatA 3.2s ease-in-out infinite',
            }}
          >
            <div style={{ padding: '14px 12px' }}>
              <div style={{ height: 8, width: '70%', borderRadius: 999, background: '#e7e5e4', marginBottom: 8 }} />
              <div style={{ height: 6, width: '100%', borderRadius: 999, background: '#f0eeeb', marginBottom: 6 }} />
              <div style={{ height: 6, width: '82%', borderRadius: 999, background: '#f0eeeb' }} />
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '54px',
              width: '78px',
              height: '96px',
              borderRadius: '14px',
              background: '#ffffff',
              border: '1px solid rgba(24,24,27,0.08)',
              boxShadow: '0 10px 20px rgba(24,24,27,0.05)',
              transform: 'rotate(8deg)',
              animation: 'paperFloatB 3.6s ease-in-out infinite',
            }}
          >
            <div style={{ padding: '14px 12px' }}>
              <div style={{ height: 8, width: '62%', borderRadius: 999, background: '#e7e5e4', marginBottom: 8 }} />
              <div style={{ height: 6, width: '100%', borderRadius: 999, background: '#f0eeeb', marginBottom: 6 }} />
              <div style={{ height: 6, width: '75%', borderRadius: 999, background: '#f0eeeb' }} />
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              left: 20,
              right: 20,
              bottom: 22,
              height: 10,
              borderRadius: 999,
              background: 'rgba(24,24,27,0.06)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: 28,
              width: 96,
              height: 72,
              animation: 'runnerMove 2.4s ease-in-out infinite',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 24,
                bottom: -2,
                width: 42,
                height: 10,
                borderRadius: 999,
                background: 'rgba(24,24,27,0.10)',
                filter: 'blur(1px)',
                animation: 'shadowPulse 0.7s ease-in-out infinite',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: 18,
                bottom: 10,
                width: 58,
                height: 58,
                animation: 'runnerBounce 0.7s ease-in-out infinite',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 18,
                  width: 20,
                  height: 20,
                  borderRadius: '999px',
                  background: '#27272a',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 18,
                  left: 20,
                  width: 18,
                  height: 22,
                  borderRadius: 10,
                  background: '#57534e',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 36,
                  width: 16,
                  height: 20,
                  borderRadius: 5,
                  background: '#d6d3d1',
                  border: '1px solid rgba(24,24,27,0.08)',
                  transform: 'rotate(14deg)',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 22,
                  left: 12,
                  width: 18,
                  height: 6,
                  borderRadius: 999,
                  background: '#44403c',
                  transformOrigin: 'right center',
                  animation: 'armSwingLeft 0.7s ease-in-out infinite',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 24,
                  left: 34,
                  width: 18,
                  height: 6,
                  borderRadius: 999,
                  background: '#44403c',
                  transformOrigin: 'left center',
                  animation: 'armSwingRight 0.7s ease-in-out infinite',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 38,
                  left: 16,
                  width: 22,
                  height: 6,
                  borderRadius: 999,
                  background: '#292524',
                  transformOrigin: 'right center',
                  animation: 'legSwingLeft 0.7s ease-in-out infinite',
                }}
              />

              <div
                style={{
                  position: 'absolute',
                  top: 40,
                  left: 28,
                  width: 22,
                  height: 6,
                  borderRadius: 999,
                  background: '#292524',
                  transformOrigin: 'left center',
                  animation: 'legSwingRight 0.7s ease-in-out infinite',
                }}
              />
            </div>
          </div>
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
      @keyframes paperFloatA {
        0%, 100% { transform: rotate(-10deg) translateY(0px); }
        50% { transform: rotate(-8deg) translateY(-6px); }
      }

      @keyframes paperFloatB {
        0%, 100% { transform: rotate(8deg) translateY(0px); }
        50% { transform: rotate(10deg) translateY(-8px); }
      }

      @keyframes runnerMove {
        0% { transform: translateX(4px); }
        50% { transform: translateX(250px); }
        100% { transform: translateX(4px); }
      }

      @keyframes runnerBounce {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
      }

      @keyframes shadowPulse {
        0%, 100% { transform: scaleX(1); opacity: 0.18; }
        50% { transform: scaleX(0.82); opacity: 0.1; }
      }

      @keyframes armSwingLeft {
        0%, 100% { transform: rotate(26deg); }
        50% { transform: rotate(-18deg); }
      }

      @keyframes armSwingRight {
        0%, 100% { transform: rotate(-22deg); }
        50% { transform: rotate(18deg); }
      }

      @keyframes legSwingLeft {
        0%, 100% { transform: rotate(-28deg); }
        50% { transform: rotate(22deg); }
      }

      @keyframes legSwingRight {
        0%, 100% { transform: rotate(24deg); }
        50% { transform: rotate(-18deg); }
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