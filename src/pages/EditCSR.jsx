import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  createDefaultCsr,
  DEFAULT_CSR_META,
  DEFAULT_MATERIAL_ROW,
  parseCsrMaterials,
  serializeCsrMaterials,
} from '../components/csr/csrUtils'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function EditCSR() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isMobile = useIsMobile()

  const [clients, setClients] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [csr, setCsr] = useState(() => createDefaultCsr(false))
  const [csrMeta, setCsrMeta] = useState(() => ({ ...DEFAULT_CSR_META }))
  const [materialsRows, setMaterialsRows] = useState([{ ...DEFAULT_MATERIAL_ROW }])

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

        const parsed = parseCsrMaterials(data.materials_used, data)
        setCsr((current) => ({ ...current, ...data }))
        setCsrMeta(parsed.meta)
        setMaterialsRows(parsed.materialsRows.length > 0 ? parsed.materialsRows : [{ ...DEFAULT_MATERIAL_ROW }])
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      loadData()
    }
  }, [id, navigate])

  const update = (field, value) => {
    setCsr((current) => ({ ...current, [field]: value }))
  }

  const updateMeta = (field, value) => {
    setCsrMeta((current) => ({ ...current, [field]: value }))
  }

  const updateMaterialRow = (index, field, value) => {
    setMaterialsRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    )
  }

  const addMaterialRow = () => {
    setMaterialsRows((current) => [...current, { ...DEFAULT_MATERIAL_ROW }])
  }

  const removeMaterialRow = (index) => {
    setMaterialsRows((current) =>
      current.length === 1 ? [{ ...DEFAULT_MATERIAL_ROW }] : current.filter((_, rowIndex) => rowIndex !== index)
    )
  }

  const handleSave = async () => {
    if (!csr.client_id) {
      alert('Please select a client before saving')
      return
    }

    const csrData = {
      ...csr,
      client_id: csr.client_id || null,
      linked_invoice_id: csr.linked_invoice_id || null,
      materials_used: serializeCsrMaterials(materialsRows, csrMeta),
    }

    const { data: existing } = await supabase
      .from('csrs')
      .select('id')
      .eq('csr_number', csrData.csr_number)

    if ((existing || []).some((item) => String(item.id) !== String(id))) {
      alert('CSR number already exists. Please use a different number.')
      return
    }

    setSaving(true)

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

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '16px',
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

  const getGridStyle = (columns) => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : columns,
    gap: '14px',
    marginBottom: '14px',
  })

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
            <div style={getGridStyle('1fr 1fr')}>
              <div>
                <label style={labelStyle}>CSR Number</label>
                <input
                  style={{ ...inputStyle, fontWeight: 'bold', color: '#CC0000' }}
                  value={csr.csr_number}
                  onChange={(event) => update('csr_number', event.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" style={inputStyle} value={csr.date} onChange={(event) => update('date', event.target.value)} />
              </div>
            </div>

            <div style={getGridStyle('1fr')}>
              <div>
                <label style={labelStyle}>Select Client</label>
                <select
                  style={inputStyle}
                  value={csr.client_id}
                  onChange={(event) => {
                    const selectedId = event.target.value
                    const client = clients.find((item) => String(item.id) === String(selectedId))

                    update('client_id', selectedId)
                    update('client_name', client ? client.name : '')
                    update('address', client?.address || '')
                  }}
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={getGridStyle('1fr 2fr')}>
              <div>
                <label style={labelStyle}>Customer Name</label>
                <input style={inputStyle} value={csr.client_name} onChange={(event) => update('client_name', event.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <input style={inputStyle} value={csr.address} onChange={(event) => update('address', event.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>PO Number</div>
          <div style={sectionBody}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={csr.show_po}
                onChange={(event) => update('show_po', event.target.checked)}
              />
              Include PO Number
            </label>

            {csr.show_po && (
              <div>
                <label style={labelStyle}>PO Number</label>
                <input style={inputStyle} value={csr.po_number} onChange={(event) => update('po_number', event.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Nature of Problem</div>
          <div style={sectionBody}>
            <label style={labelStyle}>Problem Reported</label>
            <textarea style={{ ...inputStyle, minHeight: '80px' }} value={csr.problem_reported} onChange={(event) => update('problem_reported', event.target.value)} />
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Equipment Details</div>
          <div style={sectionBody}>
            <div style={getGridStyle('1fr 1fr 1fr')}>
              <div>
                <label style={labelStyle}>Equipment Type</label>
                <input style={inputStyle} value={csr.equipment_type} onChange={(event) => update('equipment_type', event.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Equipment Location</label>
                <input style={inputStyle} value={csr.equipment_location} onChange={(event) => update('equipment_location', event.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Make</label>
                <input style={inputStyle} value={csr.make} onChange={(event) => update('make', event.target.value)} />
              </div>
            </div>

            <div style={getGridStyle('1fr 1fr')}>
              <div>
                <label style={labelStyle}>Model Field Title</label>
                <input style={inputStyle} value={csrMeta.modelLabel} onChange={(event) => updateMeta('modelLabel', event.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Serial Field Title</label>
                <input style={inputStyle} value={csrMeta.serialLabel} onChange={(event) => updateMeta('serialLabel', event.target.value)} />
              </div>
            </div>

            <div style={getGridStyle('1fr 1fr 1fr')}>
              <div>
                <label style={labelStyle}>{csrMeta.modelLabel}</label>
                <input style={inputStyle} value={csr.model} onChange={(event) => update('model', event.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>{csrMeta.serialLabel}</label>
                <input style={inputStyle} value={csr.serial_no} onChange={(event) => update('serial_no', event.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Capacity</label>
                <input style={inputStyle} value={csr.capacity} onChange={(event) => update('capacity', event.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Operational Readings</div>
          <div style={sectionBody}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={csrMeta.showOperationalReadings}
                onChange={(event) => updateMeta('showOperationalReadings', event.target.checked)}
              />
              Include operational readings
            </label>

            {csrMeta.showOperationalReadings && (
              <>
                <div style={getGridStyle('1fr 1fr 1fr')}>
                  <div>
                    <label style={labelStyle}>Voltage</label>
                    <input style={inputStyle} value={csr.voltage} onChange={(event) => update('voltage', event.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Frequency</label>
                    <input style={inputStyle} value={csr.frequency} onChange={(event) => update('frequency', event.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Battery</label>
                    <input style={inputStyle} value={csr.battery} onChange={(event) => update('battery', event.target.value)} />
                  </div>
                </div>

                <div style={getGridStyle('1fr 1fr 1fr')}>
                  <div>
                    <label style={labelStyle}>Temperature</label>
                    <input style={inputStyle} value={csr.temperature} onChange={(event) => update('temperature', event.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Pressure</label>
                    <input style={inputStyle} value={csr.pressure} onChange={(event) => update('pressure', event.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Hours</label>
                    <input style={inputStyle} value={csr.hours} onChange={(event) => update('hours', event.target.value)} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Materials Used</div>
          <div style={sectionBody}>
            <div style={getGridStyle('1fr 160px')}>
              <div>
                <label style={labelStyle}>Output Style</label>
                <select
                  style={inputStyle}
                  value={csrMeta.materialsOutputStyle}
                  onChange={(event) => updateMeta('materialsOutputStyle', event.target.value)}
                >
                  <option value="list">Enumerated List</option>
                  <option value="comma">Comma-separated Text</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead>
                  <tr>
                    {['Material / Item', 'Quantity', 'Unit', ''].map((heading) => (
                      <th key={heading} style={{ textAlign: 'left', fontSize: '11px', color: '#64748B', padding: '8px 6px' }}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materialsRows.map((row, index) => (
                    <tr key={index}>
                      <td style={{ padding: '6px' }}>
                        <input style={inputStyle} value={row.item} onChange={(event) => updateMaterialRow(index, 'item', event.target.value)} />
                      </td>
                      <td style={{ padding: '6px', width: '140px' }}>
                        <input style={inputStyle} value={row.quantity} onChange={(event) => updateMaterialRow(index, 'quantity', event.target.value)} />
                      </td>
                      <td style={{ padding: '6px', width: '140px' }}>
                        <input style={inputStyle} value={row.unit} onChange={(event) => updateMaterialRow(index, 'unit', event.target.value)} />
                      </td>
                      <td style={{ padding: '6px', width: '60px' }}>
                        <button type="button" onClick={() => removeMaterialRow(index)} style={{ ...inputStyle, cursor: 'pointer', padding: '8px 10px' }}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="button" onClick={addMaterialRow} style={{ ...inputStyle, width: 'auto', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              + Add Material Row
            </button>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Service Execution</div>
          <div style={sectionBody}>
            <div style={getGridStyle('1fr 1fr 1fr 1fr')}>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" style={inputStyle} value={csr.start_date} onChange={(event) => update('start_date', event.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Start Time</label>
                <input type="time" style={inputStyle} value={csr.start_time} onChange={(event) => update('start_time', event.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" style={inputStyle} value={csr.end_date} onChange={(event) => update('end_date', event.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>End Time</label>
                <input type="time" style={inputStyle} value={csr.end_time} onChange={(event) => update('end_time', event.target.value)} />
              </div>
            </div>

            <div style={getGridStyle('1fr')}>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={csr.status} onChange={(event) => update('status', event.target.value)}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Service Rendered</label>
              <textarea style={{ ...inputStyle, minHeight: '80px' }} value={csr.service_rendered} onChange={(event) => update('service_rendered', event.target.value)} />
            </div>

            <div style={getGridStyle('1fr 1fr')}>
              <div>
                <label style={labelStyle}>Technician Name</label>
                <input style={inputStyle} value={csrMeta.technicianName} onChange={(event) => updateMeta('technicianName', event.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={csrMeta.showTechnicianSignLine}
                    onChange={(event) => updateMeta('showTechnicianSignLine', event.target.checked)}
                  />
                  Show optional technician sign line in PDF
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Technician Remarks</label>
              <textarea style={{ ...inputStyle, minHeight: '80px' }} value={csr.engineer_remarks} onChange={(event) => update('engineer_remarks', event.target.value)} />
            </div>

            <div>
              <label style={labelStyle}>Customer Feedback</label>
              <textarea style={{ ...inputStyle, minHeight: '80px' }} value={csr.customer_feedback} onChange={(event) => update('customer_feedback', event.target.value)} />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <div style={sectionHead}>Acknowledgement</div>
          <div style={sectionBody}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={csrMeta.showAcknowledgement}
                onChange={(event) => updateMeta('showAcknowledgement', event.target.checked)}
              />
              Include acknowledgement section
            </label>

            {csrMeta.showAcknowledgement && (
              <>
                <div style={getGridStyle('1fr 1fr')}>
                  <div>
                    <label style={labelStyle}>Section Title</label>
                    <input style={inputStyle} value={csrMeta.recipientTitle} onChange={(event) => updateMeta('recipientTitle', event.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Recipient / Witness Role</label>
                    <input style={inputStyle} value={csrMeta.recipientRole} onChange={(event) => updateMeta('recipientRole', event.target.value)} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Recipient / Witness Name</label>
                  <input style={inputStyle} value={csr.acknowledgement_name} onChange={(event) => update('acknowledgement_name', event.target.value)} />
                </div>
              </>
            )}
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
