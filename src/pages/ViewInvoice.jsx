import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'


function useIsMobile() {
  const [m, setM] = React.useState(window.innerWidth < 640)
  React.useEffect(() => { const h = () => setM(window.innerWidth < 640); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])
  return m
}
function useIsNarrow() {
  const [n, setN] = React.useState(window.innerWidth < 768)
  React.useEffect(() => { const h = () => setN(window.innerWidth < 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h) }, [])
  return n
}

export default function ViewInvoice() {
  const isMobile  = useIsMobile()
  const isNarrow  = useIsNarrow()
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [invoice, setInvoice]   = useState(null)
  const [items,   setItems]     = useState([])
  const [client,  setClient]    = useState(null)
  const [settings,setSettings]  = useState({})
  const [loading, setLoading]   = useState(true)
  const [showMore,setShowMore]  = useState(false)

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '', date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5), mode: 'Transfer', reference: '', type: 'full',
  })
  const [savingPayment, setSavingPayment] = useState(false)

  // PDF
  const [pdfGenerating, setPdfGenerating] = useState(false)

  // Project linking modal
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [projectLinkId, setProjectLinkId] = useState('')
  const [projectLinking, setProjectLinking] = useState(false)

  const moreRef = useRef()

  const fetchInvoice = async () => {
    const { data } = await supabase.from('invoices').select('*').eq('id', id).single()
    setInvoice(data)
    if (data?.client_id) {
      const { data: c } = await supabase.from('clients').select('*').eq('id', data.client_id).single()
      setClient(c || null)
    }
  }

  useEffect(() => {
    fetchInvoice()
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order').then(({ data }) => {
      const loaded = (data || []).map(item => ({
        ...item,
        custom_data: typeof item.custom_data === 'string' ? JSON.parse(item.custom_data || '{}') : (item.custom_data || {}),
        install_rate_override: !!(item.install_rate !== null && item.install_rate !== undefined && item.install_rate !== 0),
        vat_rate: (item.vat_rate === 0 || item.vat_rate === null) ? null : item.vat_rate,
        discount_rate: (item.discount_rate === 0 || item.discount_rate === null) ? null : item.discount_rate,
        image_url: item.image_url || null,
      }))
      setItems(loaded)
      setLoading(false)
    })
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => { if (data) setSettings(data) })
  }, [id])

  useEffect(() => {
    const handler = (e) => { if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (loading)  return <Layout title="Invoice"><p style={{ padding: 30 }}>Loading...</p></Layout>
  if (!invoice) return <Layout title="Invoice"><p style={{ padding: 30 }}>Invoice not found.</p></Layout>


  // ── Status helpers ──────────────────────────────────────────────────────────
  const statusColor = (status) => {
    if (status === 'paid')    return { bg: '#DCFCE7', color: '#16A34A' }
    if (status === 'sent')    return { bg: '#E8F0FB', color: '#0056B3' }
    if (status === 'overdue') return { bg: '#FEE2E2', color: '#CC0000' }
    return { bg: '#F5F5F5', color: '#555' }
  }
  const s = statusColor(invoice.status)

  // ── Lazy PDF download ───────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (pdfGenerating) return
    setPdfGenerating(true)
    try {
      const [{ pdf }, { default: InvoicePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/InvoicePDF'),
      ])
      const blob = await pdf(
        <InvoicePDF invoice={invoice} items={items} client={client} settings={settings} />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (invoice.invoice_number || 'invoice') + '.pdf'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
    } catch (err) {
      alert('PDF generation failed: ' + err.message)
    } finally {
      setPdfGenerating(false)
    }
  }

  // ── Status change ───────────────────────────────────────────────────────────
  const handleStatusChange = async (newStatus) => {
    if (newStatus === invoice.status) return
    await supabase.from('invoices').update({ status: newStatus }).eq('id', id)
    await fetchInvoice()
  }

  // ── Record Payment ──────────────────────────────────────────────────────────
  const handleRecordPayment = async () => {
    setSavingPayment(true)
    const amountPaid = paymentForm.type === 'full' ? invoice.total : Number(paymentForm.amount)
    const notes = `Payment recorded: ₦${amountPaid.toLocaleString()} via ${paymentForm.mode} on ${paymentForm.date} at ${paymentForm.time}${paymentForm.reference ? ` | Ref: ${paymentForm.reference}` : ''}`
    const newStatus = amountPaid >= invoice.total ? 'paid' : 'sent'
    await supabase.from('invoices').update({
      status: newStatus,
      notes: invoice.notes ? invoice.notes + '\n' + notes : notes,
    }).eq('id', id)
    await fetchInvoice()
    setSavingPayment(false)
    setShowPaymentModal(false)
  }

  // ── Clone (opens NewInvoice prefilled, client cleared) ──────────────────────
  const handleClone = async () => {
    setShowMore(false)
    try {
      const { data: all } = await supabase
        .from('invoices').select('invoice_number').like('invoice_number', 'SASINV-B%').order('created_at', { ascending: false })
      let nextNum = 1
      if (all && all.length > 0) {
        const nums = all.map(i => parseInt(i.invoice_number.replace('SASINV-B', ''))).filter(n => !isNaN(n))
        nextNum = Math.max(...nums) + 1
      }
      const newNumber = 'SASINV-B' + String(nextNum).padStart(3, '0')
      navigate('/invoices/new', {
        state: {
          prefill: {
            ...invoice,
            invoice_number: newNumber,
            client_id: null,
            client_name: '',
            status: 'draft',
            issue_date: new Date().toISOString().split('T')[0],
            due_date: null,
            // Strip thread/advance fields — clone is standalone
            thread_id: null, thread_role: null, thread_position: 1,
          },
          prefillItems: items.map(it => ({ ...it, id: null })),
        }
      })
    } catch (err) {
      alert('Clone failed: ' + err.message)
    }
  }


  // ── Misc More menu actions ──────────────────────────────────────────────────
  const handleConvertToQuote = () => { setShowMore(false); alert('Quotations module coming soon.') }
  const handleMarkSent       = () => { handleStatusChange('sent'); setShowMore(false) }

  // ── Delete invoice ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setShowMore(false)
    if (!window.confirm('Deleting is permanent and cannot be undone. You may choose to archive it instead. Archived invoices remain recoverable for 30 days.')) return
    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    await supabase.from('invoices').delete().eq('id', id)
    navigate('/invoices')
  }

  // ── Archive invoice ─────────────────────────────────────────────────────────
  const handleArchive = async () => {
    setShowMore(false)
    if (!window.confirm('This invoice will be hidden from your list and automatically deleted after 30 days if not restored. You can restore it from Settings anytime before then.')) return
    await supabase.from('invoices').update({ archived_at: new Date().toISOString() }).eq('id', id)
    navigate('/invoices')
  }


  // ── Custom fields ───────────────────────────────────────────────────────────
  let customFields = [], bottomFields = [], attachments = []
  try {
    const _cf = JSON.parse(invoice.custom_fields || '{}')
    if (Array.isArray(_cf)) { customFields = _cf }
    else { customFields = _cf.header || []; bottomFields = _cf.bottom || []; attachments = _cf.attachments || [] }
  } catch (e) { customFields = []; bottomFields = []; attachments = [] }

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white', color: '#1a1a1a' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }

  return (
    <Layout title={invoice.invoice_number}>
      <div style={{ maxWidth: '900px', width: '100%', boxSizing: 'border-box', padding: isNarrow ? '0' : undefined }}>

        {/* ── Record Payment Modal ── */}
        {showPaymentModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', color: '#1a1a1a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#1a1a1a' }}>Record Payment</h3>
                <span onClick={() => setShowPaymentModal(false)} style={{ cursor: 'pointer', fontSize: '22px', color: '#888', lineHeight: 1 }}>×</span>
              </div>
              <div style={{ backgroundColor: '#F0FDF4', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#555' }}>Invoice Total</span>
                <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#16A34A' }}>₦{Number(invoice.total || 0).toLocaleString()}</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Payment Type</label>
                <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  {['full', 'partial'].map(t => (
                    <div key={t} onClick={() => setPaymentForm(f => ({ ...f, type: t }))}
                      style={{ flex: 1, padding: '10px', textAlign: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', backgroundColor: paymentForm.type === t ? '#16A34A' : 'white', color: paymentForm.type === t ? 'white' : '#555', textTransform: 'capitalize' }}>
                      {t === 'full' ? 'Full Payment' : 'Partial Payment'}
                    </div>
                  ))}
                </div>
              </div>
              {paymentForm.type === 'partial' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Amount Paid (₦)</label>
                  <input style={inputStyle} type="number" min="0" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="Enter amount" />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div><label style={labelStyle}>Date</label><input style={inputStyle} type="date" value={paymentForm.date} onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} /></div>
                <div><label style={labelStyle}>Time</label><input style={inputStyle} type="time" value={paymentForm.time} onChange={e => setPaymentForm(f => ({ ...f, time: e.target.value }))} /></div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Payment Mode</label>
                <select style={inputStyle} value={paymentForm.mode} onChange={e => setPaymentForm(f => ({ ...f, mode: e.target.value }))}>
                  <option>Transfer</option><option>Cash</option><option>Cheque</option><option>POS</option><option>Online</option>
                </select>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Bank Reference / Alert No (optional)</label>
                <input style={inputStyle} value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} placeholder="e.g. 230615123456" />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontSize: '14px', color: '#555' }}>Cancel</div>
                <div onClick={handleRecordPayment} style={{ flex: 1, padding: '12px', backgroundColor: '#16A34A', color: 'white', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  {savingPayment ? 'Saving...' : 'Record Payment'}
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ── Action Bar ── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div onClick={() => navigate('/invoices')} style={{ padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', border: '1px solid #ddd', backgroundColor: 'white', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
            ← Invoices
          </div>
          {/* Linked Documents */}
          <div
            onClick={() => invoice.project_id ? navigate(`/projects/${invoice.project_id}`) : setShowProjectModal(true)}
            style={{ padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: '1px solid #BFDBFE', backgroundColor: invoice.project_id ? '#EFF6FF' : 'white', color: invoice.project_id ? '#1D4ED8' : '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🔗 {invoice.project_id ? 'Linked Documents' : 'Link to Project'}
          </div>
          <span style={{ backgroundColor: s.bg, color: s.color, padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', textTransform: 'capitalize' }}>
            {invoice.status || 'draft'}
          </span>
          {invoice.status === 'draft' && (
            <div onClick={() => handleStatusChange('sent')} style={{ padding: '8px 14px', borderRadius: '6px', backgroundColor: '#0056B3', color: 'white', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
              Mark as Sent
            </div>
          )}
          <div style={{ flex: 1 }} />
          <div onClick={handleDownloadPDF} style={{ padding: '10px 16px', borderRadius: '6px', cursor: pdfGenerating ? 'default' : 'pointer', fontSize: '14px', backgroundColor: '#0056B3', color: 'white', fontWeight: 'bold', opacity: pdfGenerating ? 0.7 : 1 }}>
            {pdfGenerating ? 'Preparing...' : '⬇ Download PDF'}
          </div>
          <div onClick={() => navigate('/invoices/edit/' + id)} style={{ padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: '#CC0000', color: 'white', fontWeight: 'bold' }}>
            Edit
          </div>
          <div ref={moreRef} style={{ position: 'relative' }}>
            <div onClick={() => setShowMore(p => !p)} style={{ padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', border: '1px solid #ddd', backgroundColor: 'white', fontWeight: '600', userSelect: 'none' }}>
              ••• More
            </div>
            {showMore && (
              <div style={{ position: 'absolute', top: '100%', right: 0, left: 'auto', marginTop: '6px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: '1px solid #eee', zIndex: 200, minWidth: '230px', overflow: 'hidden' }}>
                {[
                  { label: '💳 Record Payment',        action: () => { setShowMore(false); setShowPaymentModal(true) },           show: invoice.status !== 'paid' },
                  { label: '📋 Clone Invoice',          action: handleClone,                                                      show: true },
                  { label: '📄 Convert to Quotation',  action: handleConvertToQuote,                                             show: true },
                  { label: '🔧 Generate CSR',          action: () => { setShowMore(false); alert('Coming soon') },               show: true },
                  { label: '🚚 Generate Waybill',      action: () => { setShowMore(false); alert('Coming soon') },               show: true },
                  { label: invoice.status === 'draft' ? '✅ Mark as Sent' : null, action: handleMarkSent,                      show: invoice.status === 'draft' },
                  { label: '📦 Archive Invoice',       action: handleArchive,                                                    show: true },
                  { label: '🗑 Delete Invoice',        action: handleDelete,                                                     show: true, danger: true },
                ].filter(m => m.show && m.label).map((item, i) => (
                  <div key={i} onClick={item.action}
                    style={{ padding: '13px 18px', cursor: 'pointer', fontSize: '14px', color: item.danger ? '#CC0000' : '#1a1a1a', borderBottom: '1px solid #f5f5f5', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Thread Summary Card — shown when invoice belongs to a thread ── */}
        {hasThread && (
          <ThreadSummaryCard
            threadId={invoice.thread_id}
            currentInvoiceId={invoice.id}
            onCreateNext={handleCreateNextInvoice}
          />
        )}

        {/* ── Convert to Advance CTA — shown only on standalone standard invoices ── */}
        {isStandalone && (
          <div style={{ marginBottom: '24px', padding: '16px 20px', backgroundColor: '#F8FAFF', border: '1px dashed #BFDBFE', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1D4ED8', marginBottom: '2px' }}>Make this an Advance Invoice</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Convert to a job thread — track contract value, progress and balance invoices.</div>
            </div>
            <div onClick={() => setShowAdvanceModal(true)} style={{ padding: '8px 16px', backgroundColor: '#1D4ED8', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              Convert →
            </div>
          </div>
        )}

        {/* ── Invoice Preview ── */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: isNarrow ? '16px' : '40px', overflowX: 'auto' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ color: '#CC0000', fontWeight: 'bold', fontSize: '22px', marginBottom: '4px' }}>SUN & SHIELD POWER SOLUTIONS</div>
              <div style={{ color: '#555', fontSize: '12px' }}>Generator Sales | Maintenance | Installation | Rental | Facility Management</div>
              <div style={{ color: '#555', fontSize: '12px' }}>Lagos, Nigeria</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#CC0000', fontWeight: 'bold', fontSize: '20px', marginBottom: '4px' }}>{invoice.document_type || 'INVOICE'}</div>
              {invoice.thread_role === 'advance' && (
                <div style={{ display: 'inline-block', backgroundColor: '#F59E0B', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '3px 12px', borderRadius: '20px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Advance Invoice
                </div>
              )}
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>{invoice.invoice_number}</div>
              <div style={{ fontSize: '12px', color: '#555' }}>Date: {invoice.issue_date}</div>
              {invoice.due_date && <div style={{ fontSize: '12px', color: '#555' }}>Due: {invoice.due_date}</div>}
            </div>
          </div>

          <div style={{ borderBottom: '2px solid #CC0000', marginBottom: '24px' }} />

          <div style={{ display: 'flex', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Bill To</div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '4px' }}>{invoice.client_name}</div>
              {client?.contact_person && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>Attn: {client.contact_person}</div>}
              {client?.phone && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>{client.phone}</div>}
              {client?.email && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>{client.email}</div>}
              {client?.address && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>{client.address}</div>}
              {client?.city && <div style={{ fontSize: '13px', color: '#555', marginBottom: '2px' }}>{client.city}{client.state ? ', ' + client.state : ''}</div>}
            </div>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Details</div>
              {invoice.job_title && <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1D4ED8', marginBottom: '6px' }}>Job: {invoice.job_title}</div>}
              {invoice.payment_terms && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>Payment Terms: {invoice.payment_terms}</div>}
              {invoice.work_duration && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>Work Duration: {invoice.work_duration}</div>}
              {customFields.filter(f => f.label && f.value).map((f, i) => (
                <div key={i} style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>{f.label}: {f.value}</div>
              ))}
            </div>
          </div>

          {/* Mobile items */}
          {isNarrow && (
            <div style={{ marginBottom: '24px' }}>
              {(() => {
                let stdCount = 0
                return items.map((item, index) => {
                  if (item.row_type === 'standard') stdCount++
                  const n = stdCount
                  if (item.row_type === 'group_header') {
                    return (
                      <div key={index} style={{ backgroundColor: '#333', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', color: 'white', fontWeight: 'bold', fontSize: '13px' }}>
                        {item.group_name}
                      </div>
                    )
                  }
                  return (
                    <div key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', border: '1px solid #eee', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '11px', color: '#999', fontWeight: '700', marginRight: '6px' }}>{n}.</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>{item.description}</span>
                          {item.sub_description && <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '2px' }}>{item.sub_description}</div>}
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#CC0000', whiteSpace: 'nowrap', marginLeft: '10px' }}>
                          ₦{Number(item.amount || item.quantity * item.unit_price || 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        {item.make && <span style={{ fontSize: '11px', backgroundColor: '#f0f0f0', borderRadius: '4px', padding: '2px 8px', color: '#555' }}>Make: {item.make}</span>}
                        <span style={{ fontSize: '11px', backgroundColor: '#f0f0f0', borderRadius: '4px', padding: '2px 8px', color: '#555' }}>Qty: {item.quantity}{item.unit ? ' ' + item.unit : ''}</span>
                        <span style={{ fontSize: '11px', backgroundColor: '#f0f0f0', borderRadius: '4px', padding: '2px 8px', color: '#555' }}>₦{Number(item.unit_price || 0).toLocaleString()} / unit</span>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}

          {/* Desktop table */}
          <div style={{ display: isNarrow ? 'none' : 'block', overflowX: 'auto', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '500px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a1a1a' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: 'white', width: '32px' }}>#</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'white' }}>Description</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'white' }}>Make</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white' }}>Qty</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: 'white' }}>Unit</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'white' }}>Unit Price</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'white' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let stdCount = 0
                  return items.map((item, index) => {
                    if (item.row_type === 'standard') stdCount++
                    return item.row_type === 'group_header' ? (
                      <tr key={index} style={{ backgroundColor: '#333' }}>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#888' }}>—</td>
                        <td colSpan={6} style={{ padding: '10px 14px', fontWeight: 'bold', color: 'white', fontSize: '13px' }}>{item.group_name}</td>
                      </tr>
                    ) : (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#999', fontSize: '12px', fontWeight: '700' }}>{stdCount}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ color: '#1a1a1a', fontWeight: '500' }}>{item.description}</div>
                          {item.sub_description && <div style={{ fontSize: '11px', color: '#888', fontStyle: 'italic', marginTop: '2px' }}>{item.sub_description}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#555' }}>{item.make || '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#555' }}>{item.unit || '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right' }}>₦{Number(item.unit_price || 0).toLocaleString()}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 'bold' }}>₦{Number(item.amount || item.quantity * item.unit_price || 0).toLocaleString()}</td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <div style={{ width: '320px' }}>
              {[
                { label: 'Subtotal',       value: invoice.subtotal },
                { label: 'VAT',            value: invoice.vat },
                { label: 'Workmanship',    value: invoice.workmanship },
                { label: 'Transportation', value: invoice.transportation },
                { label: 'Shipping',       value: invoice.shipping },
                { label: 'Discount',       value: invoice.discount, negative: true },
              ].filter(r => Number(r.value) > 0).map(({ label, value, negative }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#555' }}>{label}</span>
                  <span style={{ color: negative ? '#CC0000' : '#1a1a1a' }}>{negative ? '-' : ''}₦{Number(value || 0).toLocaleString()}</span>
                </div>
              ))}

              {/* Advance mode totals */}
              {invoice.thread_role === 'advance' && invoice.total_contract_value > 0 ? (
                <>
                  <div style={{ borderTop: '2px solid #1a1a1a', paddingTop: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#555' }}>Total Project Value</span>
                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1a1a1a' }}>₦{Number(invoice.total_contract_value).toLocaleString()}</span>
                  </div>
                  <div style={{ backgroundColor: '#FEF3C7', border: '2px dashed #F59E0B', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#92400E' }}>
                      {invoice.advance_mode === 'percent' && invoice.advance_value
                        ? `${invoice.advance_value}% Advance Due`
                        : 'Advance Due Now'}
                    </span>
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#B45309' }}>₦{Number(invoice.total || 0).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <div style={{ borderTop: '2px solid #1a1a1a', paddingTop: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>TOTAL (NGN)</span>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#CC0000' }}>₦{Number(invoice.total || 0).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {invoice.amount_in_words && (
            <div style={{ backgroundColor: '#f9f9f9', padding: '12px', borderLeft: '3px solid #CC0000', marginBottom: '24px', fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
              {invoice.amount_in_words}
            </div>
          )}

          {/* Balance note for advance invoices */}
          {invoice.thread_role === 'advance' && invoice.total_contract_value > 0 && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '13px', color: '#1D4ED8' }}>
              Balance of {invoice.advance_mode === 'percent' && invoice.advance_value ? `${100 - invoice.advance_value}%` : ''} (₦{Math.max(0, Number(invoice.total_contract_value) - Number(invoice.total || 0)).toLocaleString()}) due upon project completion.
            </div>
          )}

          {invoice.notes && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Notes</div>
              <div style={{ fontSize: '13px', color: '#555', whiteSpace: 'pre-line' }}>{invoice.notes}</div>
            </div>
          )}
          {invoice.terms && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Terms & Conditions</div>
              <div style={{ fontSize: '13px', color: '#555' }}>{invoice.terms}</div>
            </div>
          )}

          {attachments.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Supporting Documents</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {attachments.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', backgroundColor: '#f8f9ff', borderRadius: '8px', border: '1px solid #e0e8ff', textDecoration: 'none', color: '#1a1a1a' }}>
                    <span style={{ fontSize: '18px' }}>📎</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0056B3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.label || att.name}</div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6366F1', flexShrink: 0 }}>↗ Open</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>Payment Terms</div>
              <div style={{ fontSize: '12px', color: '#555' }}>{invoice.payment_terms || 'Net 30'}</div>
            </div>
            {settings.signature_url ? (
              <div style={{ textAlign: 'center' }}>
                <img src={settings.signature_url} alt="Signature" style={{ height: '50px', maxWidth: '160px', objectFit: 'contain', display: 'block', marginBottom: '4px' }} />
                <div style={{ borderTop: '1px solid #333', paddingTop: '4px', fontSize: '11px', color: '#555', width: '160px' }}>Authorised Signature</div>
              </div>
            ) : (
              <div style={{ width: '200px', borderTop: '1px solid #333', paddingTop: '6px', marginTop: '30px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#555' }}>Authorised Signature</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Link to Project Modal ── */}
        {showProjectModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 12px 50px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Link to Project</h3>
                <span onClick={() => { setShowProjectModal(false); setProjectLinkId('') }} style={{ cursor: 'pointer', fontSize: '20px', color: '#aaa', lineHeight: 1 }}>×</span>
              </div>
              <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                Enter a Project ID to link this invoice, or go to Projects to create a new one.
              </p>
              <div style={{ marginBottom: '14px' }}>
                <input
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  value={projectLinkId}
                  onChange={e => setProjectLinkId(e.target.value)}
                  placeholder="Paste Project ID (UUID)"
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button onClick={() => { setShowProjectModal(false); setProjectLinkId('') }} style={{ flex: 1, padding: '10px', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', fontSize: '13px', color: '#64748B', cursor: 'pointer' }}>Cancel</button>
                <button
                  disabled={projectLinking}
                  onClick={async () => {
                    if (!projectLinkId.trim()) return
                    setProjectLinking(true)
                    const { error } = await supabase.from('invoices').update({ project_id: projectLinkId.trim() }).eq('id', id)
                    setProjectLinking(false)
                    if (error) { alert('Failed to link: ' + error.message); return }
                    setShowProjectModal(false)
                    setProjectLinkId('')
                    await fetchInvoice()
                  }}
                  style={{ flex: 2, padding: '10px', border: 'none', borderRadius: '8px', background: projectLinking ? '#94A3B8' : '#0F172A', fontSize: '13px', color: 'white', cursor: projectLinking ? 'not-allowed' : 'pointer', fontWeight: '700' }}
                >
                  {projectLinking ? 'Linking...' : 'Link Invoice'}
                </button>
              </div>
              <button onClick={() => { setShowProjectModal(false); navigate('/projects') }} style={{ width: '100%', padding: '9px', border: '1px solid #BFDBFE', borderRadius: '8px', background: '#EFF6FF', fontSize: '13px', color: '#1D4ED8', cursor: 'pointer', fontWeight: '600' }}>
                Go to Projects →
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
