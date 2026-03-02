import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

export default function EditInvoice() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState([])
  const [discountType, setDiscountType] = useState('fixed')
  const [showCSVNote, setShowCSVNote] = useState(false)
  const [csvTab, setCSVTab] = useState('Upload File')
  const [pasteCSV, setPasteCSV] = useState('')
  const csvRef = useRef()

  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => setClients(data || []))
    supabase.from('invoices').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setInvoice(data)
    })
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order').then(({ data }) => {
      setItems(data && data.length > 0 ? data : [{ ...emptyItem }])
      setLoading(false)
    })
  }, [id])

  const updateInvoice = (field, value) => setInvoice(i => ({ ...i, [field]: value }))

  const updateItem = (index, field, value) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const addItem = () => setItems([...items, { ...emptyItem, sort_order: items.length }])
  const addGroupHeader = () => setItems([...items, { ...emptyItem, row_type: 'group_header', sort_order: items.length }])
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))

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
        newItems.push({
          ...emptyItem,
          description: row['description'] || cols[0] || '',
          sub_description: row['sub_description'] || '',
          make: row['make'] || '',
          quantity: Number(row['quantity'] || 1),
          unit: (row['unit'] || '').toUpperCase(),
          unit_price: Number(row['unit_price'] || 0),
          sort_order: newItems.length,
        })
      }
      if (newItems.length > 0) {
        setItems(prev => [...prev.filter(i => i.description), ...newItems])
        alert(newItems.length + ' items imported')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (loading || !invoice) return <Layout title="Edit Invoice"><p style={{ padding: 30 }}>Loading...</p></Layout>

  const standardItems = items.filter(i => i.row_type === 'standard')
  const subtotal = standardItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price)), 0)
  const vatAmount = subtotal * (Number(invoice.vat) / 100)
  const installRateTotal = standardItems.reduce((sum, i) => sum + Number(i.install_rate || 0), 0)
  const extras = Number(invoice.workmanship || 0) + Number(invoice.transportation || 0) + Number(invoice.shipping || 0) + installRateTotal
  const discountAmount = discountType === 'percent'
    ? (subtotal + vatAmount + extras) * (Number(invoice.discount) / 100)
    : Number(invoice.discount || 0)
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
    const { data: updatedData, error } = await supabase.from('invoices').update({
      ...invoice,
      status,
      subtotal,
      vat: vatAmount,
      install_rate_total: installRateTotal,
      discount: discountAmount,
      total,
      amount_in_words: amountInWords,
    }).eq('id', id)

    console.log('update result:', updatedData, error)
    if (error) { alert('Error saving: ' + error.message); setSaving(false); return }

    await supabase.from('invoice_items').delete().eq('invoice_id', id)
    const itemsToSave = items.map((item, i) => ({
      ...item,
      id: undefined,
      invoice_id: id,
      sort_order: i,
      amount: Number(item.quantity) * Number(item.unit_price),
      vat_rate: 0,
    }))
    await supabase.from('invoice_items').insert(itemsToSave)

    setSaving(false)
    navigate('/invoices/' + id)
  }

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }
  const sectionStyle = { backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' }
  const sectionTitleStyle = { margin: '0 0 16px 0', color: '#0056B3', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }

  return (
    <Layout title={'Edit ' + invoice.invoice_number}>
      <div style={{ maxWidth: '1100px' }}>

        <div style={sectionStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
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
              <input type="date" style={inputStyle} value={invoice.due_date || ''} onChange={e => updateInvoice('due_date', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Client Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Select Client</label>
              <select style={inputStyle} value={invoice.client_id || ''} onChange={e => {
                const client = clients.find(c => c.id === e.target.value)
                updateInvoice('client_id', e.target.value)
                updateInvoice('client_name', client ? client.name : '')
              }}>
                <option value="">— Select a client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Client Name</label>
              <input style={inputStyle} value={invoice.client_name || ''} onChange={e => updateInvoice('client_name', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Custom Header Fields</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Work Duration</label>
              <input style={inputStyle} value={invoice.work_duration || ''} onChange={e => updateInvoice('work_duration', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Payment Terms</label>
              <select style={inputStyle} value={invoice.payment_terms || 'Net 30'} onChange={e => updateInvoice('payment_terms', e.target.value)}>
                <option>Net 30</option>
                <option>Net 60</option>
                <option>Due on receipt</option>
                <option>50% advance</option>
                <option>Custom</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Custom Fields</label>
              <input style={inputStyle} value={invoice.custom_fields || ''} onChange={e => updateInvoice('custom_fields', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ ...sectionTitleStyle, margin: 0 }}>Line Items</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input ref={csvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div onClick={() => setShowCSVNote(prev => !prev)} style={{ padding: '8px 14px', backgroundColor: '#16A34A', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  Import CSV ▼
                </div>
                {showCSVNote && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 200, backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', padding: '16px', width: '340px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '0', marginBottom: '14px', borderBottom: '2px solid #eee' }}>
                      {['Upload File', 'Paste CSV'].map(tab => (
                        <div key={tab} onClick={() => setCSVTab(tab)} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: csvTab === tab ? '#CC0000' : '#888', borderBottom: csvTab === tab ? '2px solid #CC0000' : '2px solid transparent', marginBottom: '-2px' }}>
                          {tab}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>
                      Required columns: <code style={{ backgroundColor: '#f4f4f4', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>description, sub_description, make, quantity, unit, unit_price</code>
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', marginBottom: '12px', backgroundColor: '#F0F4FF', padding: '8px', borderRadius: '6px' }}>
                      💡 Share your client's request with any AI assistant and say: <em>"Extract the items as a CSV with these columns: description, sub_description, make, quantity, unit, unit_price — one row per item"</em>
                    </div>
                    {csvTab === 'Upload File' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div onClick={() => { setShowCSVNote(false); csvRef.current.click() }} style={{ padding: '8px 12px', backgroundColor: '#16A34A', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                          Choose File
                        </div>
                      </div>
                    )}
                    {csvTab === 'Paste CSV' && (
                      <div>
                        <textarea value={pasteCSV} onChange={e => setPasteCSV(e.target.value)}
                          placeholder={'description,make,quantity,unit,unit_price\nCable 50mm,NEXANS,500,M,52000'}
                          style={{ width: '100%', height: '100px', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <div onClick={() => {
                            const lines = pasteCSV.split('\n').filter(l => l.trim())
                            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
                            const newItems = []
                            for (let i = 1; i < lines.length; i++) {
                              const cols = lines[i].split(',').map(c => c.trim())
                              if (!cols[0]) continue
                              const row = {}
                              headers.forEach((h, idx) => { row[h] = cols[idx] || '' })
                              newItems.push({ ...emptyItem, description: row['description'] || cols[0], sub_description: row['sub_description'] || '', make: row['make'] || '', quantity: Number(row['quantity'] || 1), unit: (row['unit'] || '').toUpperCase(), unit_price: Number(row['unit_price'] || 0), sort_order: newItems.length })
                            }
                            if (newItems.length > 0) { setItems(prev => [...prev.filter(i => i.description), ...newItems]); setPasteCSV(''); setShowCSVNote(false); alert(newItems.length + ' items imported') }
                          }} style={{ padding: '8px 16px', backgroundColor: '#16A34A', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                            Import
                          </div>
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
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '200px' }}>Description</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '80px' }}>Make</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '60px' }}>Qty</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '100px' }}>Unit</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '120px' }}>Unit Price (₦)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '120px' }}>Amount (₦)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '100px' }}>Install Rate</th>
                  <th style={{ padding: '10px 12px', color: 'white', minWidth: '30px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  item.row_type === 'group_header' ? (
                    <tr key={index} style={{ backgroundColor: '#333' }}>
                      <td colSpan="7" style={{ padding: '10px 12px' }}>
                        <input style={{ width: '100%', backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #555', fontSize: '14px', outline: 'none', padding: '4px' }}
                          value={item.group_name} onChange={e => updateItem(index, 'group_name', e.target.value)} placeholder="Group name" />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span onClick={() => removeItem(index)} style={{ color: '#ff6b6b', cursor: 'pointer', fontSize: '18px' }}>x</span>
                      </td>
                    </tr>
                  ) : (
                    <tr key={index} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <input style={inputStyle} value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} placeholder="Item description" />
                        <input style={{ ...inputStyle, marginTop: '4px', fontSize: '12px', color: '#888' }} value={item.sub_description || ''} onChange={e => updateItem(index, 'sub_description', e.target.value)} placeholder="Sub-description (optional)" />
                      </td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} value={item.make || ''} onChange={e => updateItem(index, 'make', e.target.value)} placeholder="Brand" /></td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} type="number" min="0" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} /></td>
                      <td style={{ padding: '8px 12px', minWidth: '100px' }}><UnitInput value={item.unit} onChange={val => updateItem(index, 'unit', val)} /></td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} type="number" min="0" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', Number(e.target.value))} /></td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>₦{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}</td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} type="number" min="0" value={item.install_rate || 0} onChange={e => updateItem(index, 'install_rate', Number(e.target.value))} /></td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}><span onClick={() => removeItem(index)} style={{ color: '#CC0000', cursor: 'pointer', fontSize: '18px' }}>x</span></td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Additional Charges</h3>
            {[
              { label: 'Workmanship (₦)', field: 'workmanship' },
              { label: 'Transportation (₦)', field: 'transportation' },
              { label: 'Shipping (₦)', field: 'shipping' },
              { label: 'VAT %', field: 'vat' },
              { label: 'WHT %', field: 'wht' },
            ].map(({ label, field }) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
                <input type="number" min="0" style={{ ...inputStyle, width: '160px', textAlign: 'right' }} value={invoice[field] || 0} onChange={e => updateInvoice(field, Number(e.target.value))} />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Discount</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #ddd' }}>
                  <div onClick={() => setDiscountType('fixed')} style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: discountType === 'fixed' ? '#CC0000' : 'white', color: discountType === 'fixed' ? 'white' : '#555', fontWeight: 'bold' }}>₦</div>
                  <div onClick={() => setDiscountType('percent')} style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', backgroundColor: discountType === 'percent' ? '#CC0000' : 'white', color: discountType === 'percent' ? 'white' : '#555', fontWeight: 'bold' }}>%</div>
                </div>
                <input type="number" min="0" style={{ ...inputStyle, width: '100px', textAlign: 'right' }} value={invoice.discount || 0} onChange={e => updateInvoice('discount', Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Summary</h3>
            {[
              { label: 'Subtotal', value: subtotal },
              { label: 'VAT (' + (invoice.vat || 0) + '%)', value: vatAmount },
              { label: 'Workmanship', value: Number(invoice.workmanship || 0) },
              { label: 'Transportation', value: Number(invoice.transportation || 0) },
              { label: 'Shipping', value: Number(invoice.shipping || 0) },
              { label: 'Install Rate Total', value: installRateTotal },
              { label: discountType === 'percent' ? 'Discount (' + (invoice.discount || 0) + '%)' : 'Discount', value: -discountAmount },
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

        <div style={sectionStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={invoice.notes || ''} onChange={e => updateInvoice('notes', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Terms and Conditions</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={invoice.terms || ''} onChange={e => updateInvoice('terms', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingBottom: '40px' }}>
          <div onClick={() => navigate('/invoices/' + id)} style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', border: '1px solid #ddd', backgroundColor: 'white' }}>Cancel</div>
          <div onClick={() => handleSave('draft')} style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: '#555', color: 'white' }}>
            {saving ? 'Saving...' : 'Save as Draft'}
          </div>
          <div onClick={() => handleSave(invoice.status || 'draft')} style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: '#CC0000', color: 'white', fontWeight: 'bold' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </div>
        </div>

      </div>
    </Layout>
  )
}