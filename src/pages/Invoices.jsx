import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [openMenuId, setOpenMenuId] = useState(null)
  const menuRef = useRef({})

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

  const handleDelete = async (inv, e) => {
    e.stopPropagation()
    setOpenMenuId(null)
    if (!window.confirm('Delete ' + inv.invoice_number + '? This cannot be undone.')) return
    await supabase.from('invoice_items').delete().eq('invoice_id', inv.id)
    await supabase.from('invoices').delete().eq('id', inv.id)
    setInvoices(prev => prev.filter(i => i.id !== inv.id))
  }

  const handleDuplicate = async (inv, e) => {
    e.stopPropagation()
    setOpenMenuId(null)
    const { data: itemsData } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id)
    const { data: allInvs } = await supabase.from('invoices').select('invoice_number').like('invoice_number', 'SASINV-B%').order('created_at', { ascending: false })
    const nums = (allInvs || []).map(i => parseInt(i.invoice_number.replace('SASINV-B', ''))).filter(n => !isNaN(n))
    const newNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1
    const newNumber = 'SASINV-B' + String(newNum).padStart(3, '0')
    const { id: _id, created_at: _ca, ...fields } = inv
    navigate('/invoices/new', { state: { prefill: { ...fields, invoice_number: newNumber, status: 'draft', client_id: '', client_name: '' }, prefillItems: itemsData || [] } })
  }

  const toggleMenu = (id, e) => {
    e.stopPropagation()
    setOpenMenuId(prev => prev === id ? null : id)
  }

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!Object.values(menuRef.current).some(el => el && el.contains(e.target))) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const ActionMenu = ({ inv, index }) => {
    const isOpen = openMenuId === inv.id
    const s = statusColor(inv.status)
    return (
      <div ref={el => menuRef.current[inv.id] = el} style={{ position: 'relative', display: 'inline-block' }}
        onClick={e => e.stopPropagation()}>
        <div onClick={(e) => toggleMenu(inv.id, e)}
          style={{ width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: isOpen ? '#f0f0f0' : 'transparent', fontSize: '18px', color: '#555', fontWeight: 'bold', userSelect: 'none' }}>
          ···
        </div>
        {isOpen && (
          <div style={{ position: 'absolute', right: 0, top: '36px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #eee', zIndex: 500, minWidth: '180px', overflow: 'hidden' }}>
            {[
              { label: '👁 View', action: (e) => { e.stopPropagation(); setOpenMenuId(null); navigate('/invoices/' + inv.id) } },
              { label: '✏️ Edit', action: (e) => { e.stopPropagation(); setOpenMenuId(null); navigate('/invoices/' + inv.id + '/edit') } },
              { label: '📋 Duplicate', action: (e) => handleDuplicate(inv, e) },
              { label: '🗑 Delete', action: (e) => handleDelete(inv, e), danger: true },
            ].map(item => (
              <div key={item.label} onClick={item.action}
                style={{ padding: '11px 16px', cursor: 'pointer', fontSize: '13px', color: item.danger ? '#CC0000' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: item.label === '📋 Duplicate' ? '1px solid #f0f0f0' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = item.danger ? '#FFF5F5' : '#f8f8f8'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

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
            filtered.map((inv, index) => (
              <div key={inv.id} style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #EBEBEB', overflow: 'hidden' }}>
                <div onClick={() => navigate('/invoices/' + inv.id)} style={{ padding: '16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', color: '#CC0000', fontSize: '14px' }}>{inv.invoice_number}</span>
                    <span style={{ fontWeight: '700', color: '#1a1a1a' }}>NGN {Number(inv.total || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a1a', marginBottom: '6px' }}>{inv.client_name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#888', fontSize: '12px' }}>{inv.issue_date || inv.date}</span>
                    <span style={{ backgroundColor: statusColor(inv.status).bg, color: statusColor(inv.status).color, padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{inv.status || 'draft'}</span>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 16px', display: 'flex', gap: '6px', justifyContent: 'flex-end', backgroundColor: '#fafafa' }}>
                  <div onClick={() => navigate('/invoices/' + inv.id + '/edit')} style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', backgroundColor: 'white', color: '#1a1a1a' }}>✏️ Edit</div>
                  <div onClick={(e) => handleDuplicate(inv, e)} style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #ddd', cursor: 'pointer', backgroundColor: 'white', color: '#1a1a1a' }}>📋 Copy</div>
                  <div onClick={(e) => handleDelete(inv, e)} style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #FEE2E2', cursor: 'pointer', backgroundColor: '#FFF5F5', color: '#CC0000' }}>🗑 Delete</div>
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
                {['Invoice No', 'Client', 'Date', 'Due Date', 'Amount', 'Status', ''].map((h, i) => (
                  <th key={h+i} style={{ padding: '14px 20px', textAlign: i === 4 ? 'right' : i === 5 ? 'center' : 'left', color: 'white', fontSize: '13px', width: i === 6 ? '52px' : 'auto' }}>{h}</th>
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
                    <tr key={inv.id}
                      style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F4FF'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white'}
                    >
                      <td onClick={() => navigate('/invoices/' + inv.id)} style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 'bold', color: '#CC0000', cursor: 'pointer' }}>{inv.invoice_number}</td>
                      <td onClick={() => navigate('/invoices/' + inv.id)} style={{ padding: '14px 20px', fontSize: '14px', color: '#1a1a1a', cursor: 'pointer' }}>{inv.client_name}</td>
                      <td onClick={() => navigate('/invoices/' + inv.id)} style={{ padding: '14px 20px', fontSize: '14px', color: '#555', cursor: 'pointer' }}>{inv.issue_date}</td>
                      <td onClick={() => navigate('/invoices/' + inv.id)} style={{ padding: '14px 20px', fontSize: '14px', color: '#555', cursor: 'pointer' }}>{inv.due_date}</td>
                      <td onClick={() => navigate('/invoices/' + inv.id)} style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a', textAlign: 'right', cursor: 'pointer' }}>NGN {Number(inv.total || 0).toLocaleString()}</td>
                      <td onClick={() => navigate('/invoices/' + inv.id)} style={{ padding: '14px 20px', textAlign: 'center', cursor: 'pointer' }}>
                        <span style={{ backgroundColor: s.bg, color: s.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}>{inv.status || 'draft'}</span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <ActionMenu inv={inv} index={index} />
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
