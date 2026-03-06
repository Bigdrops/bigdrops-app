import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import Quotations from './pages/Quotations'
import CSR from './pages/CSR'
import Clients from './pages/Clients'
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

function Sidebar() {
  return (
    <div style={{
      width: '240px',
      minHeight: '100vh',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      borderRight: '1px solid #EBEBEB',
      boxShadow: '2px 0 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ color: '#CC0000', fontWeight: '700', fontSize: '20px', letterSpacing: '-0.5px' }}>
          BIGDROPS
        </div>
        <div style={{ color: '#ABABAB', fontSize: '11px', marginTop: '3px', letterSpacing: '0.3px' }}>
          Business Management
        </div>
      </div>

      <nav style={{ padding: '12px', flex: 1 }}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              textDecoration: 'none',
              color: isActive ? '#CC0000' : '#6B6B6B',
              backgroundColor: isActive ? '#FFF5F5' : 'transparent',
              fontSize: '14px',
              fontWeight: isActive ? '600' : '400',
              borderRadius: '8px',
              marginBottom: '2px',
              borderLeft: isActive ? '3px solid #CC0000' : '3px solid transparent',
              transition: 'all 0.15s ease'
            })}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid #F0F0F0',
        color: '#BDBDBD',
        fontSize: '11px'
      }}>
        Sun & Shield Power Solutions
      </div>
    </div>
  )
}

function AppShell() {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />

      <div style={{ flex: 1, minHeight: '100vh', backgroundColor: '#F7F7F5' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/new" element={<NewInvoice />} />
          <Route path="/invoices/:id" element={<ViewInvoice />} />
          <Route path="/invoices/edit/:id" element={<EditInvoice />} />

          <Route path="/quotations" element={<Quotations />} />

          <Route path="/csr" element={<CSR />} />
          <Route path="/csr/new" element={<NewCSR />} />
          <Route path="/csr/edit/:id" element={<EditCSR />} />
          <Route path="/csr/:id" element={<ViewCSR />} />

          <Route path="/clients" element={<Clients />} />
        </Routes>
      </div>
    </div>
  )
}

function App() {
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let mounted = true

    const loadProfile = async (userId) => {
      console.log('Loading profile for userId:', userId)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        console.log('Profile data:', data)
        console.log('Profile error:', error)
        if (mounted) setProfile(data)
      } catch (err) {
        console.error('Profile fetch error:', err)
      }
    }

    const initAuth = async () => {
      const timeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth timeout fallback triggered')
          setAuthLoading(false)
        }
      }, 5000)

      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!mounted) return

        setSession(session)

        if (session?.user) {
          await loadProfile(session.user.id)
        }

      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        clearTimeout(timeout)
        if (mounted) setAuthLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (!mounted) return

        setSession(session)

        if (session?.user) {
          await loadProfile(session.user.id)
        } else {
          setProfile(null)
        }

        setAuthLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }

  }, [])

  const loadingView = (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F7F7F5'
    }}>
      <div style={{ textAlign: 'center', color: '#4B5563', fontSize: '14px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '999px',
          border: '3px solid #E5E7EB',
          borderTopColor: '#CC0000',
          margin: '0 auto 10px',
          animation: 'spin 1s linear infinite'
        }} />
        Checking authentication…
      </div>
    </div>
  )

  const approved = profile?.is_approved === true
  const userEmail = session?.user?.email || ''

  return (
    <BrowserRouter>
      <Routes>

        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/*"
          element={
            authLoading
              ? loadingView
              : !session
              ? <Login />
              : !approved
              ? <PendingApproval email={userEmail} />
              : <AppShell />
          }
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App