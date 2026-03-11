import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import UnitInput from '../components/UnitInput'
import RichTextEditor from '../components/RichTextEditor'
import ClientSelector from '../components/ClientSelector'
import ColumnManager from '../components/ColumnManager'
import ItemImageUpload from '../components/ItemImageUpload'
import AttachmentsPanel from '../components/AttachmentsPanel'
import ThreadInitPanel from '../components/ThreadInitPanel'
import MobileItemCard from '../components/MobileItemCard'
import { BUILTIN_COLUMNS, makeEmptyItem, makeEmptyGroup, toDbItem, useInvoiceColumns, calcTotals } from '../components/useInvoiceColumns.jsx'
import { generateThreadId, fmtN } from '../hooks/useInvoiceThread'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsNarrow(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isNarrow
}

export default function NewInvoice() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = location.state?.prefill
  const prefillItems = location.state?.prefillItems
  const threadDefaults = location.state?.threadDefaults

  const [saving, setSaving] = useState(false)
  const [discountType, setDiscountType] = useState('fixed')
  const [discountTiming, setDiscountTiming] = useState('after')
  const [whtType, setWhtType] = useState('percent')
  const [showCSVNote, setShowCSVNote] = useState(false)
  const [csvTab, setCSVTab] = useState('Upload File')
  const [pasteCSV, setPasteCSV] = useState('')
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [showItemImages, setShowItemImages] = useState(false)
  const [attachments, setAttachments] = useState([])
  const { columns, setColumns, isVisible, getColumn, toggleVisible, updateColumn, addCustomColumn, removeCustomColumn, resetColumns, moveColumn, customColumns } = useInvoiceColumns()
  const [customFields, setCustomFields] = useState([])
  const [bottomFields, setBottomFields] = useState([])
  const [extraCharges, setExtraCharges] = useState([])
  const [chargeLabels, setChargeLabels] = useState({ workmanship: 'Workmanship', transportation: 'Transportation', shipping: 'Shipping' })
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const csvRef = useRef()
  const isMobile = useIsMobile()
  const isNarrow = useIsNarrow()

  // ── Thread state ────────────────────────────────────────────────────────────
  const [isAdvance, setIsAdvance] = useState(false)
  const [contractTotal, setContractTotal] = useState(0)
  const [newThreadId] = useState(() => generateThreadId())
  const isThreadContinuation = !!threadDefaults?.thread_id
  const [suggestedAmountHint, setSuggestedAmountHint] = useState(null)

  const [invoiceTitle, setInvoiceTitle] = useState(prefill?.invoice_title || '')
  const [invoice, setInvoice] = useState(prefill ? { ...prefill } : {
    invoice_number: '', client_id: '', client_name: '',
    issue_date: new Date().toISOString().split('T')[0], due_date: '',
    status: 'draft', document_type: 'INVOICE', payment_terms: 'Net 30',
    custom_payment_terms: '', notes: '', terms: '',
    workmanship: 0, transportation: 0, shipping: 0, discount: 0,
    vat: 7.5, wht: 0, is_advance: false, advance_percentage: 0,
    work_duration: '', amount_in_words: '',
  })

  const [items, setItems] = useState(prefillItems ? prefillItems.map(i => ({ ...i })) : [makeEmptyItem()])
  // groups[] = [{id, name, showSubtotal}] — metadata only
  const [groups, setGroups] = useState([])

  // ── Auto invoice number ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!prefill) {
      supabase.from('invoices').select('invoice_number').order('created_at', { ascending: false }).limit(1).then(({ data }) => {
        if (data && data.length > 0) {
          const num = parseInt(data[0].invoice_number.replace('SASINV-B', '')) + 1
          setInvoice(i => ({ ...i, invoice_number: 'SASINV-B' + String(num).padStart(3, '0') }))
        } else {
          setInvoice(i => ({ ...i, invoice_number: 'SASINV-B001' }))
        }
      })
    }
  }, [])

  // ── Apply thread defaults ───────────────────────────────────────────────────
  useEffect(() => {
    if (!threadDefaults) return
    if (threadDefaults.client_id) updateInvoice('client_id', threadDefaults.client_id)
    if (threadDefaults.client_name) updateInvoice('client_name', threadDefaults.client_name)
    if (threadDefaults._suggestedAmount > 0) setSuggestedAmountHint(threadDefaults._suggestedAmount)
    if (threadDefaults.total_contract_value) setContractTotal(threadDefaults.total_contract_value)
  }, [])

  const updateInvoice = (field, value) => setInvoice(i => ({ ...i, [field]: value }))

  // ── Item helpers ─────────────────────────────────────────────────────────────
  const updateItem = (index, field, value) => setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it))
  const addItem = () => setItems(prev => [...prev, { ...makeEmptyItem(), sort_order: prev.length }])
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))
  const insertItemAfter = (index) => setItems(items => {
    const newItem = { ...makeEmptyItem(), sort_order: index + 1 }
    const next = [...items]
    next.splice(index + 1, 0, newItem)
    return next
  })
  const moveItem = (index, dir) => {
    const newIdx = index + dir
    if (newIdx < 0 || newIdx >= items.length) return
    const next = [...items];
    [next[index], next[newIdx]] = [next[newIdx], next[index]]
    setItems(next)
  }

  // ── Group helpers ─────────────────────────────────────────────────────────────
  const addGroup = () => {
    const g = makeEmptyGroup()
    setGroups(prev => [...prev, g])
    setItems(prev => [...prev, { ...makeEmptyItem(), row_type: 'group_header', group_name: g.name, sort_order: prev.length }])
  }
  const updateGroupName = (groupId, newName) => {
    const oldName = groups.find(g => g.id === groupId)?.name ?? ''
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g))
    setItems(prev => prev.map(item =>
      (item.row_type === 'group_header' && item.group_name === oldName) || item.group_name === oldName
        ? { ...item, group_name: newName }
        : item
    ))
  }
  const toggleGroupSubtotal = (groupId) =>
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, showSubtotal: !g.showSubtotal } : g))
  const deleteGroup = (groupId) => {
    const groupName = groups.find(g => g.id === groupId)?.name ?? ''
    setGroups(prev => prev.filter(g => g.id !== groupId))
    setItems(prev => prev
      .filter(item => !(item.row_type === 'group_header' && item.group_name === groupName))
      .map(item => item.group_name === groupName ? { ...item, group_name: '' } : item)
    )
  }
  const addItemToGroup = (groupId) => {
    const groupName = groups.find(g => g.id === groupId)?.name ?? ''
    setItems(prev => {
      let lastIdx = -1
      let inGroup = false
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].row_type === 'group_header' && prev[i].group_name === groupName) { inGroup = true; lastIdx = i; continue }
        if (inGroup) {
          if (prev[i].row_type === 'group_header') break
          lastIdx = i
        }
      }
      const newItem = { ...makeEmptyItem(), group_name: groupName, sort_order: lastIdx + 1 }
      const next = [...prev]
      next.splice(lastIdx + 1, 0, newItem)
      return next
    })
  }

  const handleCSVImport = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
      const newItems = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
        if (!cols[0]) continue
        const row = {}; headers.forEach((h, idx) => { row[h] = cols[idx] || '' })
        newItems.push({ ...makeEmptyItem(), description: row['description'] || cols[0], sub_description: row['sub_description'] || '', make: row['make'] || '', quantity: Number(row['quantity'] || 1), unit: row['unit'] || '', unit_price: Number(row['unit_price'] || 0), sort_order: newItems.length })
      }
      if (newItems.length > 0) { setItems(prev => [...prev.filter(i => i.description), ...newItems]); alert(newItems.length + ' items imported') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  // ── Calculations ──────────────────────────────────────────────────────────────
  const { rawSubtotal, installRateTotal, vatAmount, discountAmount, grandTotal, whtAmount, totalPayable, fixedChargesTotal, extraWithTax, extraWithoutTax } = calcTotals({
    items, columns,
    invoice: { ...invoice, _extraCharges: extraCharges },
    discountType, discountTiming, whtType,
  })

  const numberToWords = (num) => {
    if (!num || num === 0) return 'ZERO NAIRA ONLY'
    const ones = ['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN']
    const tens = ['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY']
    const c = (n) => { if(n<20)return ones[n]; if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:''); if(n<1000)return ones[Math.floor(n/100)]+' HUNDRED'+(n%100?' '+c(n%100):''); if(n<1e6)return c(Math.floor(n/1000))+' THOUSAND'+(n%1000?' '+c(n%1000):''); if(n<1e9)return c(Math.floor(n/1e6))+' MILLION'+(n%1e6?' '+c(n%1e6):''); return c(Math.floor(n/1e9))+' BILLION'+(n%1e9?' '+c(n%1e9):'') }
    const naira=Math.floor(num), kobo=Math.round((num-naira)*100)
    return c(naira)+' NAIRA'+(kobo>0?' AND '+c(kobo)+' KOBO':'')+' ONLY'
  }

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async (status) => {
    setSaving(true)
    const groupMeta = {}
    groups.forEach(g => { groupMeta[g.name] = { showSubtotal: g.showSubtotal } })
    const customFieldsData = {
      header: customFields.filter(f=>f.label&&f.value),
      bottom: bottomFields.filter(f=>f.text),
      extraCharges: extraCharges.filter(c=>c.label),
      chargeLabels, columnConfig: columns, notesTitle, termsTitle,
      attachments, mergeQtyUnit, showItemImages, discountType, discountTiming, whtType,
      groupMeta,
    }
    const paymentTermsValue = invoice.payment_terms === 'Custom' ? invoice.custom_payment_terms : invoice.payment_terms

    let threadFields = {
      thread_id: null, total_contract_value: 0,
      thread_position: 1, is_advance: false, amount_received: 0,
    }
    if (isThreadContinuation) {
      threadFields = {
        thread_id: threadDefaults.thread_id,
        total_contract_value: threadDefaults.total_contract_value || 0,
        thread_position: threadDefaults.thread_position || 2,
        is_advance: false, amount_received: 0,
      }
    } else if (isAdvance && contractTotal > 0) {
      threadFields = {
        thread_id: newThreadId, total_contract_value: contractTotal,
        thread_position: 1, is_advance: true, amount_received: 0,
      }
    }

    const { data: inv, error } = await supabase.from('invoices').insert([{
      invoice_number: invoice.invoice_number,
      invoice_title: invoiceTitle || null,
      client_id: invoice.client_id || null,
      client_name: invoice.client_name,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date || null,
      status,
      document_type: invoice.document_type,
      payment_terms: paymentTermsValue,
      notes: invoice.notes,
      terms: invoice.terms,
      workmanship: Number(invoice.workmanship||0),
      transportation: Number(invoice.transportation||0),
      shipping: Number(invoice.shipping||0),
      discount: discountAmount,
      vat: vatAmount,
      wht: whtAmount,
      custom_fields: JSON.stringify(customFieldsData),
      work_duration: invoice.work_duration,
      subtotal: rawSubtotal,
      install_rate_total: installRateTotal,
      total: totalPayable,
      amount_in_words: numberToWords(totalPayable),
      ...threadFields,
    }]).select().single()

    if (error) { alert('Error saving: ' + error.message); setSaving(false); return }

    const itemsToSave = items
      .filter(item => item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim())
      .map((item, i) => toDbItem(item, inv.id, i))
    if (itemsToSave.length > 0) await supabase.from('invoice_items').insert(itemsToSave)

    setSaving(false)
    navigate('/invoices/' + inv.id)
  }

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', backgroundColor: 'white' }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }
  const sec = { backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' }
  const secT = { margin: '0 0 16px 0', color: '#0056B3', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }
  const grid = (cols) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : cols, gap: '16px' })
  const tog = (active) => ({ padding: '5px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: active ? '#CC0000' : 'white', color: active ? 'white' : '#555', fontWeight: 'bold', border: 'none', outline: 'none' })

  // ── Desktop group header cell ──────────────────────────────────────────────
  const renderGroupHeaderRow = (item, index, reorderBtns, visCount) => {
    const g = groups.find(g => g.name === (item.group_name || ''))
    const gItems = g ? items.filter(it => it.row_type === 'standard' && it.group_name === g.name) : []
    const gTotal = gItems.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0)
    return (
      <tr key={index} style={{ backgroundColor: '#333' }}>
        {reorderBtns}
        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#888' }}>—</td>
        <td colSpan={visCount} style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              style={{ flex: 1, backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #555', fontSize: '14px', outline: 'none', padding: '4px' }}
              value={item.group_name || ''}
              onChange={e => {
                if (g) updateGroupName(g.id, e.target.value)
                else updateItem(index, 'group_name', e.target.value)
              }}
              placeholder="Group name"
            />
            {g && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <div onClick={() => toggleGroupSubtotal(g.id)} style={{ width: '32px', height: '18px', borderRadius: '9px', backgroundColor: g.showSubtotal ? '#16A34A' : '#666', position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: g.showSubtotal ? '16px' : '2px', transition: 'left 0.2s' }} />
                  </div>
                  <span style={{ color: '#ccc', fontSize: '11px', whiteSpace: 'nowrap' }}>Subtotal</span>
                </label>
                {g.showSubtotal && (
                  <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    ₦{gTotal.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </td>
        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
          <span onClick={() => g ? deleteGroup(g.id) : removeItem(index)} style={{ color: '#ff6b6b', cursor: 'pointer', fontSize: '18px' }}>×</span>
        </td>
      </tr>
    )
  }

  return (
    <Layout title="New Invoice">
      <div style={{ maxWidth: '1100px' }}>

        {showColumnManager && (
          <ColumnManager
            columns={columns}
            onToggle={toggleVisible}
            onUpdate={updateColumn}
            onAddCustom={addCustomColumn}
            onRemoveCustom={removeCustomColumn}
            onReset={resetColumns}
            onMove={moveColumn}
            onClose={() => setShowColumnManager(false)}
          />
        )}

        {/* Thread continuation banner */}
        {isThreadContinuation && (
          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '18px' }}>🔗</span>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px', color: '#1D4ED8' }}>Continuing Job Thread</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#3B82F6' }}>
                Contract total: <strong>₦{fmtN(threadDefaults.total_contract_value)}</strong>
                {' · '}Previously received: <strong>₦{fmtN(threadDefaults._totalReceived || 0)}</strong>
                {suggestedAmountHint > 0 && <>{' · '}<strong style={{ color: '#1D4ED8' }}>Suggested: ₦{fmtN(suggestedAmountHint)}</strong></>}
              </p>
              {threadDefaults._previousInvoices?.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {threadDefaults._previousInvoices.map(p => (
                    <span key={p.invoice_number} style={{ fontSize: '11px', backgroundColor: 'white', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '2px 8px', color: '#1D4ED8', fontWeight: 'bold' }}>
                      {p.invoice_number} · ₦{fmtN(p.amount_received)} received
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document Header */}
        <div style={sec}>
          <div style={grid('repeat(3, 1fr)')}>
            <div><label style={lbl}>Invoice Number</label>
              <input style={{ ...inp, fontWeight: 'bold', color: '#CC0000' }} value={invoice.invoice_number} onChange={e => updateInvoice('invoice_number', e.target.value)} /></div>
            <div><label style={lbl}>Issue Date</label>
              <input type="date" style={inp} value={invoice.issue_date} onChange={e => updateInvoice('issue_date', e.target.value)} /></div>
            <div><label style={lbl}>Due Date</label>
              <input type="date" style={inp} value={invoice.due_date} onChange={e => updateInvoice('due_date', e.target.value)} /></div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={lbl}>Invoice Title <span style={{ color:'#aaa',fontWeight:'normal' }}>(optional — shows on document when filled)</span></label>
            <input style={inp} value={invoiceTitle} onChange={e => setInvoiceTitle(e.target.value)} placeholder="e.g. Supply and Installation of Electrical Fittings" />
          </div>
        </div>

        {/* Client */}
        <div style={sec}>
          <h3 style={secT}>Client Details</h3>
          <ClientSelector
            clientId={invoice.client_id}
            clientName={invoice.client_name}
            isMobile={isMobile}
            onClientChange={(id, name) => {
              updateInvoice('client_id', id)
              updateInvoice('client_name', name)
            }}
          />
        </div>

        {/* Header Fields */}
        <div style={sec}>
          <h3 style={secT}>Header Fields</h3>
          <div style={grid('1fr 1fr')}>
            <div><label style={lbl}>Work Duration</label>
              <input style={inp} value={invoice.work_duration} onChange={e => updateInvoice('work_duration', e.target.value)} placeholder="e.g. 7 days" /></div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ ...lbl, marginBottom: 0 }}>Custom Header Fields</label>
              <div onClick={() => setCustomFields(f => [...f, { label: '', value: '' }])} style={{ cursor: 'pointer', color: '#6366F1', fontSize: '13px', fontWeight: 'bold' }}>+ Add Field</div>
            </div>
            {customFields.length === 0 && <div style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic' }}>Fields like Engine No, Serial No — appear on invoice header.</div>}
            {customFields.map((field, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <input style={inp} value={field.label} onChange={e => { const u=[...customFields]; u[i]={...u[i],label:e.target.value}; setCustomFields(u) }} placeholder="Label (e.g. Engine No)" />
                <input style={inp} value={field.value} onChange={e => { const u=[...customFields]; u[i]={...u[i],value:e.target.value}; setCustomFields(u) }} placeholder="Value" />
                <div onClick={() => setCustomFields(customFields.filter((_,j)=>j!==i))} style={{ display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'#CC0000',fontSize:'22px' }}>×</div>
              </div>
            ))}
          </div>
        </div>

        {/* Line Items */}
        <div style={sec}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ ...secT, margin: 0 }}>Line Items</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
              <div onClick={() => setShowColumnManager(true)} style={{ padding: '8px 14px', backgroundColor: '#F0F0FF', color: '#6366F1', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>⚙ Columns</div>
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowCSVNote(p=>!p)} style={{ padding: '8px 14px', backgroundColor: '#16A34A', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Import CSV ▾</div>
                {showCSVNote && (
                  <div style={{ position: 'fixed', top: 'auto', left: '50%', transform: 'translateX(-50%)', zIndex: 600, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '16px', width: 'min(320px, 90vw)', marginTop: '6px' }}>
                    <div style={{ display: 'flex', marginBottom: '12px', borderBottom: '2px solid #eee' }}>
                      {['Upload File','Paste CSV'].map(tab => <div key={tab} onClick={()=>setCSVTab(tab)} style={{ padding:'8px 14px',cursor:'pointer',fontSize:'13px',fontWeight:'bold',color:csvTab===tab?'#CC0000':'#888',borderBottom:csvTab===tab?'2px solid #CC0000':'2px solid transparent',marginBottom:'-2px' }}>{tab}</div>)}
                    </div>
                    {csvTab==='Upload File'
                      ? <div onClick={()=>{setShowCSVNote(false);csvRef.current.click()}} style={{ padding:'8px 14px',backgroundColor:'#16A34A',color:'white',borderRadius:'6px',cursor:'pointer',fontSize:'13px',textAlign:'center' }}>Choose File</div>
                      : <div>
                          <div style={{ fontSize:'11px',color:'#888',marginBottom:'6px',lineHeight:'1.6' }}>
                            <strong>Required:</strong> description, quantity, unit_price<br/>
                            <strong>Optional:</strong> sub_description, unit
                          </div>
                          <textarea
                            value={pasteCSV} onChange={e => setPasteCSV(e.target.value)}
                            onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
                            placeholder={"description,quantity,unit_price\nCable tie,5,700"}
                            style={{ width:'100%',height:'100px',padding:'8px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'12px',fontFamily:'monospace',outline:'none',boxSizing:'border-box',resize:'vertical',display:'block' }}
                          />
                          <div style={{ display:'flex',justifyContent:'flex-end',marginTop:'6px' }}>
                            <div onClick={()=>{
                              if(!pasteCSV.trim())return
                              const lines=pasteCSV.split('\n').filter(l=>l.trim())
                              const headers=lines[0].split(',').map(h=>h.trim().toLowerCase())
                              const newItems=[]
                              for(let i=1;i<lines.length;i++){const cols=lines[i].split(',').map(c=>c.trim());if(!cols[0])continue;const row={};headers.forEach((h,idx)=>{row[h]=cols[idx]||''});newItems.push({...makeEmptyItem(),description:row['description']||cols[0],make:row['make']||'',quantity:Number(row['quantity']||1),unit:(row['unit']||'').toUpperCase(),unit_price:Number(row['unit_price']||0),sort_order:newItems.length})}
                              if(newItems.length>0){setItems(p=>[...p.filter(i=>i.description),...newItems]);setPasteCSV('');setShowCSVNote(false);alert(newItems.length+' items imported')}
                            }} style={{ padding:'8px 14px',backgroundColor:'#16A34A',color:'white',borderRadius:'6px',cursor:'pointer',fontSize:'12px',fontWeight:'bold' }}>Import</div>
                          </div>
                        </div>
                    }
                  </div>
                )}
              </div>
              <div onClick={addGroup} style={{ padding:'8px 14px',backgroundColor:'#1a1a1a',color:'white',borderRadius:'6px',cursor:'pointer',fontSize:'13px' }}>+ Group</div>
              <div onClick={addItem} style={{ padding:'8px 14px',backgroundColor:'#CC0000',color:'white',borderRadius:'6px',cursor:'pointer',fontSize:'13px' }}>+ Add Item</div>
            </div>
          </div>

          {/* ── Mobile: group-aware vertical cards ── */}
          {isNarrow && (
            <div>
              {/* Ungrouped items */}
              {(()=>{
                const ungrouped = items.filter(it => it.row_type === 'standard' && !it.group_name)
                let n = 0
                return ungrouped.map((item) => {
                  n++
                  const index = items.indexOf(item)
                  return (
                    <MobileItemCard
                      key={'ug_' + index}
                      item={item} index={index} number={n}
                      isVisible={isVisible} getColumn={getColumn}
                      customColumns={customColumns} showItemImages={showItemImages}
                      invoice={invoice} isFirst={n === 1} isLast={index === items.length - 1}
                      onUpdate={(idx, field, value) => {
                        if (field === '__install_rate_override') {
                          setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, ...value }))
                        } else { updateItem(idx, field, value) }
                      }}
                      onRemove={removeItem}
                      onInsertBelow={(idx) => insertItemAfter(idx)}
                      onMoveUp={(idx) => moveItem(idx, -1)}
                      onMoveDown={(idx) => moveItem(idx, 1)}
                    />
                  )
                })
              })()}
              <div onClick={addItem} style={{ padding: '12px', backgroundColor: '#CC0000', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', textAlign: 'center', marginBottom: '20px' }}>+ Add Item</div>

              {/* Group sections */}
              {groups.map(group => {
                const groupItems = items.filter(it => it.row_type === 'standard' && it.group_name === group.name)
                const groupSubtotal = groupItems.reduce((s, it) => s + Number(it.quantity||0) * Number(it.unit_price||0), 0)
                let n = 0
                return (
                  <div key={group.id} style={{ border: '2px solid #333', borderRadius: '10px', marginBottom: '16px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#333', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <input
                          style={{ flex: 1, backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #666', fontSize: '15px', outline: 'none', padding: '4px 0' }}
                          value={group.name}
                          onChange={e => updateGroupName(group.id, e.target.value)}
                          placeholder="Group name"
                        />
                        <span onClick={() => deleteGroup(group.id)} style={{ color: '#ff6b6b', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <div onClick={() => toggleGroupSubtotal(group.id)} style={{ width: '36px', height: '20px', borderRadius: '10px', backgroundColor: group.showSubtotal ? '#16A34A' : '#555', position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: group.showSubtotal ? '18px' : '2px', transition: 'left 0.2s' }} />
                          </div>
                          <span style={{ color: '#ccc', fontSize: '12px' }}>Show subtotal</span>
                        </label>
                        {group.showSubtotal && <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: '13px', fontWeight: 'bold' }}>₦{groupSubtotal.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div style={{ padding: '12px' }}>
                      {groupItems.map((item, gi) => {
                        n++
                        const index = items.indexOf(item)
                        return (
                          <MobileItemCard
                            key={'g_' + index}
                            item={item} index={index} number={n}
                            isVisible={isVisible} getColumn={getColumn}
                            customColumns={customColumns} showItemImages={showItemImages}
                            invoice={invoice} isFirst={gi === 0} isLast={gi === groupItems.length - 1}
                            onUpdate={(idx, field, value) => {
                              if (field === '__install_rate_override') {
                                setItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, ...value }))
                              } else { updateItem(idx, field, value) }
                            }}
                            onRemove={removeItem}
                            onInsertBelow={() => addItemToGroup(group.id)}
                            onMoveUp={(idx) => moveItem(idx, -1)}
                            onMoveDown={(idx) => moveItem(idx, 1)}
                          />
                        )
                      })}
                      <div onClick={() => addItemToGroup(group.id)} style={{ padding: '10px', border: '1px dashed #CC0000', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', color: '#CC0000', fontWeight: '600' }}>
                        + Add item to {group.name || 'group'}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div onClick={addGroup} style={{ padding: '12px', backgroundColor: '#1a1a1a', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>+ Add Group</div>
            </div>
          )}

          {/* ── Desktop: horizontal table ── */}
          {!isNarrow && <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a1a1a' }}>
                  <th style={{ padding:'10px 4px',textAlign:'center',color:'white',width:'28px' }}></th>
                  <th style={{ padding:'10px 8px',textAlign:'center',color:'white',width:'28px' }}>#</th>
                  <th style={{ padding:'10px 12px',textAlign:'left',color:'white',minWidth:'200px' }}>Description</th>
                  {isVisible('make')&&<th style={{ padding:'10px 12px',textAlign:'left',color:'white',minWidth:'80px' }}>Make</th>}
                  <th style={{ padding:'10px 12px',textAlign:'left',color:'white',minWidth:'60px' }}>Qty</th>
                  {isVisible('unit')&&<th style={{ padding:'10px 12px',textAlign:'left',color:'white',minWidth:'70px' }}>Unit</th>}
                  <th style={{ padding:'10px 12px',textAlign:'left',color:'white',minWidth:'120px' }}>Rate</th>
                  <th style={{ padding:'10px 12px',textAlign:'left',color:'white',minWidth:'110px' }}>Amount</th>
                  {isVisible('install_rate')&&<th style={{ padding:'10px 12px',textAlign:'left',color:'white',minWidth:'110px' }}>Install Rate</th>}
                  {isVisible('vat_rate')&&<th style={{ padding:'10px 12px',textAlign:'center',color:'white',minWidth:'72px' }}>VAT %</th>}
                  {isVisible('discount_rate')&&<th style={{ padding:'10px 12px',textAlign:'center',color:'white',minWidth:'72px' }}>Disc %</th>}
                  {customColumns.filter(c=>c.visible).map(col=>(
                    <th key={col.key} style={{ padding:'10px 12px',textAlign:'left',color:'white',minWidth:'90px' }}>{col.label}</th>
                  ))}
                  {showItemImages && <th style={{ padding:'10px 12px',textAlign:'left',color:'white',width:'70px' }}>Image</th>}
                  <th style={{ padding:'10px 12px',color:'white',width:'30px' }}></th>
                </tr>
              </thead>
              <tbody>
                {(()=>{
                  let n=0
                  const installCol = getColumn('install_rate')
                  return items.map((item,index)=>{
                    if(item.row_type==='standard')n++
                    const visCount = 3+(isVisible('make')?1:0)+(isVisible('unit')?1:0)+(isVisible('install_rate')?1:0)+(isVisible('vat_rate')?1:0)+(isVisible('discount_rate')?1:0)+customColumns.filter(c=>c.visible).length+(showItemImages?1:0)+2
                    const autoInstall = installCol?.formula ? parseFloat(installCol.formula) * Number(item.quantity||1) * Number(item.unit_price||0) : null
                    const reorderBtns = (
                      <td style={{ padding:'4px 2px',textAlign:'center',verticalAlign:'middle' }}>
                        <div style={{ display:'flex',flexDirection:'column',gap:'1px' }}>
                          <div onClick={()=>moveItem(index,-1)} style={{ cursor:index===0?'not-allowed':'pointer',color:index===0?'#ddd':'#888',fontSize:'11px',lineHeight:1,padding:'2px' }}>▲</div>
                          <div onClick={()=>moveItem(index,1)} style={{ cursor:index===items.length-1?'not-allowed':'pointer',color:index===items.length-1?'#ddd':'#888',fontSize:'11px',lineHeight:1,padding:'2px' }}>▼</div>
                        </div>
                      </td>
                    )
                    if (item.row_type === 'group_header') {
                      return renderGroupHeaderRow(item, index, reorderBtns, visCount)
                    }
                    return (
                      <tr key={index} style={{ borderBottom:'1px solid #eee',backgroundColor:index%2===0?'#fafafa':'white' }}>
                        {reorderBtns}
                        <td style={{ padding:'8px',textAlign:'center',color:'#999',fontSize:'12px',fontWeight:'700' }}>{n}</td>
                        <td style={{ padding:'8px 12px' }}>
                          <input style={inp} value={item.description} onChange={e=>updateItem(index,'description',e.target.value)} placeholder="Item description" />
                          <input style={{ ...inp,marginTop:'4px',fontSize:'13px',color:'#888' }} value={item.sub_description||''} onChange={e=>updateItem(index,'sub_description',e.target.value)} placeholder="Sub-description (optional)" />
                        </td>
                        {isVisible('make')&&<td style={{ padding:'8px 12px' }}><input style={inp} value={item.make||''} onChange={e=>updateItem(index,'make',e.target.value)} placeholder="Brand" /></td>}
                        <td style={{ padding:'8px 12px' }}><input style={inp} type="number" min="0" value={item.quantity} onChange={e=>updateItem(index,'quantity',Number(e.target.value))} /></td>
                        {isVisible('unit')&&<td style={{ padding:'8px 12px',minWidth:'100px' }}><UnitInput value={item.unit||''} onChange={val=>updateItem(index,'unit',val)} /></td>}
                        <td style={{ padding:'8px 12px' }}><input style={inp} type="number" min="0" value={item.unit_price} onChange={e=>updateItem(index,'unit_price',Number(e.target.value))} /></td>
                        <td style={{ padding:'8px 12px',fontWeight:'bold',color:'#1a1a1a',whiteSpace:'nowrap' }}>NGN {(Number(item.quantity)*Number(item.unit_price)).toLocaleString()}</td>
                        {isVisible('install_rate')&&(
                          <td style={{ padding:'8px 12px' }}>
                            <input
                              style={inp} type="number" min="0"
                              value={item.install_rate_override ? (item.install_rate ?? '') : ''}
                              placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : '0'}
                              onChange={e => {
                                const val = e.target.value
                                setItems(prev => prev.map((it, i) => i !== index ? it : val === ''
                                  ? { ...it, install_rate_override: false, install_rate: null }
                                  : { ...it, install_rate_override: true, install_rate: Number(val) }
                                ))
                              }}
                            />
                          </td>
                        )}
                        {isVisible('vat_rate')&&(
                          <td style={{ padding:'8px 12px' }}>
                            <input style={{ ...inp, textAlign:'center', backgroundColor: item.vat_rate !== null && item.vat_rate !== undefined ? 'white' : '#f9f9f9', color: item.vat_rate === 0 ? '#CC0000' : '#1a1a1a' }}
                              type="number" min="0" max="100"
                              value={item.vat_rate !== null && item.vat_rate !== undefined ? item.vat_rate : ''}
                              placeholder={String(invoice.vat||0)}
                              onChange={e=>{ const val = e.target.value; updateItem(index,'vat_rate', val==='' ? null : Number(val)) }}
                            />
                            {item.vat_rate === 0 && <div style={{ fontSize:'10px',color:'#CC0000',marginTop:'2px' }}>excluded</div>}
                          </td>
                        )}
                        {isVisible('discount_rate')&&(()=>{
                          const drVal = item.discount_rate
                          const isExcluded = drVal === 0
                          const hasOverride = drVal !== null && drVal !== undefined
                          return (
                          <td style={{ padding:'8px 12px' }}>
                            <input
                              style={{ ...inp, textAlign:'center', backgroundColor: isExcluded ? '#fff0f0' : hasOverride ? '#fffbe6' : '#f9f9f9', color: isExcluded ? '#CC0000' : '#1a1a1a' }}
                              type="number" min="0" max="100"
                              value={hasOverride ? drVal : ''}
                              placeholder="global"
                              onChange={e => { const val = e.target.value; updateItem(index, 'discount_rate', val === '' ? null : Number(val)) }}
                            />
                            {isExcluded
                              ? <div style={{ fontSize:'10px',color:'#CC0000',marginTop:'2px',fontWeight:'bold' }}>✕ no discount</div>
                              : drVal > 0
                                ? <div style={{ fontSize:'10px',color:'#B45309',marginTop:'2px' }}>{drVal}% this row</div>
                                : <div style={{ fontSize:'10px',color:'#aaa',marginTop:'2px' }}>blank = global</div>
                            }
                          </td>
                          )
                        })()}
                        {customColumns.filter(c=>c.visible).map(col=>(
                          <td key={col.key} style={{ padding:'8px 12px' }}>
                            <input style={inp}
                              type={col.type==='number' ? 'number' : 'text'}
                              value={(item.custom_data||{})[col.key]||''}
                              onChange={e=>updateItem(index,'custom_data',{ ...(item.custom_data||{}), [col.key]: col.type==='number' ? Number(e.target.value) : e.target.value })}
                            />
                          </td>
                        ))}
                        {showItemImages && (
                          <td style={{ padding:'8px 12px', verticalAlign: 'top' }}>
                            <ItemImageUpload value={item.image_url||null} onChange={url=>updateItem(index,'image_url',url)} />
                          </td>
                        )}
                        <td style={{ padding:'8px 12px',textAlign:'center',verticalAlign:'top' }}><span onClick={()=>removeItem(index)} style={{ color:'#CC0000',cursor:'pointer',fontSize:'18px' }}>×</span></td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>}
        </div>

        {/* Advanced Options */}
        <div style={sec}>
          <div onClick={() => setShowAdvanced(p=>!p)} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer' }}>
            <h3 style={{ ...secT,margin:0 }}>Advanced Options</h3>
            <span style={{ fontSize:'18px',color:'#aaa' }}>{showAdvanced ? '▲' : '▾'}</span>
          </div>
          {showAdvanced && (
            <div style={{ marginTop:'16px' }}>
              <div style={{ display:'flex',flexDirection:'column',gap:'14px' }}>
                <label style={{ display:'flex',alignItems:'center',gap:'12px',cursor:'pointer' }}>
                  <div onClick={()=>setMergeQtyUnit(p=>!p)} style={{ width:'44px',height:'24px',borderRadius:'12px',backgroundColor:mergeQtyUnit?'#CC0000':'#ddd',position:'relative',transition:'background 0.2s',flexShrink:0 }}>
                    <div style={{ width:'20px',height:'20px',borderRadius:'50%',backgroundColor:'white',position:'absolute',top:'2px',left:mergeQtyUnit?'22px':'2px',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize:'14px',fontWeight:'600',color:'#1a1a1a' }}>Merge Qty + Unit on PDF</div>
                    <div style={{ fontSize:'12px',color:'#999' }}>Shows "5 Sets" instead of separate Qty and Unit columns</div>
                  </div>
                </label>
                <label style={{ display:'flex',alignItems:'center',gap:'12px',cursor:'pointer' }}>
                  <div onClick={()=>setShowItemImages(p=>!p)} style={{ width:'44px',height:'24px',borderRadius:'12px',backgroundColor:showItemImages?'#CC0000':'#ddd',position:'relative',transition:'background 0.2s',flexShrink:0 }}>
                    <div style={{ width:'20px',height:'20px',borderRadius:'50%',backgroundColor:'white',position:'absolute',top:'2px',left:showItemImages?'22px':'2px',transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize:'14px',fontWeight:'600',color:'#1a1a1a' }}>Show item images in PDF</div>
                    <div style={{ fontSize:'12px',color:'#999' }}>Adds an image column — upload images per row above</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Attachments */}
        <div style={sec}>
          <h3 style={secT}>Attachments</h3>
          <div style={{ fontSize:'12px',color:'#999',marginBottom:'12px' }}>Files attached here appear as download links on the invoice view. File names print in the PDF.</div>
          <AttachmentsPanel attachments={attachments} onChange={setAttachments} />
        </div>

        {/* Charges & Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={sec}>
            <h3 style={secT}>Additional Charges</h3>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px' }}>
              <label style={{ ...lbl,marginBottom:0 }}>VAT %</label>
              <input type="number" min="0" style={{ ...inp,width:'140px',textAlign:'right' }} value={invoice.vat||0} onChange={e=>updateInvoice('vat',Number(e.target.value))} />
            </div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px' }}>
              <label style={{ ...lbl,marginBottom:0 }}>WHT (deducted)</label>
              <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                <div style={{ display:'flex',borderRadius:'6px',overflow:'hidden',border:'1px solid #ddd' }}>
                  <button onClick={()=>setWhtType('percent')} style={tog(whtType==='percent')}>%</button>
                  <button onClick={()=>setWhtType('fixed')} style={tog(whtType==='fixed')}>₦</button>
                </div>
                <input type="number" min="0" style={{ ...inp,width:'100px',textAlign:'right' }} value={invoice.wht||0} onChange={e=>updateInvoice('wht',Number(e.target.value))} />
              </div>
            </div>
            {['workmanship','transportation','shipping'].map(key=>(
              <div key={key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px',gap:'8px' }}>
                <input style={{ ...inp,width:'130px',fontSize:'12px',fontWeight:'bold',color:'#555' }} value={chargeLabels[key]} onChange={e=>setChargeLabels(p=>({...p,[key]:e.target.value}))} placeholder={key} />
                <input type="number" min="0" style={{ ...inp,width:'140px',textAlign:'right' }} value={invoice[key]||0} onChange={e=>updateInvoice(key,Number(e.target.value))} />
              </div>
            ))}
            {extraCharges.map((charge,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px' }}>
                <input style={{ ...inp,flex:1,fontSize:'12px' }} value={charge.label} onChange={e=>{const u=[...extraCharges];u[i]={...u[i],label:e.target.value};setExtraCharges(u)}} placeholder="Charge name" />
                <input type="number" min="0" style={{ ...inp,width:'90px',textAlign:'right' }} value={charge.value||0} onChange={e=>{const u=[...extraCharges];u[i]={...u[i],value:Number(e.target.value)};setExtraCharges(u)}} />
                <div onClick={()=>{const u=[...extraCharges];u[i]={...u[i],withTax:!u[i].withTax};setExtraCharges(u)}} style={{ fontSize:'11px',color:charge.withTax?'#0056B3':'#888',cursor:'pointer',whiteSpace:'nowrap',fontWeight:'bold',minWidth:'44px' }}>{charge.withTax?'+VAT':'No VAT'}</div>
                <span onClick={()=>setExtraCharges(extraCharges.filter((_,j)=>j!==i))} style={{ color:'#CC0000',cursor:'pointer',fontSize:'18px' }}>×</span>
              </div>
            ))}
            <div style={{ display:'flex',gap:'8px',marginTop:'8px',flexWrap:'wrap' }}>
              <div onClick={()=>setExtraCharges([...extraCharges,{label:'',value:0,withTax:true}])} style={{ padding:'6px 12px',border:'1px dashed #0056B3',borderRadius:'6px',cursor:'pointer',fontSize:'12px',color:'#0056B3' }}>+ Charge (with VAT)</div>
              <div onClick={()=>setExtraCharges([...extraCharges,{label:'',value:0,withTax:false}])} style={{ padding:'6px 12px',border:'1px dashed #888',borderRadius:'6px',cursor:'pointer',fontSize:'12px',color:'#888' }}>+ Charge (no VAT)</div>
            </div>
            <div style={{ marginTop:'16px',paddingTop:'16px',borderTop:'1px solid #eee' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px',flexWrap:'wrap',gap:'6px' }}>
                <label style={{ ...lbl,marginBottom:0 }}>Discount</label>
                <div style={{ display:'flex',gap:'6px' }}>
                  <div style={{ display:'flex',borderRadius:'6px',overflow:'hidden',border:'1px solid #ddd' }}>
                    <button onClick={()=>setDiscountType('fixed')} style={tog(discountType==='fixed')}>₦</button>
                    <button onClick={()=>setDiscountType('percent')} style={tog(discountType==='percent')}>%</button>
                  </div>
                </div>
              </div>
              <input type="number" min="0" style={{ ...inp,textAlign:'right' }} value={invoice.discount||0} onChange={e=>updateInvoice('discount',Number(e.target.value))} />
            </div>
          </div>

          <div style={sec}>
            <h3 style={secT}>Summary</h3>
            {[
              { label:'Subtotal', value:rawSubtotal },
              ...extraCharges.filter(c=>c.withTax&&Number(c.value)>0).map(c=>({label:c.label+' (+VAT)',value:Number(c.value)})),
              { label:`VAT (${invoice.vat||0}%)`, value:vatAmount },
              { label:chargeLabels.workmanship, value:Number(invoice.workmanship||0) },
              { label:chargeLabels.transportation, value:Number(invoice.transportation||0) },
              { label:chargeLabels.shipping, value:Number(invoice.shipping||0) },
              installRateTotal>0?{label:'Install Rate Total',value:installRateTotal}:null,
              ...extraCharges.filter(c=>!c.withTax&&Number(c.value)>0).map(c=>({label:c.label,value:Number(c.value)})),
              discountAmount>0?{label:discountType==='percent'?`Discount (${invoice.discount||0}%)`:'Discount',value:-discountAmount}:null,
            ].filter(Boolean).filter(r=>r.value!==0).map(({label,value})=>(
              <div key={label} style={{ display:'flex',justifyContent:'space-between',marginBottom:'8px',fontSize:'14px' }}>
                <span style={{ color:'#555' }}>{label}</span>
                <span style={{ color:value<0?'#CC0000':'#1a1a1a',whiteSpace:'nowrap' }}>{value<0?'-':''}₦{Math.abs(value).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ borderTop:'2px solid #1a1a1a',paddingTop:'12px',marginTop:'8px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span style={{ fontWeight:'bold',fontSize:'15px' }}>Grand Total</span>
              <span style={{ fontWeight:'bold',fontSize:'20px',color:'#1a1a1a',whiteSpace:'nowrap' }}>₦{grandTotal.toLocaleString()}</span>
            </div>
            {whtAmount>0&&(
              <div style={{ display:'flex',justifyContent:'space-between',marginTop:'8px',fontSize:'13px',color:'#CC0000',borderTop:'1px dashed #ddd',paddingTop:'8px' }}>
                <span>Less: WHT ({whtType==='percent'?(invoice.wht||0)+'%':'₦'+Number(invoice.wht||0).toLocaleString()})</span>
                <span style={{ whiteSpace:'nowrap' }}>-₦{whtAmount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ borderTop:'2px solid #CC0000',paddingTop:'10px',marginTop:'8px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span style={{ fontWeight:'bold',fontSize:'15px',color:'#CC0000' }}>Total Payable</span>
              <span style={{ fontWeight:'bold',fontSize:'22px',color:'#CC0000',whiteSpace:'nowrap' }}>₦{totalPayable.toLocaleString()}</span>
            </div>
            <div style={{ marginTop:'12px',padding:'10px',backgroundColor:'#f9f9f9',borderRadius:'6px',fontSize:'12px',color:'#555',fontStyle:'italic' }}>
              {numberToWords(totalPayable)}
            </div>
          </div>
        </div>

        {/* Job Thread Panel */}
        {!isThreadContinuation && (
          <div style={{ marginBottom: '20px' }}>
            <ThreadInitPanel
              isAdvance={isAdvance}
              setIsAdvance={setIsAdvance}
              contractTotal={contractTotal}
              setContractTotal={setContractTotal}
              invoiceTotal={totalPayable}
            />
          </div>
        )}

        {/* Payment Terms */}
        <div style={sec}>
          <h3 style={secT}>Payment Terms</h3>
          <div style={grid('1fr 1fr')}>
            <div><label style={lbl}>Payment Terms</label>
              <select style={inp} value={invoice.payment_terms} onChange={e=>updateInvoice('payment_terms',e.target.value)}>
                <option>Net 30</option><option>Net 60</option><option>Due on receipt</option><option>50% advance</option><option>Custom</option>
              </select></div>
            {invoice.payment_terms==='Custom'&&(
              <div><label style={lbl}>Specify Terms</label>
                <input style={inp} value={invoice.custom_payment_terms} onChange={e=>updateInvoice('custom_payment_terms',e.target.value)} placeholder="e.g. 60% downpayment, 40% on delivery" /></div>
            )}
          </div>
        </div>

        {/* Project Milestones */}
        <div style={sec}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
            <h3 style={{ ...secT,margin:0 }}>Project Milestones</h3>
            <div onClick={()=>setBottomFields(f=>[...f,{text:''}])} style={{ cursor:'pointer',color:'#6366F1',fontSize:'13px',fontWeight:'bold' }}>+ Add Custom Field</div>
          </div>
          {bottomFields.length===0&&<div style={{ fontSize:'13px',color:'#bbb',fontStyle:'italic' }}>Plain-text entries like "ADVANCE PAYMENT DUE (60%)" that appear below the totals.</div>}
          {bottomFields.map((field,i)=>(
            <div key={i} style={{ display:'flex',gap:'8px',marginBottom:'10px',alignItems:'center' }}>
              <input style={{ ...inp,flex:1 }} value={field.text} onChange={e=>{const u=[...bottomFields];u[i]={text:e.target.value};setBottomFields(u)}} placeholder='e.g. ADVANCE PAYMENT DUE (60%): ₦141,601' />
              <span onClick={()=>setBottomFields(bottomFields.filter((_,j)=>j!==i))} style={{ color:'#CC0000',cursor:'pointer',fontSize:'20px' }}>×</span>
            </div>
          ))}
        </div>

        {/* Notes & Terms */}
        <div style={sec}>
          <div style={grid('1fr 1fr')}>
            <div>
              <input style={{ ...inp,fontWeight:'bold',color:'#0056B3',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px',padding:'4px 8px',border:'none',borderBottom:'2px solid #0056B3',borderRadius:0,marginBottom:'10px' }}
                value={notesTitle} onChange={e=>setNotesTitle(e.target.value)} />
              <RichTextEditor value={invoice.notes} onChange={val=>updateInvoice('notes',val)} placeholder="Notes to client..." />
            </div>
            <div>
              <input style={{ ...inp,fontWeight:'bold',color:'#0056B3',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px',padding:'4px 8px',border:'none',borderBottom:'2px solid #0056B3',borderRadius:0,marginBottom:'10px' }}
                value={termsTitle} onChange={e=>setTermsTitle(e.target.value)} />
              <RichTextEditor value={invoice.terms} onChange={val=>updateInvoice('terms',val)} placeholder="Terms and conditions..." />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display:'flex',flexDirection:'column',gap:'10px',paddingBottom:'40px',maxWidth:'400px',marginLeft:'auto' }}>
          <div onClick={()=>handleSave('sent')} style={{ padding:'14px 24px',borderRadius:'8px',cursor:'pointer',fontSize:'15px',backgroundColor:'#CC0000',color:'white',fontWeight:'bold',textAlign:'center' }}>{saving?'Saving...':'Save and Send'}</div>
          <div onClick={()=>handleSave('draft')} style={{ padding:'14px 24px',borderRadius:'8px',cursor:'pointer',fontSize:'15px',backgroundColor:'#555',color:'white',textAlign:'center' }}>{saving?'Saving...':'Save as Draft'}</div>
          <div onClick={()=>navigate('/invoices')} style={{ padding:'14px 24px',borderRadius:'8px',cursor:'pointer',fontSize:'15px',border:'1px solid #ddd',backgroundColor:'white',textAlign:'center',color:'#555' }}>Cancel</div>
        </div>

      </div>
    </Layout>
  )
}
