import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

export default function EditCSR() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

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
    show_po: false,
    po_number: '',
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, address')
          .order('name')
        setClients(clientsData || [])

        const { data, error } = await supabase
          .from('csrs')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          alert('Error loading CSR: ' + error.message)
          navigate('/csr')
          return
        }

        setCsr(c => ({
          ...c,
          ...data,
        }))
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadData()
    }
  }, [id, navigate])

  const update = (field, value) =>
    setCsr(c => ({ ...c, [field]: value }))

  const handleSave = async () => {
    if (!csr.client_id) {
      alert('Please select a client before saving')
      return
    }

    setSaving(true)
    const csrData = {
      ...csr,
      client_id: csr.client_id || null,
      linked_invoice_id: csr.linked_invoice_id || null,
    }
    const { error } = await supabase
      .from('csrs')
      .update(csrData)
      .eq('id', id)

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
    'Field Entry Pending',
  ]

  if (loading) {
    return (
      <Layout title="Edit CSR">
        <div style={{ maxWidth: '900px' }}>
          <div style={{ padding: '16px' }}>Loading CSR...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Edit CSR">
      <div style={{ maxWidth: '900px' }}>

        <div style={sectionStyle}>
          <div style={sectionHead}>Customer Details</div>
          <div style={sectionBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>CSR Number</label>
                <input
                  style={{ ...inputStyle, fontWeight: 'bold', color: '#CC0000' }}
                  value={csr.csr_number}
                  onChange={e => update('csr_number', e.target.value)}
                />
              </div>
            </div>
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

        <div style={sectionStyle}>
          <div style={sectionHead}>PO Number</div>
          <div style={sectionBody}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 0 }}>Add PO Number</label>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={csr.show_po}
                  onChange={e => update('show_po', e.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                <span>{csr.show_po ? 'On' : 'Off'}</span>
              </label>
            </div>

            {csr.show_po && (
              <div>
                <label style={labelStyle}>PO Number</label>
                <input
                  style={inputStyle}
                  value={csr.po_number}
                  onChange={e => update('po_number', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Nature of Problem</div>
          <div style={sectionBody}>
            <label style={labelStyle}>Problem Reported</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px' }}
              value={csr.problem_reported}
              onChange={e => update('problem_reported', e.target.value)}
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Equipment Details</div>
          <div style={sectionBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Equipment Type</label>
                <input
                  style={inputStyle}
                  value={csr.equipment_type}
                  onChange={e => update('equipment_type', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Equipment Location</label>
                <input
                  style={inputStyle}
                  value={csr.equipment_location}
                  onChange={e => update('equipment_location', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Make</label>
                <input
                  style={inputStyle}
                  value={csr.make}
                  onChange={e => update('make', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Model</label>
                <input
                  style={inputStyle}
                  value={csr.model}
                  onChange={e => update('model', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Serial No</label>
                <input
                  style={inputStyle}
                  value={csr.serial_no}
                  onChange={e => update('serial_no', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Capacity</label>
                <input
                  style={inputStyle}
                  value={csr.capacity}
                  onChange={e => update('capacity', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Operational Readings</div>
          <div style={sectionBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Voltage</label>
                <input
                  style={inputStyle}
                  value={csr.voltage}
                  onChange={e => update('voltage', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Frequency</label>
                <input
                  style={inputStyle}
                  value={csr.frequency}
                  onChange={e => update('frequency', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Battery</label>
                <input
                  style={inputStyle}
                  value={csr.battery}
                  onChange={e => update('battery', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Temperature</label>
                <input
                  style={inputStyle}
                  value={csr.temperature}
                  onChange={e => update('temperature', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Pressure</label>
                <input
                  style={inputStyle}
                  value={csr.pressure}
                  onChange={e => update('pressure', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Hours</label>
                <input
                  style={inputStyle}
                  value={csr.hours}
                  onChange={e => update('hours', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Parts Used</div>
          <div style={sectionBody}>
            <label style={labelStyle}>Materials Used</label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px' }}
              value={csr.materials_used}
              onChange={e => update('materials_used', e.target.value)}
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Service Execution</div>
          <div style={sectionBody}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={csr.start_date}
                  onChange={e => update('start_date', e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Start Time</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={csr.end_date}
                  onChange={e => update('end_date', e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select
                  style={inputStyle}
                  value={csr.status}
                  onChange={e => update('status', e.target.value)}
                >
                  {statusOptions.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Service Rendered</label>
              <textarea
                style={{ ...inputStyle, minHeight: '80px' }}
                value={csr.service_rendered}
                onChange={e => update('service_rendered', e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Engineer Remarks</label>
              <textarea
                style={{ ...inputStyle, minHeight: '80px' }}
                value={csr.engineer_remarks}
                onChange={e => update('engineer_remarks', e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Customer Feedback</label>
              <textarea
                style={{ ...inputStyle, minHeight: '80px' }}
                value={csr.customer_feedback}
                onChange={e => update('customer_feedback', e.target.value)}
              />
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
            {saving ? 'Saving...' : 'Save Changes'}
          </div>
        </div>
      </div>
    </Layout>
  )
}

