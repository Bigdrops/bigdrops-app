import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useIsMobile } from '../hooks/useIsMobile'

export default function CSR() {
  const navigate = useNavigate()
  const [csrs, setCsrs] = useState([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  useEffect(() => {
    supabase.from('csrs').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setCsrs(data || [])
      setLoading(false)
    })
  }, [])

  const statusColor = (status) => {
    if (status === 'Complete') return { bg: '#DCFCE7', color: '#16A34A' }
    if (status === 'Incomplete') return { bg: '#FEE2E2', color: '#CC0000' }
    if (status === 'Pending for spares') return { bg: '#FEF9C3', color: '#CA8A04' }
    if (status === 'Under observation') return { bg: '#E0F2FE', color: '#0284C7' }
    if (status === 'Field Entry Pending') return { bg: '#EDE9FE', color: '#4B5563' }
    return { bg: '#F5F5F5', color: '#555' }
  }

  return (
    <Layout title="Customer Service Reports">
      <div style={{ maxWidth: '1100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ color: '#6B6B6B', fontSize: '14px' }}>{csrs.length} reports total</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div
              onClick={() => navigate('/csr/new')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#CC0000',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              + New CSR
            </div>
            <div
              onClick={() => navigate('/csr/new?type=field')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4B5563',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              + Field CSR
            </div>
          </div>
        </div>

        {/* List (responsive) */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px' }}>
            {loading ? (
              <p style={{ padding: '30px', color: '#888', fontSize: '14px' }}>Loading...</p>
            ) : csrs.length === 0 ? (
              <p style={{ padding: '30px', color: '#888', fontSize: '14px' }}>No CSRs yet. Create your first one.</p>
            ) : (
              csrs.map(csr => (
                <div key={csr.id} onClick={() => navigate('/csr/' + csr.id)} style={{ backgroundColor: 'white', padding: '16px', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #EBEBEB', cursor: 'pointer', minHeight: '44px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', color: '#CC0000', fontSize: '14px' }}>{csr.csr_number}</span>
                    <span style={{ backgroundColor: statusColor(csr.status).bg, color: statusColor(csr.status).color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{csr.status}</span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{csr.client_name}</div>
                  <div style={{ color: '#888', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{csr.equipment_type}</span>
                    <span>{csr.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            {loading ? (
              <p style={{ padding: '30px', color: '#888', fontSize: '14px' }}>Loading...</p>
            ) : csrs.length === 0 ? (
              <p style={{ padding: '30px', color: '#888', fontSize: '14px' }}>No CSRs yet. Create your first one.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #EBEBEB' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6B6B6B', fontWeight: '600', fontSize: '12px' }}>CSR No.</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6B6B6B', fontWeight: '600', fontSize: '12px' }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6B6B6B', fontWeight: '600', fontSize: '12px' }}>Client</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6B6B6B', fontWeight: '600', fontSize: '12px' }}>Equipment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: '#6B6B6B', fontWeight: '600', fontSize: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {csrs.map((csr, index) => {
                    const s = statusColor(csr.status)
                    return (
                      <tr key={csr.id} onClick={() => navigate('/csr/' + csr.id)}
                        style={{ borderBottom: '1px solid #F5F5F5', cursor: 'pointer', backgroundColor: index % 2 === 0 ? 'white' : '#FAFAFA' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFF5F5'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#FAFAFA'}>
                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#CC0000' }}>{csr.csr_number}</td>
                        <td style={{ padding: '12px 16px', color: '#6B6B6B' }}>{csr.date}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '500' }}>{csr.client_name}</td>
                        <td style={{ padding: '12px 16px', color: '#6B6B6B' }}>{csr.equipment_type} {csr.make ? '— ' + csr.make : ''}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ backgroundColor: s.bg, color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                            {csr.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}