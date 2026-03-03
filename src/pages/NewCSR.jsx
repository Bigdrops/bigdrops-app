import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

export default function NewCSR() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)

  const [csr, setCsr] = useState({
    csr_number: '',
    date: new Date().toISOString().split('T')[0],
    client_id: '',
    client_name: '',
    address: '',
    problem_reported: '',
    equipment_type: '',
    equipment_location: '',
    make: '',
    model: '',
    serial_no: '',
    capacity: '',
    voltage: '',
    frequency: '',
    battery: '',
    temperature: '',
    pressure: '',
    hours: '',
    materials_used: '',
    service_rendered: '',
    engineer_remarks: '',
    status: 'Complete',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_date: new Date().toISOString().split('T')[0],
    end_time: '',
    customer_feedback: '',
    acknowledgement_name: '',
    linked_invoice_id: '',
  })

  useEffect(() => {
    // Fetch clients WITH address
    supabase
      .from('clients')
      .select('id, name, address')
      .order('name')
      .then(({ data }) => setClients(data || []))

    // Auto-generate CSR number
    supabase
      .from('csrs')
      .select('csr_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const last = data[0].csr_number || 'SASI-CSR-B000'
          const parts = last.split('-')
          const num = parseInt(parts[parts.length - 1].replace('B', '')) + 1
          setCsr(c => ({
            ...c,
            csr_number: 'SASI-CSR-B' + String(num).padStart(3, '0'),
          }))
        } else {
          setCsr(c => ({ ...c, csr_number: 'SASI-CSR-B001' }))
        }
      })
  }, [])

  const update = (field, value) =>
    setCsr(c => ({ ...c, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('csrs').insert([csr])
    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    navigate('/csr')
  }

  // ✅ FIXED STYLES
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'white',
    color: '#1a1a1a',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  }

  const sectionStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    marginBottom: '16px',
    overflow: 'hidden',
  }

  const sectionHead = {
    backgroundColor: '#f0f0f0',
    padding: '8px 16px',
    fontWeight: '700',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #ddd',
    color: '#1a1a1a',
  }

  const sectionBody = { padding: '16px' }

  const statusOptions = [
    'Complete',
    'Incomplete',
    'Pending for spares',
    'Under observation',
    'Working solution provided',
  ]

  return (
    <Layout title="New CSR">
      <div style={{ maxWidth: '900px' }}>

        <div style={sectionStyle}>
          <div style={sectionHead}>Customer Details</div>
          <div style={sectionBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              
              <div>
                <label style={labelStyle}>Select Client</label>
                <select
                  style={inputStyle}
                  value={csr.client_id}
                  onChange={e => {
                    const selectedId = e.target.value
                    const client = clients.find(
                      c => String(c.id) === String(selectedId)
                    )

                    update('client_id', selectedId)
                    update('client_name', client ? client.name : '')
                    update('address', client && client.address ? client.address : '')
                  }}
                >
                  <option value="">— Select client —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Customer Name</label>
                <input
                  style={inputStyle}
                  value={csr.client_name}
                  onChange={e => update('client_name', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input
                  style={inputStyle}
                  value={csr.address}
                  onChange={e => update('address', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* FIXED ACKNOWLEDGEMENT FIELD */}
        <div style={sectionStyle}>
          <div style={sectionHead}>Completion & Acknowledgement</div>
          <div style={sectionBody}>
            <label style={labelStyle}>Customer Name (Acknowledgement)</label>
            <input
              style={inputStyle}
              value={csr.acknowledgement_name}
              onChange={e => update('acknowledgement_name', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: '#CC0000',
              color: 'white',
              fontWeight: '600',
            }}
          >
            {saving ? 'Saving...' : 'Save CSR'}
          </div>
        </div>
      </div>
    </Layout>
  )
}