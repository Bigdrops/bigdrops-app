import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('clients').select('*').order('name').then(({ data, error }) => {
      if (error) console.error('Error fetching clients:', error)
      setClients(data || [])
      setLoading(false)
    })
  }, [])

  return (
    <Layout title="Clients">
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ backgroundColor: '#CC0000', color: 'white', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
          + Add Client
        </div>
      </div>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1a1a1a' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Name</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Address</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Phone</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Category</th>
              <th style={{ padding: '14px 20px', textAlign: 'left', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                  Loading...
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                  No clients yet.
                </td>
              </tr>
            ) : (
              clients.map((client, index) => (
                <tr
                  key={client.id}
                  style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0F4FF')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white')}
                >
                  <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {client.name}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>
                    {client.address || '—'}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>
                    {client.phone || '—'}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px' }}>
                    {client.category ? (
                      <span style={{ backgroundColor: '#E8F0FB', color: '#0056B3', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                        {client.category}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', color: '#555' }}>
                    {client.notes || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}