import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

export default function AddClient() {
  const navigate = useNavigate()
  const [client, setClient] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: ''
  })
  const [saving, setSaving] = useState(false)

  const update = (field, value) =>
    setClient(c => ({ ...c, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('clients').insert(client)
    setSaving(false)
    if (error) {
      console.error('Insert error', error)
      alert('Failed to save client')
    } else {
      navigate('/clients')
    }
  }

  const inputStyle = {
    width: '100%',
    fontSize: '16px',
    minHeight: '44px',
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    boxSizing: 'border-box',
    marginBottom: '12px'
  }

  return (
    <Layout title="Add Client">
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ marginBottom: '20px', color: '#6366F1', fontSize: '18px', fontWeight: '600' }}>New Client</div>
        <div>
          <input
            style={inputStyle}
            placeholder="Company Name"
            value={client.name}
            onChange={e => update('name', e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Contact Person"
            value={client.contact_person}
            onChange={e => update('contact_person', e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Email"
            type="email"
            value={client.email}
            onChange={e => update('email', e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Phone"
            value={client.phone}
            onChange={e => update('phone', e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Address"
            value={client.address}
            onChange={e => update('address', e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="City"
            value={client.city}
            onChange={e => update('city', e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="State"
            value={client.state}
            onChange={e => update('state', e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <div
            onClick={handleSave}
            style={{
              backgroundColor: '#6366F1',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </div>
        </div>
      </div>
    </Layout>
  )
}
