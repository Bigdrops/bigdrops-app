import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useNavigate } from 'react-router-dom'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const navigate = useNavigate()

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

  const filtered = filter === 'All' ? invoices : invoices.filter(i => (i.status || 'draft').toLowerCase() === filter.toLowerCase())

  return (
    <Layout title="Invoices">
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map(f => (
            <div key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: filter === f ? '#CC0000' : 'white', color: filter === f ? 'white' : '#555', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {f}
            </div>
          ))}
        </div>
        <div onClick={() => navigate('/invoices/new')} style={{ backgroundColor: '#CC0000', color: 'white', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
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
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📄</div>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>No invoices yet</div>
                <div style={{ fontSize: '13px' }}>Click + New Invoice to create your first one</div>
              </td></tr>
            ) : (
              filtered.map((inv, index) => {
                const s = statusColor(inv.status)
                return (
                  <tr
                    key={inv.id}
                    style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F4FF'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white'}
                  >
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