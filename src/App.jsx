import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'
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

function TopBar({ title }) {
  return (
    <div style={{
      height: '60px', backgroundColor: 'white', borderBottom: '1px solid #eee',
      display: 'flex', alignItems: 'center', padding: '0 30px',
      justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10
    }}>
      <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '18px' }}>{title}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ backgroundColor: '#CC0000', color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
          + New Document
        </div>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0056B3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
          A
        </div>
      </div>
    </div>
  )
}

function Layout({ title, children }) {
  return (
    <div style={{ marginLeft: '240px', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
      <TopBar title={title} />
      <div style={{ padding: '30px' }}>{children}</div>
    </div>
  )
}

function Dashboard() {
  return (
    <Layout title="Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {[
          { label: 'Total Invoices', value: '0', color: '#CC0000' },
          { label: 'Quotations', value: '0', color: '#0056B3' },
          { label: 'CSRs Filed', value: '0', color: '#333' },
          { label: 'Active Clients', value: '0', color: '#16A34A' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${card.color}` }}>
            <div style={{ color: '#888', fontSize: '13px', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: '32px', fontWeight: 'bold' }}>{card.value}</div>
          </div>
        ))}
      </div>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a1a' }}>Recent Documents</h3>
        <p style={{ color: '#888', fontSize: '14px' }}>No documents yet. Create your first invoice to get started.</p>
      </div>
    </Layout>
  )
}

function Invoices() {
  return (
    <Layout title="Invoices">
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <p style={{ color: '#888', fontSize: '14px' }}>No invoices yet.</p>
      </div>
    </Layout>
  )
}

function Quotations() {
  return (
    <Layout title="Quotations">
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <p style={{ color: '#888', fontSize: '14px' }}>No quotations yet.</p>
      </div>
    </Layout>
  )
}

function CSR() {
  return (
    <Layout title="Customer Service Reports">
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <p style={{ color: '#888', fontSize: '14px' }}>No CSRs yet.</p>
      </div>
    </Layout>
  )
}

function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('clients').select('*').then(({ data }) => {
      setClients(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <Layout title="Clients">
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ backgroundColor: '#CC0000', color: 'white', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
          + Add Client
        </div>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Name</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Address</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Phone</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Category</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#888' }}>Loading...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#888' }}>No clients yet.</td></tr>
            ) : (
              clients.map((client, index) => (
                <tr key={client.id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a' }}>{client.name}</td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>{client.address || '—'}</td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>{client.phone || '—'}</td>
                  <td style={{ padding: '14px 20px', fontSize: '14px' }}>
                    {client.category ? (
                      <span style={{ backgroundColor: '#E8F0FB', color: '#0056B3', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                        {client.category}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>{client.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
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