import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
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
      width: '240px', minHeight: '100vh', backgroundColor: 'white',
      display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0,
      borderRight: '1px solid #EBEBEB', boxShadow: '2px 0 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid #F0F0F0' }}>
        <div style={{ color: '#CC0000', fontWeight: '700', fontSize: '20px', letterSpacing: '-0.5px' }}>BIGDROPS</div>
        <div style={{ color: '#ABABAB', fontSize: '11px', marginTop: '3px', letterSpacing: '0.3px' }}>Business Management</div>
      </div>
      <nav style={{ padding: '12px 12px', flex: 1 }}>
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', textDecoration: 'none',
              color: isActive ? '#CC0000' : '#6B6B6B',
              backgroundColor: isActive ? '#FFF5F5' : 'transparent',
              fontSize: '14px', fontWeight: isActive ? '600' : '400',
              borderRadius: '8px', marginBottom: '2px',
              borderLeft: isActive ? '3px solid #CC0000' : '3px solid transparent',
              transition: 'all 0.15s ease',
            })}>
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '16px 24px', borderTop: '1px solid #F0F0F0', color: '#BDBDBD', fontSize: '11px' }}>
        Sun & Shield Power Solutions
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
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
            <Route path="/clients" element={<Clients />} />
            <Route path="/csr/new" element={<NewCSR />} />
            <Route path="/csr/:id" element={<ViewCSR />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App
