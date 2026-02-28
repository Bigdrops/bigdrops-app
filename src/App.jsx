import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { supabase } from './supabase'
import { useState, useEffect } from 'react'

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
  const [counts, setCounts] = useState({ invoices: 0, quotations: 0, csrs: 0, clients: 0 })

  useEffect(() => {
    supabase.from('invoices').select('id', { count: 'exact' }).then(({ count }) =>
      setCounts(c => ({ ...c, invoices: count || 0 })))
    supabase.from('clients').select('id', { count: 'exact' }).then(({ count }) =>
      setCounts(c => ({ ...c, clients: count || 0 })))
  }, [])

  return (
    <Layout title="Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {[
          { label: 'Total Invoices', value: counts.invoices, color: '#CC0000' },
          { label: 'Quotations', value: counts.quotations, color: '#0056B3' },
          { label: 'CSRs Filed', value: counts.csrs, color: '#333' },
          { label: 'Active Clients', value: counts.clients, color: '#16A34A' },
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
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('invoices').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setInvoices(data || [])
      setLoading(false)
    })
  }, [])

  const statusColor = (status) => {
    if (status === 'paid') return { bg: '#DCFCE7', color: '#16A34A' }
    if (status === 'sent') return { bg: '#E8F0FB', color: '#0056B3' }
    if (status === 'overdue') return { bg: '#FEE2E2', color: '#CC0000' }
    return { bg: '#F5F5F5', color: '#555' }
  }

  return (
    <Layout title="Invoices">
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map(filter => (
            <div key={filter} style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: filter === 'All' ? '#CC0000' : 'white', color: filter === 'All' ? 'white' : '#555', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {filter}
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: '#CC0000', color: 'white', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
          + New Invoice
        </div>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px' }}>Invoice No</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px' }}>Client</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px' }}>Date</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px' }}>Due Date</th>
              <th style={{ padding: '14px 20px', textAlign: 'right', color: 'white', fontSize: '13px' }}>Amount</th>
              <th style={{ padding: '14px 20px', textAlign: 'center', color: 'white', fontSize: '13px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#888' }}>Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📄</div>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>No invoices yet</div>
                <div style={{ fontSize: '13px' }}>Click + New Invoice to create your first one</div>
              </td></tr>
            ) : (
              invoices.map((inv, index) => {
                const s = statusColor(inv.status)
                return (
                  <tr key={inv.id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 'bold', color: '#CC0000' }}>{inv.invoice_number}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#1a1a1a' }}>{inv.client_name}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>{inv.issue_date}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>{inv.due_date}</td>
                    <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a', textAlign: 'right' }}>
                      ₦{Number(inv.total || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <span style={{ backgroundColor: s.bg, color: s.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                        {inv.status || 'draft'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
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
    supabase.from('clients').select('*').order('name').then(({ data, error }) => {
      if (error) console.error('Error fetching clients:', error)
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
                <tr key={client.id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F4FF'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white'}>
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