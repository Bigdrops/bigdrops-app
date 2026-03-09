import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CATEGORIES = ['Residential', 'Commercial', 'Industrial', 'Government', 'NGO', 'Other']

const emptyClient = {
  name: '', email: '', phone: '', address: '', address2: '',
  city: '', state: '', contact_person: '', category: '', notes: '',
}

export default function ClientSelector({ clientId, clientName, onClientChange, isMobile }) {
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newClient, setNewClient] = useState({ ...emptyClient })
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const inp = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a', backgroundColor: 'white' }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }

  useEffect(() => {
    fetchClients()
  }, [])

  useEffect(() => {
    if (clientId && clients.length > 0) {
      const found = clients.find(c => c.id === clientId)
      setSelectedClient(found || null)
    } else if (!clientId) {
      setSelectedClient(null)
    }
  }, [clientId, clients])

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
  }

  const handleSelect = (e) => {
    const id = e.target.value
    if (!id) { onClientChange('', '', null); setSelectedClient(null); return }
    const client = clients.find(c => c.id === id)
    if (client) {
      setSelectedClient(client)
      onClientChange(client.id, client.name, client)
    }
  }

  const updateNew = (field, val) => setNewClient(p => ({ ...p, [field]: val }))

  const handleSaveNewClient = async () => {
    if (!newClient.name.trim()) { alert('Client name is required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('clients').insert([{
      name: newClient.name.trim(),
      email: newClient.email.trim(),
      phone: newClient.phone.trim(),
      address: newClient.address2.trim() ? newClient.address.trim() + ', ' + newClient.address2.trim() : newClient.address.trim(),
      city: newClient.city.trim(),
      state: newClient.state.trim(),
      contact_person: newClient.contact_person.trim(),
      category: newClient.category,
    }]).select().single()

    if (error) { alert('Error saving client: ' + error.message); setSaving(false); return }

    await fetchClients()
    setSelectedClient(data)
    onClientChange(data.id, data.name, data)
    setNewClient({ ...emptyClient })
    setShowAddModal(false)
    setSaving(false)
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const grid2 = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }

  return (
    <>
      {/* Add New Client Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#1a1a1a' }}>Add New Client</h3>
              <span onClick={() => setShowAddModal(false)} style={{ cursor: 'pointer', fontSize: '24px', color: '#888', lineHeight: 1 }}>×</span>
            </div>
            <div style={{ padding: '24px 28px' }}>

              {/* Name — full width */}
              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Company / Client Name *</label>
                <input style={inp} value={newClient.name} onChange={e => updateNew('name', e.target.value)} placeholder="e.g. Coronation Power & Gas Ltd" autoFocus />
              </div>

              <div style={grid2}>
                <div>
                  <label style={lbl}>Contact Person</label>
                  <input style={inp} value={newClient.contact_person} onChange={e => updateNew('contact_person', e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label style={lbl}>Category</label>
                  <select style={inp} value={newClient.category} onChange={e => updateNew('category', e.target.value)}>
                    <option value="">— Select —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={grid2}>
                <div>
                  <label style={lbl}>Phone</label>
                  <input style={inp} value={newClient.phone} onChange={e => updateNew('phone', e.target.value)} placeholder="+234 801 234 5678" />
                </div>
                <div>
                  <label style={lbl}>Email</label>
                  <input style={inp} type="email" value={newClient.email} onChange={e => updateNew('email', e.target.value)} placeholder="email@company.com" />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Address Line 1</label>
                <input style={inp} value={newClient.address} onChange={e => updateNew('address', e.target.value)} placeholder="Street address" />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={lbl}>Address Line 2</label>
                <input style={inp} value={newClient.address2} onChange={e => updateNew('address2', e.target.value)} placeholder="Suite, floor, landmark (optional)" />
              </div>

              <div style={grid2}>
                <div>
                  <label style={lbl}>City</label>
                  <input style={inp} value={newClient.city} onChange={e => updateNew('city', e.target.value)} placeholder="Lagos" />
                </div>
                <div>
                  <label style={lbl}>State</label>
                  <input style={inp} value={newClient.state} onChange={e => updateNew('state', e.target.value)} placeholder="Lagos State" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#555', backgroundColor: 'white' }}>Cancel</button>
                <button onClick={handleSaveNewClient} disabled={saving} style={{ flex: 2, padding: '12px', backgroundColor: '#CC0000', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  {saving ? 'Saving...' : 'Save Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Selector UI */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={lbl}>Select Client</label>
          <div onClick={() => setShowAddModal(true)} style={{ fontSize: '12px', color: '#CC0000', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> New Client
          </div>
        </div>

        <select style={inp} value={clientId || ''} onChange={handleSelect}>
          <option value="">— {clients.length} clients, select one —</option>
          {filteredClients.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.city ? ' — ' + c.city : ''}{c.category ? ' (' + c.category + ')' : ''}
            </option>
          ))}
        </select>

        {/* Selected client info card */}
        {selectedClient && (
          <div style={{ marginTop: '10px', padding: '12px 14px', backgroundColor: '#f8f8ff', border: '1px solid #e0e0f0', borderRadius: '8px', fontSize: '13px' }}>
            <div style={{ fontWeight: 'bold', color: '#1a1a1a', marginBottom: '4px', fontSize: '14px' }}>{selectedClient.name}</div>
            {selectedClient.contact_person && <div style={{ color: '#555', marginBottom: '2px' }}>👤 {selectedClient.contact_person}</div>}
            {selectedClient.phone && <div style={{ color: '#555', marginBottom: '2px' }}>📞 {selectedClient.phone}</div>}
            {selectedClient.email && <div style={{ color: '#555', marginBottom: '2px' }}>✉ {selectedClient.email}</div>}
            {selectedClient.address && <div style={{ color: '#555', marginBottom: '2px' }}>📍 {selectedClient.address}{selectedClient.city ? ', ' + selectedClient.city : ''}{selectedClient.state ? ', ' + selectedClient.state : ''}</div>}
            {selectedClient.category && <div style={{ marginTop: '4px' }}><span style={{ fontSize: '11px', backgroundColor: '#e8e8ff', color: '#5555cc', padding: '2px 8px', borderRadius: '10px' }}>{selectedClient.category}</span></div>}
          </div>
        )}
      </div>
    </>
  )
}
