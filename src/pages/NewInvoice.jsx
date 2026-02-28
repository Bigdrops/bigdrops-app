import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

const emptyItem = {
  description: '',
  sub_description: '',
  make: '',
  quantity: 1,
  unit: '',
  unit_price: 0,
  vat_rate: 0,
  install_rate: 0,
  install_rate_taxable: false,
  show_install_rate: true,
  row_type: 'standard',
  group_name: '',
  formula: '',
  sort_order: 0,
}

export default function NewInvoice() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)

  const [invoice, setInvoice] = useState({
    invoice_number: '',
    client_id: '',
    client_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'draft',
    document_type: 'INVOICE',
    payment_terms: 'Net 30',
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
    custom_fields: '',
    work_duration: '',
    amount_in_words: '',
  })

  const [items, setItems] = useState([{ ...emptyItem }])

  useEffect(() => {
    // Load clients for dropdown
    supabase.from('clients').select('id, name').order('name').then(({ data, error }) => {
      console.log('clients:', data, 'error:', error)
      setClients(data || [])
    })
    // Generate invoice number
    supabase.from('invoices').select('invoice_number').order('created_at', { ascending: false }).limit(1).then(({ data }) => {
      if (data && data.length > 0) {
        const last = data[0].invoice_number
        const num = parseInt(last.replace('SASINV-B', '')) + 1
        setInvoice(i => ({ ...i, invoice_number: `SASINV-B${String(num).padStart(3, '0')}` }))
      } else {
        setInvoice(i => ({ ...i, invoice_number: 'SASINV-B001' }))
      }
    })
  }, [])

  const updateInvoice = (field, value) => setInvoice(i => ({ ...i, [field]: value }))

  const updateItem = (index, field, value) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    // Auto calculate amount
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].amount = updated[index].quantity * updated[index].unit_price
    }
    setItems(updated)
  }

  const addItem = () => setItems([...items, { ...emptyItem, sort_order: items.length }])
  const addGroupHeader = () => setItems([...items, { ...emptyItem, row_type: 'group_header', sort_order: items.length }])
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index))

  // Calculations
  const subtotal = items.filter(i => i.row_type === 'standard').reduce((sum, i) => sum + (i.quantity * i.unit_price), 0)
  const vatAmount = subtotal * (invoice.vat / 100)
  const installRateTotal = items.filter(i => i.row_type === 'standard' && !i.install_rate_taxable).reduce((sum, i) => sum + Number(i.install_rate || 0), 0)
  const extras = Number(invoice.workmanship || 0) + Number(invoice.transportation || 0) + Number(invoice.shipping || 0) + installRateTotal
  const total = subtotal + vatAmount + extras - Number(invoice.discount || 0)

  const numberToWords = (num) => {
    if (num === 0) return 'ZERO NAIRA ONLY'
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

  const handleSave = async (status = 'draft') => {
    setSaving(true)
    const amountInWords = numberToWords(total)
    const { data: inv, error } = await supabase.from('invoices').insert([{
      ...invoice,
      status,
      subtotal,
      vat: vatAmount,
      install_rate_total: installRateTotal,
      total,
      amount_in_words: amountInWords,
    }]).select().single()

    if (error) { alert('Error saving invoice: ' + error.message); setSaving(false); return }

    // Save line items
    const itemsToSave = items.map((item, i) => ({ ...item, invoice_id: inv.id, sort_order: i, amount: item.quantity * item.unit_price }))
    await supabase.from('invoice_items').insert(itemsToSave)

    setSaving(false)
    navigate('/invoices')
  }

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }

  return (
    <Layout title="New Invoice">
      <div style={{ maxWidth: '1100px' }}>

        {/* Document Type & Number */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
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
              <input type="date" style={inputStyle} value={invoice.due_date} onChange={e => updateInvoice('due_date', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Client Selection */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0056B3', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Client Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Select Client</label>
              <select style={inputStyle} value={invoice.client_id} onChange={e => {
                const client = clients.find(c => c.id === e.target.value)
                updateInvoice('client_id', e.target.value)
                updateInvoice('client_name', client ? client.name : '')
              }}>
                <option value="">— Select a client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Client Name (auto-filled)</label>
              <input style={inputStyle} value={invoice.client_name} onChange={e => updateInvoice('client_name', e.target.value)} placeholder="Or type manually" />
            </div>
          </div>
        </div>

        {/* Custom Header Fields */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', color: '#0056B3', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Custom Header Fields (Optional)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
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
            <div>
              <label style={labelStyle}>Custom Fields (JSON)</label>
              <input style={inputStyle} value={invoice.custom_fields} onChange={e => updateInvoice('custom_fields', e.target.value)} placeholder='e.g. {"Capacity":"500KVA"}' />
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#0056B3', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Line Items</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div onClick={addGroupHeader} style={{ padding: '8px 14px', backgroundColor: '#1a1a1a', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                + Group Header
              </div>
              <div onClick={addItem} style={{ padding: '8px 14px', backgroundColor: '#CC0000', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                + Add Item
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a1a1a' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '180px' }}>Description</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '80px' }}>Make</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '60px' }}>Qty</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '60px' }}>Unit</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '100px' }}>Unit Price</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '100px' }}>Amount</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '60px' }}>VAT %</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: 'white', minWidth: '80px' }}>Install Rate</th>
                  <th style={{ padding: '10px 12px', color: 'white', minWidth: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  item.row_type === 'group_header' ? (
                    <tr key={index} style={{ backgroundColor: '#333' }}>
                      <td colSpan="8" style={{ padding: '10px 12px' }}>
                        <input
                          style={{ ...inputStyle, backgroundColor: 'transparent', color: 'white', fontWeight: 'bold', border: 'none', borderBottom: '1px solid #555' }}
                          value={item.group_name}
                          onChange={e => updateItem(index, 'group_name', e.target.value)}
                          placeholder="Group name (e.g. Electrical Works)"
                        />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span onClick={() => removeItem(index)} style={{ color: '#ff6b6b', cursor: 'pointer', fontSize: '16px' }}>×</span>
                      </td>
                    </tr>
                  ) : (
                    <tr key={index} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fafafa' : 'white' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <input style={inputStyle} value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} placeholder="Item description" />
                        <input style={{ ...inputStyle, marginTop: '4px', fontSize: '12px', color: '#888' }} value={item.sub_description} onChange={e => updateItem(index, 'sub_description', e.target.value)} placeholder="Sub-description (optional)" />
                      </td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} value={item.make} onChange={e => updateItem(index, 'make', e.target.value)} placeholder="Make" /></td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} /></td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)} placeholder="pcs" /></td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} type="number" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', Number(e.target.value))} /></td>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#1a1a1a' }}>₦{(item.quantity * item.unit_price).toLocaleString()}</td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} type="number" value={item.vat_rate} onChange={e => updateItem(index, 'vat_rate', Number(e.target.value))} /></td>
                      <td style={{ padding: '8px 12px' }}><input style={inputStyle} type="number" value={item.install_rate} onChange={e => updateItem(index, 'install_rate', Number(e.target.value))} /></td>
                      <td style={{ padding: '8px 12px' }}>
                        <span onClick={() => removeItem(index)} style={{ color: '#CC0000', cursor: 'pointer', fontSize: '16px' }}>×</span>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Below table extras */}
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0056B3', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Additional Charges</h3>
            {[
              { label: 'Workmanship', field: 'workmanship' },
              { label: 'Transportation', field: 'transportation' },
              { label: 'Shipping', field: 'shipping' },
              { label: 'Discount', field: 'discount' },
              { label: 'VAT %', field: 'vat' },
              { label: 'WHT %', field: 'wht' },
            ].map(({ label, field }) => (
              <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={labelStyle}>{label}</label>
                <input type="number" style={{ ...inputStyle, width: '160px', textAlign: 'right' }} value={invoice[field]} onChange={e => updateInvoice(field, Number(e.target.value))} />
              </div>
            ))}
          </div>

          {/* Grand Total */}
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0056B3', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Summary</h3>
            {[
              { label: 'Subtotal', value: subtotal },
              { label: `VAT (${invoice.vat}%)`, value: vatAmount },
              { label: 'Workmanship', value: Number(invoice.workmanship || 0) },
              { label: 'Transportation', value: Number(invoice.transportation || 0) },
              { label: 'Shipping', value: Number(invoice.shipping || 0) },
              { label: 'Install Rate Total', value: installRateTotal },
              { label: 'Discount', value: -Number(invoice.discount || 0) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#555' }}>{label}</span>
                <span style={{ color: value < 0 ? '#CC0000' : '#1a1a1a' }}>₦{value.toLocaleString()}</span>
              </div>
            ))}
            <div style={{ borderTop: '2px solid #1a1a1a', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>TOTAL (NGN)</span>
              <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#CC0000' }}>₦{total.toLocaleString()}</span>
            </div>
            <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '6px', fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
              {numberToWords(total)}
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={invoice.notes} onChange={e => updateInvoice('notes', e.target.value)} placeholder="Notes to client..." />
            </div>
            <div>
              <label style={labelStyle}>Terms & Conditions</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={invoice.terms} onChange={e => updateInvoice('terms', e.target.value)} placeholder="Terms and conditions..." />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <div onClick={() => navigate('/invoices')} style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', border: '1px solid #ddd', backgroundColor: 'white' }}>
            Cancel
          </div>
          <div onClick={() => handleSave('draft')} style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: '#555', color: 'white' }}>
            {saving ? 'Saving...' : 'Save as Draft'}
          </div>
          <div onClick={() => handleSave('sent')} style={{ padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', backgroundColor: '#CC0000', color: 'white', fontWeight: 'bold' }}>
            {saving ? 'Saving...' : 'Save & Send'}
          </div>
        </div>

      </div>
    </Layout>
  )
}