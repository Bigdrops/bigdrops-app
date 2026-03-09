import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import UnitInput from '../components/UnitInput'

const emptyItem = {
  description: '',
  sub_description: '',
  make: '',
  quantity: 1,
  unit: '',
  unit_price: 0,
  install_rate: 0,
  install_rate_taxable: false,
  show_install_rate: true,
  row_type: 'standard',
  group_name: '',
  formula: '',
  sort_order: 0,
}

const DEFAULT_COLUMNS = [
  { key: 'make', label: 'Make', visible: true },
  { key: 'unit', label: 'Unit', visible: true },
  { key: 'install_rate', label: 'Install Rate', visible: true },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function NewInvoice() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [discountType, setDiscountType] = useState('fixed')
  const [showCSVNote, setShowCSVNote] = useState(false)
  const [csvTab, setCSVTab] = useState('Upload File')
  const [pasteCSV, setPasteCSV] = useState('')
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [customFields, setCustomFields] = useState([])
  const csvRef = useRef()
  const isMobile = useIsMobile()

  const [invoice, setInvoice] = useState({
    invoice_number: '',
    client_id: '',
    client_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'draft',
    document_type: 'INVOICE',
    payment_terms: 'Net 30',
    custom_payment_terms: '',
    notes: '',
    terms: '',
    workmanship: 0,
    transportation: 0,
    shipping: 0,
    discount: 0,
    vat: 7.5,
    wht: 0,
    is_advance: false,
    advance_percentage: 0,
    work_duration: '',
    amount_in_words: '',
  })

  const [items, setItems] = useState([{ ...emptyItem }])

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => setClients(data || []))
    supabase.from('invoices').select('invoice_number').order('created_at', { ascending: false }).limit(1).then(({ data }) => {
      if (data && data.length > 0) {
        const last = data[0].invoice_number
        const num = parseInt(last.replace('SASINV-B', '')) + 1
        setInvoice(i => ({ ...i, invoice_number: 'SASINV-B' + String(num).padStart(3, '0') }))
      } else {
        setInvoice(i => ({ ...i, invoice_number: 'SASINV-B001' }))
      }
    })
  }, [])

  const updateInvoice = (field, value) => setInvoice(i => ({ ...i, [field]: value }))
  const updateItem = (index, field, value) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }
  const addItem = () => setItems([...items, { ...emptyItem, sort_order: items.length }])
  const addGroupHeader = () => setItems([...items, { ...emptyItem, row_type: 'group_header', sort_order: items.length }])
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))

  const addCustomField = () => setCustomFields(f => [...f, { label: '', value: '' }])
  const updateCustomField = (index, key, val) => {
    const updated = [...customFields]
    updated[index] = { ...updated[index], [key]: val }
    setCustomFields(updated)
  }
  const removeCustomField = (index) => setCustomFields(customFields.filter((_, i) => i !== index))

  const toggleColumn = (key) => setColumns(cols => cols.map(c => c.key === key ? { ...c, visible: !c.visible } : c))
  const isVisible = (key) => columns.find(c => c.key === key)?.visible !== false

  const handleCSVImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
      const newItems = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''))
        if (!cols[0]) continue
        const row = {}
        headers.forEach((h, idx) => { row[h] = cols[idx] || '' })
        newItems.push({ ...emptyItem, description: row['description'] || cols[0] || '', sub_description: row['sub_description'] || '', make: row['make'] || '', quantity: Number(row['quantity'] || row['qty'] || 1), unit: row['unit'] || '', unit_price: Number(row['unit_price'] || row['price'] || 0), sort_order: newItems.length })
      }
      if (newItems.length > 0) {
        setItems(prev => [...prev.filter(i => i.description), ...newItems])
        alert(newItems.length + ' items imported successfully')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const standardItems = items.filter(i => i.row_type === 'standard')
  const subtotal = standardItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0)
  const vatAmount = subtotal * (Number(invoice.vat) / 100)
  const installRateTotal = standardItems.reduce((sum, i) => sum + Number(i.install_rate || 0), 0)
  const extras = Number(invoice.workmanship || 0) + Number(invoice.transportation || 0) + Number(invoice.shipping || 0) + installRateTotal
  const discountAmount = discountType === 'percent' ? (subtotal + vatAmount + extras) * (Number(invoice.discount) / 100) : Number(invoice.discount || 0)
  const total = subtotal + vatAmount + extras - discountAmount
  const whtAmount = total * (Number(invoice.wht) / 100)

  const numberToWords = (num) => {
    if (!num || num === 0) return 'ZERO NAIRA ONLY'
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
    const convert = (n) => {
      if (n < 20) return ones[n]
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
      if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 ? ' ' + convert(n % 100) : '')
      if (n < 1000000) return convert(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 ? ' ' + convert(n % 1000) : '')
      if (n < 1000000000) return convert(Math.floor(n / 1000000)) + ' MILLION' + (n % 1000000 ? ' ' + convert(n % 1000000) : '')
      return convert(Math.floor(n / 1000000000)) + ' BILLION' + (n % 1000000000 ? ' ' + convert(n % 1000000000) : '')
    }
    const naira = Math.floor(num)
    const kobo = Math.round((num - naira) * 100)
    return convert(naira) + ' NAIRA' + (kobo > 0 ? ' AND ' + convert(kobo) + ' KOBO' : '') + ' ONLY'
  }

  const handleSave = async (status) => {
    setSaving(true)
    const amountInWords = numberToWords(total)
    const paymentTermsValue = invoice.payment_terms === 'Custom' ? invoice.custom_payment_terms : invoice.payment_terms
    const customFieldsJSON = JSON.stringify(customFields.filter(f => f.label && f.value))

    const { data: inv, error } = await supabase.from('invoices').insert([{
      invoice_number: invoice.invoice_number,
      client_id: invoice.client_id || null,
      client_name: invoice.client_name,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date || null,
      status,
      document_type: invoice.document_type,
      payment_terms: paymentTermsValue,
      notes: invoice.notes,
      terms: invoice.terms,
      workmanship: invoice.workmanship,
      transportation: invoice.transportation,
      shipping: invoice.shipping,
      discount: discountAmount,
      vat: vatAmount,
      wht: invoice.wht,
      is_advance: invoice.is_advance,
      advance_percentage: invoice.advance_percentage,
      custom_fields: customFieldsJSON,
      work_duration: invoice.work_duration,
      subtotal,
      install_rate_total: installRateTotal,
      total,
      amount_in_words: amountInWords,
    }]).select().single()

    if (error) { alert('Error saving invoice: ' + error.message); setSaving(false); return }

    await supabase.from('invoice_items').insert(items.map((item, i) => ({ ...item, invoice_id: inv.id, sort_order: i, amount: Number(item.quantity) * Number(item.unit_price), vat_rate: 0 })))
    setSaving(false)
    navigate('/invoices')
  }

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', backgroundColor: 'white' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }
  const sectionStyle = { backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' }
  const sectionTitleStyle = { margin: '0 0 16px 0', color: '#0056B3', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }
  const getGridStyle = (cols) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : cols, gap: '16px' })

  return (
    <Layout title="New Invoice">
      <div style={{ maxWidth: '1100px' }}>

        {/* Column Manager Modal */}
        {showColumnManager && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '400px', margin: '20px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#1a1a1a' }}>Edit Columns / Formulas</h3>
                <span onClick={() => setShowColumnManager(false)} style={{ cursor: 'pointer', fontSize: '22px', color: '#888', lineHeight: 1 }}>×</span>
              </div>
              <div style={{ marginBottom: '12px', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toggle Visibility</div>
              {columns.map(col => (
                <div key={col.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: '14px', color: '#1a1a1a' }}>{col.label}</span>
                  <div onClick={() => toggleColumn(col.key)} style={{ width: '48px', height: '26px', borderRadius: '13px', backgroundColor: col.visible ? '#6366F1' : '#ddd', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                    <div style={{ position: 'absolute', top: '3px', left: col.visible ? '24px' : '3px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: '12px', color: '#999', marginTop: '16px', marginBottom: '20px' }}>Hidden columns are removed from both the form and the PDF.</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div onClick={() => setColumns(DEFAULT_COLUMNS)} style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', color: '#555' }}>Reset</div>
                <div onClick={() => setShowColumnManager(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#6366F1', color: 'white', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Done</div>
              </div>
            </div>
          </div>
        )}

        {/* Document Header */}
        <div style={sectionStyle}>
          <div style={getGridStyle('repeat(4, 1fr)')}>
            <div>
              <label style={labelStyle}>Document Type</label>
              <select style={inputStyle} value={invoice.document_type} onChange={e => updateInvoice('document_type', e.target.value)}>
                <option>INVOICE</option>
                <option>TAX INVOICE</option>
                <option>PROFORMA INVOICE</option>
                <option>ADVANCE INVOICE</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Invoice Number</label>
              <input style={{ ...inputStyle, fontWeight: 'bold', color: '#CC0000' }} value={invoice.invoice_number} onChange={e => updateInvoice('invoice_number', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Issue Date</label>
              <input type="date" style={inputStyle} value={invoice.issue_date} onChange={e => updateInvoice('issue_date', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" style={inputStyle} value={invoice.due_date} onChange={e => updateInvoice('due_date', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Client */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Client Details</h3>
          <div style={getGridStyle('1fr 1fr')}>
            <div>
              <label style={labelStyle}>Select Client</label>
              <select style={inputStyle} value={invoice.client_id} onChange={e => {
                const client = clients.find(c => c.id === e.target.value)
                updateInvoice('client_id', e.target.value)
                updateInvoice('client_name', client ? client.name : '')
              }}>
                <option value="">— {clients.length} clients, select one —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Client Name</label>
              <input style={inputStyle} value={invoice.client_name} onChange={e => updateInvoice('client_name', e.target.value)} placeholder="Auto-filled or type manually" />
            </div>
          </div>
        </div>

        {/* Header Fields + Custom Fields */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Header Fields</h3>
          <div style={getGridStyle('1fr 1fr')}>
            <div>
              <label style={labelStyle}>Work Duration</label>
              <input style={inputStyle} value={invoice.work_duration} onChange={e => updateInvoice('work_duration', e.target.value)} placeholder="e.g. 7 days" />
            </div>
            <div>
              <label style={labelStyle}>Payment Terms</label>
              <select style={inputStyle} value={invoice.payment_terms} onChange={e => updateInvoice('payment_terms', e.target.value)}>
                <option>Net 30</option>
                <option>Net 60</option>
                <option>Due on receipt</option>
                <option>50% advance</option>
                <option>Custom</option>
              </select>
            </div>
          </div>

          {invoice.payment_terms === 'Custom' && (
            <div style={{ marginTop: '12px' }}>
              <label style={labelStyle}>Specify Payment Terms</label>
              <input style={inputStyle} value={invoice.custom_payment_terms} onChange={e => updateInvoice('custom_payment_terms', e.target.value)} placeholder="e.g. 60% downpayment, 40% on delivery" />
            </div>
          )}

          {/* Dynamic Custom Fields */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Custom Fields</label>
              <div onClick={addCustomField} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#6366F1', fontSize: '13px', fontWeight: 'bold' }}>
                <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Add Custom Field
              </div>
            </div>
            {customFields.length === 0 && (
              <div style={{ fontSize: '13px', color: '#bbb', fontStyle: 'italic' }}>Add fields like Engine No, Capacity, Serial No — they appear on the invoice header.</div>
            )}
            {customFields.map((field, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 36px', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <input style={inputStyle} value={field.label} onChange={e => updateCustomField(index, 'label', e.target.value)} placeholder="Label (e.g. Engine No)" />
                <input style={inputStyle} value={field.value} onChange={e => updateCustomField(index, 'value', e.target.value)} placeholder="Value (e.g. XYZ-123)" />
                <div onClick={() => removeCustomField(index)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#CC0000', fontSize: '22px', fontWeight: 'bold' }}>×</div>
              </div>
            ))}
          </div>
        </div>

        {/* Line Items */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Line Items</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
              <div onClick={() => setShowColumnManager(true)} style={{ padding: '8px 14px', backgroundColor: '#F0F0FF', color: '#6366F1', border: '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                ⚙ Columns
              </div>
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowCSVNote(p => !p)} style={{ padding: '8px 14px', backgroundColor: '#16A34A', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>Import CSV ▾</div>
                {showCSVNote && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 200, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', padding: '16px', width: '300px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', marginBottom: '12px', borderBottom: '2px solid #eee' }}>
                      {['Upload File', 'Paste CSV'].map(tab => (
                        <div key={tab} onClick={() => setCSVTab(tab)} style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: csvTab === tab ? '#CC0000' : '#888', borderBottom: csvTab === tab ? '2px solid #CC0000' : '2px solid transparent', marginBottom: '-2px' }}>{tab}</div>
                      ))}
                    </div>
                    {csvTab === 'Upload File' ? (
                      <div onClick={() => { setShowCSVNote(false); csvRef.current.click() }} style={{ padding: '8px 14px', backgroundColor: '#16A34A', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', textAlign: 'center' }}>Choose File</div>
                    ) : (
                      <div>
                        <textarea value={pasteCSV} onChange={e => setPasteCSV(e.target.value)} placeholder="description,make,quantity,unit,unit_price" style={{ width: '100%', height: '90px', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <div onClick={() => {
                            if (!pasteCSV.trim()) return
                            const lines = pasteCSV.split('\n').filter(l => l.trim())
                            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
                            const newItems = []
                            for (let i = 1; i < lines.length; i++) {
                              const cols = lines[i].split(',').map(c => c.trim())
                              if (!cols[0]) continue
                              const row = {}
                              headers.forEach((h, idx) => { row[h] = cols[idx] || '' })
                              newItems.push({ ...emptyItem, description: row['description'] || cols[0], make: row['make'] || '', quantity: Number(row['quantity'] || 1), unit: (row['unit'] || '').toUpperCase(), unit_price: Number(row['unit_price'] || 0), sort_order: newItems.length })
                            }
                            if (newItems.length > 0) { setItems(p => [...p.filter(i => i.description), ...newItems]); setPasteCSV(''); setShowCSVNote(false); alert(newItems.length + ' items imported') }
                          }} style={{ padding: '8px 14px', backgroundColor: '#16A34A', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Import</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div onClick={addGroupHeader} style={{ padding: '8px 14px', backgroundColor: '#1a1a1a', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>+ Group</div>
              <div onClick={addItem} style={{ padding: '8px 14px', backgroundColor: '#CC0000', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>+ Add Item</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a1a1a' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'center', color: 'white', width: '36px' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '200px' }}>Description</th>
                  {isVisible('make') && <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '80px' }}>Make</th>}
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '60px' }}>Qty</th>
                  {isVisible('unit') && <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '70px' }}>Unit</th>}
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '120px' }}>Rate (₦)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '120px' }}>Amount (₦)</th>
                  {isVisible('install_rate') && <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '100px' }}>Install Rate</th>}
                  <th style={{ padding: '10px 12px', color: 'white', width: '30px' }}></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let stdCount = 0
                  return items.map((item, index) => {
                    if (item.row_type === 'standard') stdCount++
                    const itemNum = stdCount
                    const colSpanCount = 2 + (isVisible('make') ? 1 : 0) + (isVisible('unit') ? 1 : 0) + (isVisible('install_rate') ? 1 : 0) + 2

                    return item.row_type === 'group_header' ? (
                      <tr key={index} style={{ backgroundColor: '#333' }}>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#888' }}>—</td>
                        <td colSpan={colSpanCount} style={{ padding: '10px 12px' }}>
                          <input style={{ width: '100%', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #555', fontSize: '14px', outline: 'none', padding: '4px' }} value={item.group_name} onChange={e => updateItem(index, 'group_name', e.target.value)} placeholder="Group name (e.g. Electrical Works)" />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <span onClick={() => removeItem(index)} style={{ color: '#ff6b6b', cursor: 'pointer', fontSize: '18px' }}>×</span>
                        </td>
                      </tr>
                    ) : (
                      <tr key={index} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fafafa' : 'white' }}>
                        <td style={{ padding: '8px', textAlign: 'center', color: '#999', fontSize: '12px', fontWeight: '700' }}>{itemNum}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <input style={inputStyle} value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} placeholder="Item description" />
                          <input style={{ ...inputStyle, marginTop: '4px', fontSize: '13px', color: '#888' }} value={item.sub_description} onChange={e => updateItem(index, 'sub_description', e.target.value)} placeholder="Sub-description (optional)" />
                        </td>
                        {isVisible('make') && (
                          <td style={{ padding: '8px 12px' }}>
                            <input style={inputStyle} value={item.make} onChange={e => updateItem(index, 'make', e.target.value)} placeholder="Brand" />
                          </td>
                        )}
                        <td style={{ padding: '8px 12px' }}>
                          <input style={inputStyle} type="number" min="0" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} />
                        </td>
                        {isVisible('unit') && (
                          <td style={{ padding: '8px 12px', minWidth: '100px' }}>
                            <UnitInput value={item.unit} onChange={val => updateItem(index, 'unit', val)} />
                          </td>
                        )}
                        <td style={{ padding: '8px 12px' }}>
                          <input style={inputStyle} type="number" min="0" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', Number(e.target.value))} />
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#1a1a1a' }}>
                          ₦{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}
                        </td>
                        {isVisible('install_rate') && (
                          <td style={{ padding: '8px 12px' }}>
                            <input style={inputStyle} type="number" min="0" value={item.install_rate} onChange={e => updateItem(index, 'install_rate', Number(e.target.value))} />
                          </td>
                        )}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span onClick={() => removeItem(index)} style={{ color: '#CC0000', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>×</span>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charges & Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Additional Charges</h3>
            {[
              { label: 'Workmanship (₦)', field: 'workmanship' },
              { label: 'Transportation (₦)', field: 'transportation' },
              { label: 'Shipping (₦)', field: 'shipping' },
              { label: 'VAT %', field: 'vat' },
              { label: 'WHT %', field: 'wht' },
            ].map(({ label, field }) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '4px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
                <input type="number" min="0" style={{ ...inputStyle, width: isMobile ? '100%' : '160px', textAlign: 'right' }} value={invoice[field]} onChange={e => updateInvoice(field, Number(e.target.value))} />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '4px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Discount</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  <div onClick={() => setDiscountType('fixed')} style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: discountType === 'fixed' ? '#CC0000' : 'white', color: discountType === 'fixed' ? 'white' : '#555', fontWeight: 'bold' }}>₦</div>
                  <div onClick={() => setDiscountType('percent')} style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: discountType === 'percent' ? '#CC0000' : 'white', color: discountType === 'percent' ? 'white' : '#555', fontWeight: 'bold' }}>%</div>
                </div>
                <input type="number" min="0" style={{ ...inputStyle, width: '100px', textAlign: 'right' }} value={invoice.discount} onChange={e => updateInvoice('discount', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Summary</h3>
            {[
              { label: 'Subtotal', value: subtotal },
              { label: `VAT (${invoice.vat}%)`, value: vatAmount },
              { label: 'Workmanship', value: Number(invoice.workmanship || 0) },
              { label: 'Transportation', value: Number(invoice.transportation || 0) },
              { label: 'Shipping', value: Number(invoice.shipping || 0) },
              { label: 'Install Rate Total', value: installRateTotal },
              { label: discountType === 'percent' ? `Discount (${invoice.discount}%)` : 'Discount', value: -discountAmount },
            ].filter(r => r.value !== 0).map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#555' }}>{label}</span>
                <span style={{ color: value < 0 ? '#CC0000' : '#1a1a1a' }}>₦{Math.abs(value).toLocaleString()}{value < 0 ? ' (-)' : ''}</span>
              </div>
            ))}
            <div style={{ borderTop: '2px solid #1a1a1a', paddingTop: '12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>TOTAL (NGN)</span>
              <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#CC0000' }}>₦{total.toLocaleString()}</span>
            </div>
            {Number(invoice.wht) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px', color: '#555', borderTop: '1px dashed #ddd', paddingTop: '8px' }}>
                <span>WHT ({invoice.wht}%) — shown separately</span>
                <span>₦{whtAmount.toLocaleString()}</span>
              </div>
            )}
            <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '6px', fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
              {numberToWords(total)}
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div style={sectionStyle}>
          <div style={getGridStyle('1fr 1fr')}>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={invoice.notes} onChange={e => updateInvoice('notes', e.target.value)} placeholder="Notes to client..." />
            </div>
            <div>
              <label style={labelStyle}>Terms and Conditions</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={invoice.terms} onChange={e => updateInvoice('terms', e.target.value)} placeholder="Terms and conditions..." />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingBottom: '40px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div onClick={() => navigate('/invoices')} style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', border: '1px solid #ddd', backgroundColor: 'white', flex: isMobile ? '1 1 100%' : 'none', textAlign: 'center' }}>Cancel</div>
          <div onClick={() => handleSave('draft')} style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: '#555', color: 'white', flex: isMobile ? '1 1 100%' : 'none', textAlign: 'center' }}>{saving ? 'Saving...' : 'Save as Draft'}</div>
          <div onClick={() => handleSave('sent')} style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: '#CC0000', color: 'white', fontWeight: 'bold', flex: isMobile ? '1 1 100%' : 'none', textAlign: 'center' }}>{saving ? 'Saving...' : 'Save and Send'}</div>
        </div>

      </div>
    </Layout>
  )
}
