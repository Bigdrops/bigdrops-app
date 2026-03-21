import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { useIsMobile } from '../hooks/useIsMobile'
import { User } from 'lucide-react'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState(null)
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const menuRef = useRef(null)

  const loadClients = () => {
    let mounted = true
    supabase.from('clients').select('*').order('name').then(({ data, error }) => {
      if (mounted) {
        if (error) console.error('Error:', error)
        setClients(data || [])
        setLoading(false)
      }
    })
    return () => { mounted = false }
  }

  useEffect(() => {
    const cleanup = loadClients()
    return cleanup
  }, [])

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const addButtonStyle = {
    backgroundColor: '#0F172A',
    color: 'white',
    borderRadius: 10,
    padding: '10px 18px',
    fontSize: 13,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
  }

  const rowWrapStyle = {
    background: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
    marginTop: 16,
  }

  const closeMenu = () => setOpenMenuId(null)

  const handleDelete = async (clientId) => {
    const confirmed = window.confirm('Delete this client? This cannot be undone.')
    if (!confirmed) return
    await supabase.from('clients').delete().eq('id', clientId)
    closeMenu()
    loadClients()
  }

  return (
    <Layout title="Clients">
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Clients</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
              {clients.length} client{clients.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button onClick={() => navigate('/clients/new')} style={addButtonStyle}>
            + Add Client
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: '60px 20px' }}>Loading...</div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <User size={36} color="#CBD5E1" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 20 }}>No clients yet</div>
            <button onClick={() => navigate('/clients/new')} style={addButtonStyle}>
              + Add Client
            </button>
          </div>
        ) : (
          <div style={rowWrapStyle}>
            {clients.map((client, index) => {
              const isOpen = openMenuId === client.id
              return (
                <div
                  key={client.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr auto 38px',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '16px 18px',
                    borderBottom: index === clients.length - 1 ? 'none' : '1px solid #F1F5F9',
                    background: 'white',
                    position: 'relative',
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={18} />
                  </div>

                  <div
                    style={{ minWidth: 0, cursor: 'pointer' }}
                    onClick={() => navigate('/clients/' + client.id)}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginTop: 2 }}>
                      {client.phone || '-'}
                    </div>
                    <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>
                      {[client.city, client.state].filter(Boolean).join(', ') || '-'}
                    </div>
                  </div>

                  <div style={{ justifySelf: 'end' }}>
                    {client.category ? (
                      <span style={{ borderRadius: 999, padding: '5px 12px', background: '#EDE9FE', color: '#7C3AED', fontSize: 11, fontWeight: 800 }}>
                        {client.category}
                      </span>
                    ) : null}
                  </div>

                  <div style={{ justifySelf: 'end', position: 'relative' }} ref={isOpen ? menuRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(isOpen ? null : client.id)
                      }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        border: '1px solid #E2E8F0',
                        background: 'white',
                        color: '#94A3B8',
                        fontSize: 18,
                        lineHeight: 1,
                        cursor: 'pointer',
                      }}
                    >
                      •••
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 40,
                          zIndex: 100,
                          background: 'white',
                          border: '1px solid #E2E8F0',
                          borderRadius: 12,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                          minWidth: 160,
                          overflow: 'hidden',
                        }}
                      >
                        {[
                          { label: 'Edit', color: '#334155', onClick: () => { closeMenu(); navigate('/clients/edit/' + client.id) } },
                          { label: 'Delete', color: '#DC2626', onClick: () => handleDelete(client.id) },
                          { label: 'Archive', color: '#334155', onClick: () => { closeMenu(); alert('Archive coming soon') } },
                          { label: 'Merge', color: '#334155', onClick: () => { closeMenu(); alert('Merge coming soon') } },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={(e) => {
                              e.stopPropagation()
                              item.onClick()
                            }}
                            style={{
                              padding: '10px 16px',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'block',
                              width: '100%',
                              border: 'none',
                              textAlign: 'left',
                              background: 'white',
                              color: item.color,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white' }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
