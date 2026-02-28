import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import Quotations from './pages/Quotations'
import CSR from './pages/CSR'
import Clients from './pages/Clients'

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
      width: '240px', minHeight: '100vh', backgroundColor: '#1a1a1a',
      display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0
    }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #333' }}>
        <div style={{ color: '#CC0000', fontWeight: 'bold', fontSize: '22px' }}>BIGDROPS</div>
        <div style={{ color: '#888', fontSize: '11px', marginTop: '4px' }}>Business Management</div>
      </div>
      <nav style={{ padding: '16px 0', flex: 1 }}>
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 20px', textDecoration: 'none',
              color: isActive ? 'white' : '#888',
              backgroundColor: isActive ? '#CC0000' : 'transparent',
              fontSize: '14px', fontWeight: isActive ? 'bold' : 'normal',
            })}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '16px 20px', borderTop: '1px solid #333', color: '#555', fontSize: '12px' }}>
        Sun & Shield Power Solutions
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/csr" element={<CSR />} />
        <Route path="/clients" element={<Clients />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App