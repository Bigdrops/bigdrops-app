import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useIsMobile } from '../hooks/useIsMobile'
import { useNavigate } from 'react-router-dom'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [showSummary, setShowSummary] = useState(!isMobile)

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

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
  const totalDue = invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
  const totalReceived = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
  const totalVat = invoices.reduce((sum, inv) => sum + (Number(inv.vat) || 0), 0)

  const summaryItems = [
    { label: 'Total Invoiced', value: totalInvoiced, color: '#0056B3', bg: '#EFF6FF' },
    { label: 'Amount Due', value: totalDue, color: '#CC0000', bg: '#FEF2F2' },
    { label: 'Received', value: totalReceived, color: '#16A34A', bg: '#F0FDF4' },
    { label: 'VAT', value: totalVat, color: '#CA8A04', bg: '#FEFCE8' },
  ]

  return (
    <Layout title="Invoices">

      {/* Top bar */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map(f => (
            <div key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: filter === f ? '#CC0000' : 'white', color: filter === f ? 'white' : '#555', fontSize: '13px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {f}
            </div>
          ))}
        </div>
        {!isMobile && (
          <div onClick={() => navigate('/invoices/new')} style={{ backgroundColor: '#CC0000', color: 'white', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
            + New Invoice
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontWeight: '600', fontSize: '14px' }}>Summary</div>
          <div onClick={() => setShowSummary(s => !s)} style={{ cursor: 'pointer', fontSize: '13px', color: '#0056B3' }}>
            {showSummary ? '▲ Hide' : '▼ Show'}
          </div>
        </div>
        {showSummary && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
            {summaryItems.map(item => (
              <div key={item.label} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ backgroundColor: item.bg, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  <span style={{ color: item.color, fontSize: '16px' }}>₦</span>
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{item.label}</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>₦{Number(item.value).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice list */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '80px' }}>
          {loading ? (
            <p style={{ padding: '30px', color: '#888', fontSize: '14px' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: '30px', color: '#888', fontSize: '14px' }}>No invoices yet.</p>
          ) : (
            filtered.map(inv => (
              <div key={inv.id} onClick={() => navigate('/invoices/' + inv.id)} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #EBEBEB', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', color: '#CC0000', fontSize: '14px' }}>{inv.invoice_number}</span>
                  <span style={{ fontWeight: '700', color: '#1a1a1a' }}>₦{Number(inv.total || 0).toLocaleString()}</span>
                </div>
                <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a', marginBottom: '6px' }}>{inv.client_name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#888', fontSize: '12px' }}>{inv.issue_date || inv.date}</span>
                  <span style={{ backgroundColor: statusColor(inv.status).bg, color: statusColor(inv.status).color, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{inv.status || 'draft'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1a1a1a' }}>
                {['Invoice No', 'Client', 'Date', 'Due Date', 'Amount', 'Status'].map((h, i) => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: i === 4 ? 'right' : i === 5 ? 'center' : 'left', color: 'white', fontSize: '13px' }}>{h}</th>
                ))}
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
                    <tr key={inv.id} onClick={() => navigate('/invoices/' + inv.id)}
                      style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F4FF'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white'}
                    >
                      <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 'bold', color: '#CC0000' }}>{inv.invoice_number}</td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', color: '#1a1a1a' }}>{inv.client_name}</td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>{inv.issue_date}</td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>{inv.due_date}</td>
                      <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a', textAlign: 'right' }}>₦{Number(inv.total || 0).toLocaleString()}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: s.bg, color: s.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}>{inv.status || 'draft'}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* FAB */}
      {isMobile && (
        <div onClick={() => navigate('/invoices/new')} style={{ position: 'fixed', bottom: '80px', right: '20px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#CC0000', color: 'white', fontSize: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(204,0,0,0.4)', cursor: 'pointer', zIndex: 99 }}>+</div>
      )}

    </Layout>
  )
}
