import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { buildInvoiceCsv, downloadInvoiceCsv } from '../components/invoice/exportInvoiceCsv'
import { toDbItem } from '@/domain/invoice'
import {
  buildTrailLink,
  parseDocumentCustomFields,
  toQuotationItemRow,
  withSourceTrail,
} from '@/domain/documentConversion'
import { getNextQuotationNumber } from '@/domain/quotation'
import { computeDocument } from '@/lib/Calculations'

const TEMPLATES = [
  { id: 'classic',  label: 'Classic',  description: 'Navy · Minimal' },
  { id: 'proforma', label: 'Proforma', description: 'Green · Centered' },
  { id: 'bold',     label: 'Bold',     description: 'Dark band · Strong' },
  { id: 'compact',  label: 'Compact',  description: 'Tight · Dense' },
]

function TemplateSelector() {
  const [active, setActive] = useState(() => {
    try { return localStorage.getItem('invoice_pdf_template') || 'classic' } catch { return 'classic' }
  })
  const handleSelect = (id) => {
    setActive(id)
    try { localStorage.setItem('invoice_pdf_template', id) } catch {}
  }
  return (
    <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>PDF Template</div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        {TEMPLATES.map(t => {
          const on = active === t.id
          return (
            <div key={t.id} onClick={() => handleSelect(t.id)} style={{ flexShrink: 0, width: 130, border: `2px solid ${on ? '#0F172A' : '#E2E8F0'}`, borderRadius: 12, padding: '14px 12px', backgroundColor: on ? '#0F172A' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
              <div style={{ height: 36, borderRadius: 4, marginBottom: 8, overflow: 'hidden', background: on ? '#1E3A5F' : '#F1F5F9', display: 'flex', flexDirection: 'column', gap: 2, padding: 4 }}>
                {t.id === 'classic'  && <><div style={{ height: 5, background: on ? '#3B82F6' : '#0F172A', borderRadius: 2 }}/><div style={{ height: 2, background: on ? '#475569' : '#CBD5E1', borderRadius: 1 }}/><div style={{ height: 2, background: on ? '#475569' : '#CBD5E1', borderRadius: 1, width: '70%' }}/></>}
                {t.id === 'proforma' && <><div style={{ height: 5, background: '#16A34A', borderRadius: 2, alignSelf: 'center', width: '80%' }}/><div style={{ height: 2, background: '#86EFAC', borderRadius: 1, alignSelf: 'center', width: '50%' }}/><div style={{ height: 2, background: '#BBF7D0', borderRadius: 1, alignSelf: 'center', width: '40%' }}/></>}
                {t.id === 'bold'     && <><div style={{ height: 14, background: '#0F172A', borderRadius: '2px 2px 0 0', margin: -4, marginBottom: 2 }}/><div style={{ height: 2, background: '#3B82F6' }}/><div style={{ height: 2, background: on ? '#93C5FD' : '#CBD5E1', borderRadius: 1, marginTop: 2 }}/></>}
                {t.id === 'compact'  && <><div style={{ height: 2, background: on ? '#94A3B8' : '#1E293B', borderRadius: 1 }}/><div style={{ height: 1.5, background: on ? '#475569' : '#E2E8F0', borderRadius: 1 }}/><div style={{ height: 1.5, background: on ? '#475569' : '#E2E8F0', borderRadius: 1 }}/><div style={{ height: 1.5, background: on ? '#475569' : '#E2E8F0', borderRadius: 1 }}/><div style={{ height: 1.5, background: on ? '#475569' : '#E2E8F0', borderRadius: 1 }}/></>}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: on ? 'white' : '#0F172A', marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: 10, color: on ? '#94A3B8' : '#64748B' }}>{t.description}</div>
              {on && <div style={{ marginTop: 5, fontSize: 9, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>Active</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

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
  const [converting, setConverting] = useState(false)

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

  const companyName = settings.company_name || ''
  const companyTagline = settings.company_tagline || ''
  const companyCity = settings.company_city || ''
  const companyAddress = settings.company_address || ''
  const companyPhone = settings.company_phone || ''
  const companyEmail = settings.company_email || ''
  const companyIdentityLines = [companyAddress, companyCity, companyPhone, companyEmail].filter(Boolean)
  const hasCompanyIdentity = Boolean(companyName || companyTagline || companyIdentityLines.length)
  const poNumber = String(invoice.po_number || '').trim()
  const safeInvoiceNotes = invoice.notes ? DOMPurify.sanitize(invoice.notes) : ''
  const safeInvoiceTerms = invoice.terms ? DOMPurify.sanitize(invoice.terms) : ''
  const statusLabel = String(invoice.status || 'draft')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())


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
      const cf = parseDocumentCustomFields(invoice.custom_fields || customFieldObject)
      const computedResult = computeDocument({
        items,
        document: invoice,
        cf,
      })
      const [{ pdf }, { default: InvoicePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/InvoicePDF'),
      ])
      const blob = await pdf(
        <InvoicePDF document={invoice} items={items} client={client} settings={settings} computedResult={computedResult} />
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

  const handleDownloadCsv = () => {
    const csv = buildInvoiceCsv({
      invoice,
      items,
      totals: {
        rawSubtotal: Number(invoice.subtotal || 0),
        installRateTotal: Number(invoice.install_rate_total || 0),
        vatAmount: Number(invoice.vat || 0),
        discountAmount: Number(invoice.discount || 0),
        whtAmount: Number(invoice.wht || 0),
        totalPayable: Number(invoice.total || 0),
      },
    })
    downloadInvoiceCsv(`${invoice.invoice_number || 'invoice'}.csv`, csv)
    setShowMore(false)
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
  const handleConvertToQuote = async () => {
    if (converting) return
    setShowMore(false)
    setConverting(true)
    try {
      const [{ data: quotationRows }, { data: latestInvoice }] = await Promise.all([
        supabase.from('quotations').select('quotation_number'),
        supabase.from('invoices').select('custom_fields').eq('id', id).single(),
      ])

      const nextQuotationNumber = getNextQuotationNumber((quotationRows || []))
      const sourceInvoiceFields = parseDocumentCustomFields(latestInvoice?.custom_fields || customFieldObject)
      const poValue = poNumber || null
      const sourceLink = buildTrailLink({
        id: invoice.id,
        type: 'invoice',
        number: invoice.invoice_number,
        project_id: invoice.project_id || null,
        po_number: poValue,
      })

      const quotationCustomFields = withSourceTrail(
        {
          ...sourceInvoiceFields,
          quotationTitle: invoice.invoice_title || '',
          clientName: invoice.client_name || '',
          notesHtml: invoice.notes || '',
          termsHtml: invoice.terms || '',
        },
        sourceLink,
      )

      const quotationPayload = {
        quotation_number: nextQuotationNumber,
        po_number: poValue,
        quotation_title: invoice.invoice_title || null,
        client_id: invoice.client_id || null,
        client_name: invoice.client_name || '',
        project_id: invoice.project_id || null,
        issue_date: invoice.issue_date || new Date().toISOString().split('T')[0],
        valid_until: invoice.due_date || null,
        status: 'draft',
        notes: invoice.notes || '',
        terms: invoice.terms || '',
        workmanship: Number(invoice.workmanship || 0),
        transportation: Number(invoice.transportation || 0),
        shipping: Number(invoice.shipping || 0),
        discount: Number(invoice.discount || 0),
        vat: Number(invoice.vat || 0),
        wht: Number(invoice.wht || 0),
        subtotal: Number(invoice.subtotal || 0),
        install_rate_total: Number(invoice.install_rate_total || 0),
        total: Number(invoice.total || 0),
        amount_in_words: invoice.amount_in_words || '',
        custom_fields: JSON.stringify(quotationCustomFields),
      }

      const { data: createdQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([quotationPayload])
        .select()
        .single()

      if (quotationError || !createdQuotation) throw new Error(quotationError?.message || 'Failed to create quotation')

      const itemRows = items
        .filter((item) =>
          item.row_type === 'group_header'
            ? item.group_name?.trim()
            : item.description?.trim(),
        )
        .map((item, index) => toQuotationItemRow(item, createdQuotation.id, index))

      if (itemRows.length > 0) {
        const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
        if (itemError) {
          await supabase.from('quotations').delete().eq('id', createdQuotation.id)
          throw new Error(itemError.message)
        }
      }

      const { error: deleteItemsError } = await supabase.from('invoice_items').delete().eq('invoice_id', id)
      if (deleteItemsError) {
        await supabase.from('quotation_items').delete().eq('quotation_id', createdQuotation.id)
        await supabase.from('quotations').delete().eq('id', createdQuotation.id)
        throw new Error(deleteItemsError.message)
      }

      const { error: deleteInvoiceError } = await supabase.from('invoices').delete().eq('id', id)
      if (deleteInvoiceError) {
        await supabase.from('invoice_items').insert(
          items
            .filter((item) =>
              item.row_type === 'group_header'
                ? item.group_name?.trim()
                : item.description?.trim(),
            )
            .map((item, index) => toDbItem(item, id, index)),
        )
        await supabase.from('quotation_items').delete().eq('quotation_id', createdQuotation.id)
        await supabase.from('quotations').delete().eq('id', createdQuotation.id)
        throw new Error(deleteInvoiceError.message)
      }

      navigate(`/quotations/${createdQuotation.id}`)
    } catch (err) {
      alert('Convert to quotation failed: ' + ((err && err.message) || 'Unknown error'))
    } finally {
      setConverting(false)
    }
  }
  const handleMarkSent       = () => { handleStatusChange('sent'); setShowMore(false) }

  // ── Delete invoice ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setShowMore(false)
    if (!window.confirm('Deleting is permanent and cannot be undone. You can archive it instead and restore it later from Settings > Archives.')) return
    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    await supabase.from('invoices').delete().eq('id', id)
    navigate('/invoices')
  }

  // ── Archive invoice ─────────────────────────────────────────────────────────
  const handleArchive = async () => {
    setShowMore(false)
    if (!window.confirm('This invoice will be hidden from your active list until you restore it from Settings > Archives.')) return
    await supabase.from('invoices').update({ archived_at: new Date().toISOString() }).eq('id', id)
    navigate('/invoices')
  }


  // ── Custom fields ───────────────────────────────────────────────────────────
  let customFields = [], bottomFields = [], attachments = []
  let customFieldObject = {}
  try {
    const _cf = JSON.parse(invoice.custom_fields || '{}')
    customFieldObject = Array.isArray(_cf) ? { header: _cf } : (_cf || {})
    if (Array.isArray(_cf)) { customFields = _cf }
    else { customFields = _cf.header || []; bottomFields = _cf.bottom || []; attachments = _cf.attachments || [] }
  } catch (e) { customFields = []; bottomFields = []; attachments = []; customFieldObject = {} }
  const topHeaderFields = customFields.filter(f => f.label && f.value)
  const conversionTrail = customFieldObject.conversionTrail || {}

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
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', alignItems: 'center', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingBottom: '2px' }}>
          <div onClick={() => navigate('/invoices')} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>
            ← Back
          </div>
          <span style={{ flexShrink: 0, fontSize: '13px', fontWeight: '700', color: '#111827', whiteSpace: 'nowrap' }}>{invoice.invoice_number}</span>
          <span style={{ flexShrink: 0, backgroundColor: s.bg, color: s.color, padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {invoice.status || 'draft'}
          </span>
          <div style={{ flex: 1, minWidth: 4 }} />
          <div onClick={handleDownloadPDF} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '6px', cursor: pdfGenerating ? 'default' : 'pointer', fontSize: '13px', backgroundColor: '#0F172A', color: 'white', fontWeight: '600', opacity: pdfGenerating ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {pdfGenerating ? 'Preparing…' : '↓ PDF'}
          </div>
          <div onClick={() => navigate('/invoices/edit/' + id)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap' }}>
            Edit
          </div>
          <div ref={moreRef} style={{ position: 'relative', flexShrink: 0 }}>
            <div onClick={() => setShowMore(p => !p)} style={{ padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: '1px solid #e2e8f0', backgroundColor: 'white', fontWeight: '600', userSelect: 'none', color: '#374151', letterSpacing: '0.05em' }}>
              ···
            </div>
            {showMore && (
              <div style={{ position: 'absolute', top: '100%', right: 0, left: 'auto', marginTop: '4px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0', zIndex: 200, minWidth: '220px', overflow: 'hidden' }}>
                {[
                  { label: invoice.project_id ? 'Open Linked Documents' : 'Link to Project', action: () => { setShowMore(false); invoice.project_id ? navigate(`/projects/${invoice.project_id}`) : setShowProjectModal(true) }, show: true },
                  { label: '💳 Record Payment',        action: () => { setShowMore(false); setShowPaymentModal(true) },           show: invoice.status !== 'paid' },
                  { label: '📄 Export CSV',            action: handleDownloadCsv,                                                show: true },
                  { label: '📋 Clone Invoice',          action: handleClone,                                                      show: true },
                  { label: converting ? '⏳ Converting to Quotation...' : '📄 Convert to Quotation',  action: handleConvertToQuote, show: true },
                  { label: '🔧 Generate CSR',          action: () => { setShowMore(false); alert('Coming soon') },               show: true },
                  { label: '🚚 Generate Waybill',      action: () => { setShowMore(false); alert('Coming soon') },               show: true },
                  { label: invoice.status === 'draft' ? '✅ Mark as Sent' : null, action: handleMarkSent,                      show: invoice.status === 'draft' },
                  { label: '📦 Archive Invoice',       action: handleArchive,                                                    show: true },
                  { label: '🗑 Delete Invoice',        action: handleDelete,                                                     show: true, danger: true },
                ].filter(m => m.show && m.label).map((item, i) => (
                  <div key={i} onClick={item.action}
                    style={{ padding: '10px 16px', cursor: converting && item.label.includes('Converting') ? 'default' : 'pointer', fontSize: '13px', color: item.danger ? '#CC0000' : '#1a1a1a', borderBottom: '1px solid #f5f5f5', transition: 'background 0.1s', opacity: converting && item.label.includes('Converting') ? 0.7 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: isNarrow ? '1fr' : 'minmax(0,1fr) 240px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: '1fr' }}>

            {/* Client */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '11px 12px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px' }}>Client</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', lineHeight: 1.3 }}>{invoice.client_name || 'Unassigned'}</div>
              {client?.contact_person && <div style={{ marginTop: '3px', fontSize: '12px', color: '#64748b' }}>{client.contact_person}</div>}
              {client?.email && <div style={{ fontSize: '12px', color: '#64748b' }}>{client.email}</div>}
              {client?.phone && <div style={{ fontSize: '12px', color: '#64748b' }}>{client.phone}</div>}
            </div>

            {/* Conversion Trail */}
            {(conversionTrail?.source?.number || (conversionTrail?.derived || []).length > 0) && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '11px 12px', gridColumn: isNarrow ? 'auto' : '1 / span 2' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px' }}>Conversion Trail</div>
                <div style={{ display: 'grid', gap: '4px', fontSize: '12px', color: '#475569' }}>
                  {conversionTrail?.source?.number ? (
                    <button
                      type="button"
                      onClick={() => conversionTrail.source.id ? navigate(`/quotations/${conversionTrail.source.id}`) : null}
                      style={{ textAlign: 'left', color: '#1d4ed8', background: 'transparent', border: 'none', padding: 0, cursor: conversionTrail.source.id ? 'pointer' : 'default', fontSize: '12px', fontWeight: '600' }}
                    >
                      Source Quotation: {conversionTrail.source.number}
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Document Identity */}
          <div style={{ border: '1px solid #0f172a', borderRadius: '8px', backgroundColor: '#0f172a', padding: '11px 12px', color: 'white' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '6px' }}>Document Identity</div>
            <div style={{ fontSize: '17px', fontWeight: '700', lineHeight: 1.3 }}>{companyName || (invoice.document_type || 'INVOICE')}</div>
            {companyTagline ? <div style={{ marginTop: '3px', fontSize: '12px', color: '#cbd5e1' }}>{companyTagline}</div> : null}
            {companyIdentityLines.length > 0 && (
              <div style={{ marginTop: '8px', display: 'grid', gap: '2px', fontSize: '11px', color: '#94a3b8' }}>
                {companyIdentityLines.map((line) => <div key={line}>{line}</div>)}
              </div>
            )}
          </div>
        </div>

        {/* ── Invoice Preview ── */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: isNarrow ? '16px' : '40px', overflowX: 'auto' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
            {hasCompanyIdentity ? (
              <div>
                {companyName ? <div style={{ color: '#CC0000', fontWeight: 'bold', fontSize: '22px', marginBottom: '4px' }}>{companyName}</div> : null}
                {companyTagline ? <div style={{ color: '#555', fontSize: '12px' }}>{companyTagline}</div> : null}
                {companyIdentityLines.map((line) => (
                  <div key={line} style={{ color: '#555', fontSize: '12px' }}>{line}</div>
                ))}
              </div>
            ) : <div />}
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#CC0000', fontWeight: 'bold', fontSize: '20px', marginBottom: '4px' }}>{invoice.document_type || 'INVOICE'}</div>
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
              {invoice.issue_date && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>Issued: {invoice.issue_date}</div>}
              {poNumber && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>P.O.: {poNumber}</div>}
              {invoice.payment_terms && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>Payment Terms: {invoice.payment_terms}</div>}
              {invoice.work_duration && <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>Work Duration: {invoice.work_duration}</div>}
              {topHeaderFields.map((field, index) => (
                field.label && field.value
                  ? <div key={`${field.label}-${index}`} style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>{field.label}: {field.value}</div>
                  : null
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

              {/* Grand total */}
              <div style={{ borderTop: '2px solid #1a1a1a', paddingTop: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>TOTAL (NGN)</span>
                <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#CC0000' }}>₦{Number(invoice.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {invoice.amount_in_words && (
            <div style={{ backgroundColor: '#f9f9f9', padding: '12px', borderLeft: '3px solid #CC0000', marginBottom: '24px', fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
              {invoice.amount_in_words}
            </div>
          )}

          {invoice.notes && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Notes</div>
              <div
                dangerouslySetInnerHTML={{ __html: safeInvoiceNotes }}
                style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}
              />
            </div>
          )}
          {invoice.terms && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0056B3', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Terms & Conditions</div>
              <div
                dangerouslySetInnerHTML={{ __html: safeInvoiceTerms }}
                style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}
              />
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

        {/* ── PDF Template Selector ── */}
        <TemplateSelector />

      </div>
    </Layout>
  )
}
