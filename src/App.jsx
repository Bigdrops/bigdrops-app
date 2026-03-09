import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
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
import Login from './pages/Login'
import PendingApproval from './pages/PendingApproval'
import ResetPassword from './pages/ResetPassword'

const navItems = [
  { label: 'Dashboard', path: '/', icon: '🏠' },
  { label: 'Invoices', path: '/invoices', icon: '📄' },
  { label: 'Quotations', path: '/quotations', icon: '📋' },
  { label: 'CSR', path: '/csr', icon: '🔧' },
  { label: 'Clients', path: '/clients', icon: '👥' },
]

function Sidebar({ session, isMobile }) {
  if (isMobile) return null
  return (
    <div style={{ width: '240px', minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #EBEBEB', boxShadow: '2px 0 8px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ color: '#CC0000', fontWeight: '700', fontSize: '20px', letterSpacing: '-0.5px' }}>BIGDROPS</div>
        <div style={{ color: '#ABABAB', fontSize: '11px', marginTop: '3px', letterSpacing: '0.3px' }}>Business Management</div>
      </div>
      <nav style={{ padding: '12px', flex: 1 }}>
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'}
            style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', textDecoration: 'none', color: isActive ? '#CC0000' : '#6B6B6B', backgroundColor: isActive ? '#FFF5F5' : 'transparent', fontSize: '14px', fontWeight: isActive ? '600' : '400', borderRadius: '8px', marginBottom: '2px', borderLeft: isActive ? '3px solid #CC0000' : '3px solid transparent', transition: 'all 0.15s ease' })}>
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '16px 24px', borderTop: '1px solid #F0F0F0' }}>
        <div style={{ color: '#BDBDBD', fontSize: '11px', marginBottom: '8px' }}>Sun & Shield Power Solutions</div>
        <div style={{ color: '#888', fontSize: '11px', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.email || ''}</div>
        <div onClick={async () => { await supabase.auth.signOut() }} style={{ color: '#CC0000', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: '6px 0' }}>Sign Out</div>
      </div>
    </div>
  )
}

function BottomNav() {
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'white', borderTop: '1px solid #EBEBEB', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 100 }}>
      {[
        { label: 'Home', path: '/', icon: '🏠' },
        { label: 'Invoices', path: '/invoices', icon: '📄' },
        { label: 'CSR', path: '/csr', icon: '🔧' },
        { label: 'Clients', path: '/clients', icon: '👥' },
      ].map(item => (
        <NavLink key={item.path} to={item.path} end={item.path === '/'}
          style={({ isActive }) => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: isActive ? '#CC0000' : '#888', fontSize: '10px', gap: '2px', minWidth: '44px', minHeight: '44px', padding: '4px' })}>
          <span style={{ fontSize: '20px' }}>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
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
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({ has_password: true }).eq('id', user.id)
    setDone(true)
    setTimeout(() => onComplete(), 1500)
  }

  const overlay = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
  const card = { backgroundColor: 'white', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '400px', margin: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
  const input = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ color: '#CC0000', fontWeight: '700', fontSize: '18px', marginBottom: '6px' }}>Set System Password</div>
        <div style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>Set a password so you can also sign in with email. You only need to do this once.</div>
        {done ? (
          <div style={{ color: '#16A34A', fontWeight: '600', textAlign: 'center' }}>✓ Password set successfully!</div>
        ) : (
          <>
            <input type="password" placeholder="New password" style={input} value={password} onChange={e => setPassword(e.target.value)} />
            <input type="password" placeholder="Confirm password" style={input} value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && <div style={{ color: '#CC0000', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div onClick={() => onComplete()} style={{ flex: 1, padding: '10px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#666' }}>Skip for now</div>
              <div onClick={handleSubmit} style={{ flex: 1, padding: '10px', textAlign: 'center', backgroundColor: '#CC0000', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>{loading ? 'Setting...' : 'Set Password'}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AppShell({ session, profile, onProfileUpdate }) {
  const [showSetPassword, setShowSetPassword] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (profile && !profile.has_password) setShowSetPassword(true)
  }, [profile])

  return (
    <div style={{ display: 'flex' }}>
      {showSetPassword && <SetPasswordModal onComplete={() => { setShowSetPassword(false); onProfileUpdate() }} />}
      <Sidebar session={session} isMobile={isMobile} />
      <div style={{ flex: 1, width: '100%', minHeight: '100vh', backgroundColor: '#F7F7F5', paddingBottom: isMobile ? '70px' : 0, marginLeft: isMobile ? 0 : '240px' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
        </Routes>
      </div>
      {isMobile && <BottomNav />}
    </div>
  )
}

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const loadingRef = useRef(false) // prevents concurrent loadProfile calls

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
    // ONE-TIME init: get session once, load profile once, then listen
    let subscription = null

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (session?.user?.id && !loadingRef.current) {
        loadingRef.current = true
        await loadProfile(session.user.id)
      }

      setAuthLoading(false)

      // Now set up listener — only react to SIGNED_IN (new login) and SIGNED_OUT
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
          setSession(session)
          if (session?.user?.id) {
            loadingRef.current = true
            loadProfile(session.user.id)
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setProfile(null)
          loadingRef.current = false
          setAuthLoading(false)
        }
        // TOKEN_REFRESHED and all other events: do nothing
      })

      subscription = data.subscription
    }

    init()

    return () => { subscription?.unsubscribe() }
  }, []) // empty deps — runs once only

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
