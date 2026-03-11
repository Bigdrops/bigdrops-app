import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import UnitInput from '../components/UnitInput'
import RichTextEditor from '../components/RichTextEditor'
import ClientSelector from '../components/ClientSelector'
import ColumnManager from '../components/ColumnManager'
import ItemImageUpload from '../components/ItemImageUpload'
import AttachmentsPanel from '../components/AttachmentsPanel'
import MobileItemCard from '../components/MobileItemCard'
import { makeEmptyItem, makeEmptyGroup, toDbItem, useInvoiceColumns, calcTotals, BUILTIN_COLUMNS } from '../components/useInvoiceColumns.jsx'

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

export default function EditInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isMobile = useIsMobile()
  const isNarrow = useIsNarrow()
  const csvRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
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
  const [invoiceTitle, setInvoiceTitle] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([makeEmptyItem()])
  // groups[] = [{id, name, showSubtotal}] — metadata only, parallel to group_header rows in items
  const [groups, setGroups] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('invoices').select('*').eq('id', id).single()
      if (!data) { navigate('/invoices'); return }
      setInvoice(data)
      if (data.invoice_title) setInvoiceTitle(data.invoice_title)

      let savedGroupMeta = {}
      try {
        const parsed = JSON.parse(data.custom_fields || '{}')
        if (parsed && !Array.isArray(parsed)) {
          setCustomFields(parsed.header || [])
          setBottomFields(parsed.bottom || [])
          setExtraCharges(parsed.extraCharges || [])
          if (parsed.chargeLabels) setChargeLabels(parsed.chargeLabels)
          if (parsed.columnConfig) {
            const merged = parsed.columnConfig.map(saved => {
              const base = BUILTIN_COLUMNS.find(b => b.key === saved.key)
              return base ? { ...base, ...saved } : saved
            })
            setColumns(merged)
          }
          if (parsed.notesTitle) setNotesTitle(parsed.notesTitle)
          if (parsed.termsTitle) setTermsTitle(parsed.termsTitle)
          if (parsed.attachments) setAttachments(parsed.attachments)
          if (parsed.mergeQtyUnit) setMergeQtyUnit(parsed.mergeQtyUnit)
          if (parsed.showItemImages) setShowItemImages(parsed.showItemImages)
          if (parsed.discountType) setDiscountType(parsed.discountType)
          if (parsed.discountTiming) setDiscountTiming(parsed.discountTiming)
          if (parsed.whtType) setWhtType(parsed.whtType)
          if (parsed.groupMeta) savedGroupMeta = parsed.groupMeta
        } else if (Array.isArray(parsed)) {
          setCustomFields(parsed)
        }
      } catch(e) {}

      const { data: itemData } = await supabase
        .from('invoice_items').select('*').eq('invoice_id', id).order('sort_order')
      const loaded = (itemData && itemData.length > 0 ? itemData : [makeEmptyItem()]).map(item => ({
        ...item,
        custom_data: typeof item.custom_data === 'string'
          ? JSON.parse(item.custom_data || '{}')
          : (item.custom_data || {}),
        install_rate_override: !!(item.install_rate !== null && item.install_rate !== undefined && item.install_rate !== 0),
        vat_rate: (item.vat_rate === 0 || item.vat_rate === null) ? null : item.vat_rate,
        discount_rate: (item.discount_rate === 0 || item.discount_rate === null) ? null : item.discount_rate,
        image_url: item.image_url || null,
      }))
      setItems(loaded)

      // Restore group metadata from loaded items
      const seenGroups = []
      const seenNames = new Set()
      loaded.forEach(item => {
        if (item.row_type === 'group_header' && item.group_name && !seenNames.has(item.group_name)) {
          seenNames.add(item.group_name)
          seenGroups.push({
            id: 'grp_' + item.group_name.replace(/\W+/g, '_'),
            name: item.group_name,
            showSubtotal: !!(savedGroupMeta[item.group_name]?.showSubtotal),
          })
        }
      })
      if (seenGroups.length > 0) setGroups(seenGroups)

      setLoading(false)
    }
    load()
  }, [id])

  // ── Item helpers (unchanged) ────────────────────────────────────────────────
  const updateItem = (index, field, value) => setItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  const removeItem = (index) => setItems(items => items.filter((_, i) => i !== index))
  const addItem = () => setItems(items => [...items, { ...makeEmptyItem(), sort_order: items.length }])
  const insertItemAfter = (index) => setItems(items => {
    const newItem = { ...makeEmptyItem(), sort_order: index + 1 }
    const next = [...items]
    next.splice(index + 1, 0, newItem)
    return next
  })
  const moveItem = (index, dir) => setItems(items => {
    const newIdx = index + dir
    if (newIdx < 0 || newIdx >= items.length) return items
    const next = [...items];
    [next[index], next[newIdx]] = [next[newIdx], next[index]]
    return next
  })

  // ── Group helpers ────────────────────────────────────────────────────────────
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
  // Delete group header row; move its items to ungrouped (group_name: '')
  const deleteGroup = (groupId) => {
    const groupName = groups.find(g => g.id === groupId)?.name ?? ''
    setGroups(prev => prev.filter(g => g.id !== groupId))
    setItems(prev => prev
      .filter(item => !(item.row_type === 'group_header' && item.group_name === groupName))
      .map(item => item.group_name === groupName ? { ...item, group_name: '' } : item)
    )
  }
  // Add a blank item at the end of a specific group
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

  if (loading || !invoice) return <Layout title="Edit Invoice"><p style={{ padding: 30 }}>Loading...</p></Layout>

  const { rawSubtotal, installRateTotal, vatAmount, discountAmount, grandTotal, whtAmount, totalPayable, fixedChargesTotal, extraWithTax, extraWithoutTax } = calcTotals({
    items, columns,
    invoice: { ...invoice, _extraCharges: extraCharges },
    discountType, discountTiming, whtType,
  })

  const updateInvoice = (field, value) => setInvoice(i => ({ ...i, [field]: value }))

  const numberToWords = (num) => {
    if (!num || num === 0) return 'ZERO NAIRA ONLY'
    const ones = ['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN']
    const tens = ['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY']
    const c = (n) => { if(n<20)return ones[n]; if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:''); if(n<1000)return ones[Math.floor(n/100)]+' HUNDRED'+(n%100?' '+c(n%100):''); if(n<1e6)return c(Math.floor(n/1000))+' THOUSAND'+(n%1000?' '+c(n%1000):''); if(n<1e9)return c(Math.floor(n/1e6))+' MILLION'+(n%1e6?' '+c(n%1e6):''); return c(Math.floor(n/1e9))+' BILLION'+(n%1e9?' '+c(n%1e9):'') }
    const naira=Math.floor(num), kobo=Math.round((num-naira)*100)
    return c(naira)+' NAIRA'+(kobo>0?' AND '+c(kobo)+' KOBO':'')+' ONLY'
  }

  const handleSave = async (status) => {
    setSaving(true)
    // Build groupMeta for PDF subtotal rendering
    const groupMeta = {}
    groups.forEach(g => { groupMeta[g.name] = { showSubtotal: g.showSubtotal } })
    const customFieldsData = {
      header: customFields.filter(f=>f.label&&f.value),
      bottom: bottomFields.filter(f=>f.text),
      extraCharges: extraCharges.filter(c=>c.label),
      chargeLabels,
      columnConfig: columns,
      notesTitle,
      termsTitle,
      attachments,
      mergeQtyUnit,
      showItemImages,
      discountType,
      discountTiming,
      whtType,
      groupMeta,
    }
    const paymentTermsValue = invoice.payment_terms === 'Custom' ? invoice.custom_payment_terms : invoice.payment_terms

    const { error } = await supabase.from('invoices').update({
      invoice_title: invoiceTitle || null,
      client_id: invoice.client_id || null,
      client_name: invoice.client_name,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date || null,
      status,
      payment_terms: paymentTermsValue,
      notes: invoice.notes,
      terms: invoice.terms,
      workmanship: Number(invoice.workmanship||0),
      transportation: Number(invoice.transportation||0),
      shipping: Number(invoice.shipping||0),
      discount: discountAmount,
      vat: vatAmount,
      wht: whtAmount,
      is_advance: invoice.is_advance,
      advance_percentage: invoice.advance_percentage,
      custom_fields: JSON.stringify(customFieldsData),
      work_duration: invoice.work_duration,
      subtotal: rawSubtotal,
      install_rate_total: installRateTotal,
      total: totalPayable,
      amount_in_words: numberToWords(totalPayable),
    }).eq('id', id)

    if (error) { alert('Error saving: ' + error.message); setSaving(false); return }

    const itemsToSave = items
      .filter(item => item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim())
      .map((item, i) => toDbItem(item, id, i))

    const { error: delErr } = await supabase.from('invoice_items').delete().eq('invoice_id', id)
    if (delErr) { alert('Error clearing previous items: ' + delErr.message); setSaving(false); return }
    if (itemsToSave.length > 0) {
      const { error: insErr } = await supabase.from('invoice_items').insert(itemsToSave)
      if (insErr) { alert('Error saving items: ' + insErr.message); setSaving(false); return }
    }

    setSaving(false)
    navigate('/invoices/' + id)
  }

  const handleCSVImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) return
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const newItems = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim())
        if (!cols[0]) continue
        const row = {}
        headers.forEach((h, idx) => { row[h] = cols[idx] || '' })
        newItems.push({ ...makeEmptyItem(), description: row['description'] || cols[0], sub_description: row['sub_description'] || '', make: row['make'] || '', quantity: Number(row['quantity'] || 1), unit: (row['unit'] || '').toUpperCase(), unit_price: Number(row['unit_price'] || 0), sort_order: newItems.length })
      }
      if (newItems.length > 0) { setItems(p => [...p.filter(i => i.description), ...newItems]); alert(newItems.length + ' items imported') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', backgroundColor: 'white' }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }
  const sec = { backgroundColor: 'white', borderRadius: '12px', padding: isMobile ? '16px' : '24px', marginBottom: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
  const secT = { fontSize: '14px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', marginTop: 0 }
  const grid = (cols) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : cols, gap: '16px' })

  // ── Desktop group header cell ─────────────────────────────────────────────
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
          <span
            onClick={() => g ? deleteGroup(g.id) : removeItem(index)}
            style={{ color: '#ff6b6b', cursor: 'pointer', fontSize: '18px' }}
          >×</span>
        </td>
      </tr>
    )
  }

  return (
    <Layout title={invoice?.invoice_number ? 'Edit ' + invoice.invoice_number : 'Edit Invoice'}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: isMobile ? '0' : '0 24px' }}>

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

        {/* Document Header */}
        <div style={sec}>
          <div style={grid('repeat(3, 1fr)')}>
            <div><label style={lbl}>Invoice Number</label>
              <input style={{ ...inp, fontWeight: 'bold', color: '#CC0000', backgroundColor: '#fafafa' }} value={invoice.invoice_number || ''} readOnly /></div>
            <div><label style={lbl}>Issue Date</label>
              <input type="date" style={inp} value={invoice.issue_date || ''} onChange={e => updateInvoice('issue_date', e.target.value)} /></div>
            <div><label style={lbl}>Due Date</label>
              <input type="date" style={inp} value={invoice.due_date || ''} onChange={e => updateInvoice('due_date', e.target.value)} /></div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={lbl}>Invoice Title <span style={{ color:'#aaa',fontWeight:'normal' }}>(optional)</span></label>
            <input style={inp} value={invoiceTitle} onChange={e => setInvoiceTitle(e.target.value)} placeholder="e.g. Supply and Installation of Electrical Fittings" />
          </div>
        </div>

        {/* Client */}
        <div style={sec}>
          <h3 style={secT}>Client Details</h3>
          <ClientSelector
            value={invoice.client_id}
            clientName={invoice.client_name}
            onClientChange={(clientId, clientName) => {
              updateInvoice('client_id', clientId)
              updateInvoice('client_name', clientName)
            }}
          />
          <div style={{ marginTop: '16px' }}>
            <label style={lbl}>Work Duration <span style={{ color:'#aaa',fontWeight:'normal' }}>(optional)</span></label>
            <input style={inp} value={invoice.work_duration || ''} onChange={e => updateInvoice('work_duration', e.target.value)} placeholder="e.g. 4-6 weeks" />
          </div>
        </div>

        {/* Custom header fields */}
        {customFields.length > 0 && (
          <div style={sec}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ ...secT, margin: 0 }}>Additional Details</h3>
              <div onClick={() => setCustomFields([])} style={{ fontSize: '12px', color: '#CC0000', cursor: 'pointer' }}>Clear all</div>
            </div>
            {customFields.map((field, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <input style={{ ...inp, flex: 1 }} value={field.label} onChange={e => setCustomFields(f => f.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Label" />
                <input style={{ ...inp, flex: 2 }} value={field.value} onChange={e => setCustomFields(f => f.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="Value" />
                <div onClick={() => setCustomFields(f => f.filter((_, j) => j !== i))} style={{ cursor: 'pointer', color: '#CC0000', fontSize: '18px', padding: '0 4px' }}>×</div>
              </div>
            ))}
            <div onClick={() => setCustomFields(f => [...f, { label: '', value: '' }])} style={{ color: '#6366F1', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>+ Add Field</div>
          </div>
        )}

        {/* Line Items */}
        <div style={sec}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ ...secT, margin: 0 }}>Line Items</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div onClick={() => setShowColumnManager(true)} style={{ padding: '8px 14px', backgroundColor: '#F0F0FF', color: '#6366F1', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>⚙ Columns</div>
              <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowCSVNote(p=>!p)} style={{ padding: '8px 14px', backgroundColor: '#16A34A', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Import CSV ▾</div>
                {showCSVNote && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 500, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.18)', padding: '16px', width: '320px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', marginBottom: '10px', borderBottom: '2px solid #eee' }}>
                      {['Upload File','Paste CSV'].map(tab => (
                        <div key={tab} onClick={()=>setCSVTab(tab)} style={{ padding:'8px 14px',cursor:'pointer',fontSize:'13px',fontWeight:'bold',color:csvTab===tab?'#CC0000':'#888',borderBottom:csvTab===tab?'2px solid #CC0000':'2px solid transparent',marginBottom:'-2px' }}>{tab}</div>
                      ))}
                    </div>
                    <div style={{ fontSize:'11px',color:'#888',marginBottom:'10px',lineHeight:'1.7',backgroundColor:'#f8f8f8',padding:'8px',borderRadius:'6px' }}>
                      <strong>Required:</strong> description, quantity, unit_price<br/>
                      <strong>Optional:</strong> sub_description, unit
                    </div>
                    {csvTab==='Upload File'
                      ? <div onClick={()=>{setShowCSVNote(false);csvRef.current.click()}} style={{ padding:'10px 14px',backgroundColor:'#16A34A',color:'white',borderRadius:'6px',cursor:'pointer',fontSize:'13px',textAlign:'center',fontWeight:'bold' }}>Choose File</div>
                      : <div>
                          <textarea value={pasteCSV} onChange={e=>setPasteCSV(e.target.value)} onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()} placeholder={'description,quantity,unit_price\nCable tie,5,700'} style={{ width:'100%',height:'110px',padding:'8px',border:'1px solid #ddd',borderRadius:'6px',fontSize:'12px',fontFamily:'monospace',outline:'none',boxSizing:'border-box',resize:'vertical',display:'block' }} autoFocus />
                          <div style={{ display:'flex',gap:'8px',marginTop:'8px' }}>
                            <div onClick={()=>{setPasteCSV('');setShowCSVNote(false)}} style={{ padding:'8px 12px',border:'1px solid #ddd',borderRadius:'6px',cursor:'pointer',fontSize:'12px',color:'#555' }}>Cancel</div>
                            <div onClick={()=>{
                              if(!pasteCSV.trim())return
                              const lines=pasteCSV.split('\n').filter(l=>l.trim())
                              if(lines.length<2){alert('Need header row + at least one data row');return}
                              const headers=lines[0].split(',').map(h=>h.trim().toLowerCase())
                              const newItems=[]
                              for(let i=1;i<lines.length;i++){const cols=lines[i].split(',').map(c=>c.trim());if(!cols[0])continue;const row={};headers.forEach((h,idx)=>{row[h]=cols[idx]||''});newItems.push({...makeEmptyItem(),description:row['description']||cols[0],sub_description:row['sub_description']||'',quantity:Number(row['quantity']||1),unit:(row['unit']||'').toUpperCase(),unit_price:Number(row['unit_price']||0),sort_order:newItems.length})}
                              if(newItems.length>0){setItems(p=>[...p.filter(i=>i.description),...newItems]);setPasteCSV('');setShowCSVNote(false);alert(newItems.length+' items imported')}
                            }} style={{ flex:1,padding:'8px 14px',backgroundColor:'#16A34A',color:'white',borderRadius:'6px',cursor:'pointer',fontSize:'12px',fontWeight:'bold',textAlign:'center' }}>Import</div>
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
                        <span onClick={() => deleteGroup(group.id)} style={{ color: '#ff6b6b', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}>×</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <div onClick={() => toggleGroupSubtotal(group.id)} style={{ width: '36px', height: '20px', borderRadius: '10px', backgroundColor: group.showSubtotal ? '#16A34A' : '#555', position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', left: group.showSubtotal ? '18px' : '2px', transition: 'left 0.2s' }} />
                          </div>
                          <span style={{ color: '#ccc', fontSize: '12px' }}>Show subtotal</span>
                        </label>
                        {group.showSubtotal && (
                          <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: '13px', fontWeight: 'bold' }}>
                            ₦{groupSubtotal.toLocaleString()}
                          </span>
                        )}
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
                          <input style={inp} value={item.description||''} onChange={e=>updateItem(index,'description',e.target.value)} placeholder="Item description" />
                          <input style={{ ...inp,marginTop:'4px',fontSize:'13px',color:'#888' }} value={item.sub_description||''} onChange={e=>updateItem(index,'sub_description',e.target.value)} placeholder="Sub-description (optional)" />
                        </td>
                        {isVisible('make')&&<td style={{ padding:'8px 12px' }}><input style={inp} value={item.make||''} onChange={e=>updateItem(index,'make',e.target.value)} placeholder="Brand" /></td>}
                        <td style={{ padding:'8px 12px' }}><input style={inp} type="number" min="0" value={item.quantity} onChange={e=>updateItem(index,'quantity',Number(e.target.value))} /></td>
                        {isVisible('unit')&&<td style={{ padding:'8px 12px',minWidth:'100px' }}><UnitInput value={item.unit||''} onChange={val=>updateItem(index,'unit',val)} /></td>}
                        <td style={{ padding:'8px 12px' }}><input style={inp} type="number" min="0" value={item.unit_price} onChange={e=>updateItem(index,'unit_price',Number(e.target.value))} /></td>
                        <td style={{ padding:'8px 12px',fontWeight:'bold',color:'#1a1a1a',whiteSpace:'nowrap' }}>NGN {(Number(item.quantity)*Number(item.unit_price)).toLocaleString()}</td>
                        {isVisible('install_rate')&&(
                          <td style={{ padding:'8px 12px' }}>
                            <input style={inp} type="number" min="0"
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
                              onChange={e=>{ const val=e.target.value; updateItem(index,'vat_rate', val==='' ? null : Number(val)) }}
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
                              <input style={{ ...inp, textAlign:'center', backgroundColor: isExcluded ? '#fff0f0' : hasOverride ? '#fffbe6' : '#f9f9f9', color: isExcluded ? '#CC0000' : '#1a1a1a' }}
                                type="number" min="0" max="100"
                                value={hasOverride ? drVal : ''}
                                placeholder="global"
                                onChange={e => { const val=e.target.value; updateItem(index,'discount_rate', val==='' ? null : Number(val)) }}
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
                            <input style={inp} type={col.type==='number' ? 'number' : 'text'}
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
                    <div style={{ fontSize:'12px',color:'#999' }}>Shows "5 Sets" instead of separate columns</div>
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
          <div style={{ fontSize:'12px',color:'#999',marginBottom:'12px' }}>Files attached here appear as download links on the invoice view.</div>
          <AttachmentsPanel attachments={attachments} onChange={setAttachments} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile?'1fr':'1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={sec}>
            <h3 style={secT}>Additional Charges</h3>
            <div style={{ marginBottom: '12px' }}>
              {['workmanship','transportation','shipping'].map(key => (
                <div key={key} style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px' }}>
                  <input style={{ ...inp,flex:1,fontSize:'13px' }} value={chargeLabels[key]} onChange={e=>setChargeLabels(l=>({...l,[key]:e.target.value}))} />
                  <input style={{ ...inp,width:'130px',flex:'none' }} type="number" min="0" value={invoice[key]||0} onChange={e=>updateInvoice(key,Number(e.target.value))} />
                </div>
              ))}
            </div>
            {extraCharges.map((charge,i) => (
              <div key={i} style={{ display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px' }}>
                <input style={{ ...inp,flex:1,fontSize:'13px' }} value={charge.label} onChange={e=>setExtraCharges(ec=>ec.map((c,j)=>j===i?{...c,label:e.target.value}:c))} placeholder="Charge name" />
                <input style={{ ...inp,width:'100px',flex:'none' }} type="number" min="0" value={charge.value||0} onChange={e=>setExtraCharges(ec=>ec.map((c,j)=>j===i?{...c,value:Number(e.target.value)}:c))} />
                <div onClick={()=>setExtraCharges(ec=>ec.filter((_,j)=>j!==i))} style={{ cursor:'pointer',color:'#CC0000',fontSize:'18px',padding:'0 4px' }}>×</div>
              </div>
            ))}
            <div style={{ display:'flex',gap:'8px',marginTop:'8px',flexWrap:'wrap' }}>
              <div onClick={()=>setExtraCharges(ec=>[...ec,{label:'',value:0,withTax:true}])} style={{ padding:'6px 12px',border:'1px dashed #16A34A',borderRadius:'6px',color:'#16A34A',cursor:'pointer',fontSize:'12px' }}>+ Charge (with VAT)</div>
              <div onClick={()=>setExtraCharges(ec=>[...ec,{label:'',value:0,withTax:false}])} style={{ padding:'6px 12px',border:'1px dashed #888',borderRadius:'6px',color:'#888',cursor:'pointer',fontSize:'12px' }}>+ Charge (no VAT)</div>
            </div>
          </div>

          <div style={sec}>
            <h3 style={secT}>Tax & Discount</h3>
            <div style={{ marginBottom:'12px' }}>
              <label style={lbl}>VAT %</label>
              <input style={inp} type="number" min="0" value={invoice.vat||0} onChange={e=>updateInvoice('vat',Number(e.target.value))} />
            </div>
            <div style={{ marginBottom:'12px' }}>
              <label style={lbl}>Discount</label>
              <div style={{ display:'flex',borderRadius:'6px',overflow:'hidden',border:'1px solid #ddd',marginBottom:'6px' }}>
                {['percent','fixed'].map(t=><div key={t} onClick={()=>setDiscountType(t)} style={{ flex:1,padding:'7px',textAlign:'center',cursor:'pointer',fontSize:'12px',backgroundColor:discountType===t?'#1a1a1a':'white',color:discountType===t?'white':'#555' }}>{t==='percent'?'%':'NGN'}</div>)}
              </div>
              <div style={{ display:'flex',borderRadius:'6px',overflow:'hidden',border:'1px solid #ddd',marginBottom:'6px' }}>
                {['before','after'].map(t=><div key={t} onClick={()=>setDiscountTiming(t)} style={{ flex:1,padding:'7px',textAlign:'center',cursor:'pointer',fontSize:'12px',backgroundColor:discountTiming===t?'#1a1a1a':'white',color:discountTiming===t?'white':'#555' }}>{t==='before'?'Before Tax':'After Tax'}</div>)}
              </div>
              <input style={inp} type="number" min="0" value={invoice.discount||0} onChange={e=>updateInvoice('discount',Number(e.target.value))} />
            </div>
            <div>
              <label style={lbl}>WHT</label>
              <div style={{ display:'flex',borderRadius:'6px',overflow:'hidden',border:'1px solid #ddd',marginBottom:'6px' }}>
                {['percent','flat'].map(t=><div key={t} onClick={()=>setWhtType(t)} style={{ flex:1,padding:'7px',textAlign:'center',cursor:'pointer',fontSize:'12px',backgroundColor:whtType===t?'#1a1a1a':'white',color:whtType===t?'white':'#555' }}>{t==='percent'?'%':'NGN Flat'}</div>)}
              </div>
              <input style={inp} type="number" min="0" value={invoice.wht||0} onChange={e=>updateInvoice('wht',Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={sec}>
          <h3 style={secT}>Summary</h3>
          {[
            { label: 'Subtotal', value: rawSubtotal },
            fixedChargesTotal>0?{label:'Fixed Charges',value:fixedChargesTotal}:null,
            extraWithTax>0?{label:'Extra Charges (taxable)',value:extraWithTax}:null,
            discountTiming==='before'&&discountAmount>0?{label:discountType==='percent'?`Discount (${invoice.discount||0}%)`:'Discount',value:-discountAmount}:null,
            { label:`VAT (${invoice.vat||0}%)`, value:vatAmount },
            installRateTotal>0?{label:'Install Rate Total',value:installRateTotal}:null,
            extraWithoutTax>0?{label:'Extra Charges (excl. tax)',value:extraWithoutTax}:null,
            discountTiming==='after'&&discountAmount>0?{label:discountType==='percent'?`Discount (${invoice.discount||0}%)`:'Discount',value:-discountAmount}:null,
          ].filter(Boolean).map(({label,value})=>(
            <div key={label} style={{ display:'flex',justifyContent:'space-between',marginBottom:'8px',fontSize:'14px' }}>
              <span style={{ color:'#555' }}>{label}</span>
              <span style={{ fontWeight:'bold' }}>NGN {Math.abs(value).toLocaleString(undefined,{minimumFractionDigits:2})}{value < 0 ? ' (deducted)' : ''}</span>
            </div>
          ))}
          <div style={{ borderTop:'2px solid #1a1a1a',paddingTop:'12px',marginTop:'8px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ fontWeight:'bold',fontSize:'15px' }}>Grand Total</span>
            <span style={{ fontWeight:'bold',fontSize:'18px',color:'#CC0000' }}>NGN {grandTotal.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
          </div>
          {whtAmount > 0 && (
            <div style={{ display:'flex',justifyContent:'space-between',marginTop:'8px',fontSize:'13px',color:'#CC0000',borderTop:'1px dashed #ddd',paddingTop:'8px' }}>
              <span>Less WHT ({whtType==='percent'?`${invoice.wht}%`:`NGN ${invoice.wht}`})</span>
              <span>- NGN {whtAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
            </div>
          )}
          <div style={{ borderTop:'2px solid #CC0000',paddingTop:'10px',marginTop:'8px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ fontWeight:'bold',fontSize:'15px' }}>Total Payable</span>
            <span style={{ fontWeight:'bold',fontSize:'20px',color:'#1a1a1a' }}>NGN {totalPayable.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
          </div>
          <div style={{ marginTop:'12px',padding:'10px',backgroundColor:'#f9f9f9',borderRadius:'6px',fontSize:'12px',color:'#555',fontStyle:'italic' }}>
            {numberToWords(totalPayable)}
          </div>
        </div>

        {/* Bottom fields */}
        {bottomFields.length > 0 && (
          <div style={sec}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
              <h3 style={{ ...secT, margin: 0 }}>Additional Information</h3>
              <div onClick={()=>setBottomFields([])} style={{ fontSize:'12px',color:'#CC0000',cursor:'pointer' }}>Clear</div>
            </div>
            {bottomFields.map((field,i) => (
              <div key={i} style={{ display:'flex',gap:'8px',marginBottom:'10px',alignItems:'center' }}>
                <input style={{ ...inp,flex:1 }} value={field.text} onChange={e=>setBottomFields(f=>f.map((x,j)=>j===i?{...x,text:e.target.value}:x))} placeholder="Text" />
                <div onClick={()=>setBottomFields(f=>f.filter((_,j)=>j!==i))} style={{ cursor:'pointer',color:'#CC0000',fontSize:'18px' }}>×</div>
              </div>
            ))}
          </div>
        )}

        {/* Notes & Terms */}
        <div style={{ display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'20px',marginBottom:'20px' }}>
          <div style={sec}>
            <input style={{ ...inp,fontWeight:'bold',color:'#0056B3',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px',padding:'4px 8px',border:'none',borderBottom:'2px solid #0056B3',borderRadius:0,marginBottom:'10px' }} value={notesTitle} onChange={e=>setNotesTitle(e.target.value)} />
            <RichTextEditor value={invoice.notes||''} onChange={val=>updateInvoice('notes',val)} placeholder="Add notes..." />
          </div>
          <div style={sec}>
            <input style={{ ...inp,fontWeight:'bold',color:'#0056B3',fontSize:'12px',textTransform:'uppercase',letterSpacing:'1px',padding:'4px 8px',border:'none',borderBottom:'2px solid #0056B3',borderRadius:0,marginBottom:'10px' }} value={termsTitle} onChange={e=>setTermsTitle(e.target.value)} />
            <RichTextEditor value={invoice.terms||''} onChange={val=>updateInvoice('terms',val)} placeholder="Terms and conditions..." />
          </div>
        </div>

        {/* Payment Terms */}
        <div style={sec}>
          <h3 style={secT}>Payment Terms</h3>
          <select style={inp} value={invoice.payment_terms||''} onChange={e=>updateInvoice('payment_terms',e.target.value)}>
            <option value="">Select payment terms</option>
            {['Net 7','Net 14','Net 30','Net 60','Due on Receipt','50% Upfront','Custom'].map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          {invoice.payment_terms === 'Custom' && (
            <div style={{ marginTop:'10px' }}>
              <input style={inp} value={invoice.custom_payment_terms||''} onChange={e=>updateInvoice('custom_payment_terms',e.target.value)} placeholder="e.g. 60% downpayment, 40% on delivery" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display:'flex',flexDirection:'column',gap:'10px',paddingBottom:'40px',maxWidth:'400px',marginLeft:'auto' }}>
          <div onClick={()=>handleSave('sent')} style={{ padding:'14px 24px',borderRadius:'8px',cursor:'pointer',fontSize:'15px',backgroundColor:'#CC0000',color:'white',fontWeight:'bold',textAlign:'center' }}>{saving?'Saving...':'Save Changes'}</div>
          <div onClick={()=>handleSave('draft')} style={{ padding:'14px 24px',borderRadius:'8px',cursor:'pointer',fontSize:'15px',backgroundColor:'#555',color:'white',textAlign:'center' }}>{saving?'Saving...':'Save as Draft'}</div>
          <div onClick={()=>navigate('/invoices/'+id)} style={{ padding:'14px 24px',borderRadius:'8px',cursor:'pointer',fontSize:'15px',border:'1px solid #ddd',backgroundColor:'white',textAlign:'center',color:'#555' }}>Cancel</div>
        </div>

      </div>
    </Layout>
  )
}
