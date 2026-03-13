import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { FolderKanban, Plus, Search, ChevronRight, FileText } from 'lucide-react'

const STATUS_CONFIG = {
  active:    { label: 'Active',    bg: '#DCFCE7', color: '#16A34A' },
  completed: { label: 'Completed', bg: '#E0F2FE', color: '#0369A1' },
  on_hold:   { label: 'On Hold',   bg: '#FEF3C7', color: '#92400E' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', color: '#DC2626' },
}

const FILTERS = ['All', 'Active', 'Completed', 'On Hold', 'Cancelled']

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('All')
  const [docCounts, setDocCounts] = useState({}) // project_id → count

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    setProjects(data || [])

    // Fetch document counts from invoices + csrs per project
    if (data?.length) {
      const ids = data.map(p => p.id)
      const [invRes, csrRes] = await Promise.all([
        supabase.from('invoices').select('project_id').in('project_id', ids).is('archived_at', null),
        supabase.from('csrs').select('project_id').in('project_id', ids),
      ])
      const counts = {}
      ids.forEach(id => { counts[id] = 0 })
      ;(invRes.data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
      ;(csrRes.data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
      setDocCounts(counts)
    }
    setLoading(false)
  }

  const filtered = projects.filter(p => {
    const matchFilter = filter === 'All' || p.status === filter.toLowerCase().replace(' ', '_')
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <Layout title="Projects">
      <div style={{ maxWidth: 900 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Projects</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94A3B8' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            onClick={() => navigate('/projects/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              backgroundColor: '#0F172A', color: 'white',
              border: 'none', borderRadius: 10, padding: '10px 18px',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> New Project
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects or clients..."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 14px 10px 38px',
              border: '1px solid #E2E8F0', borderRadius: 10,
              fontSize: 13, color: '#1E293B', background: 'white', outline: 'none',
            }}
          />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: '1px solid',
                borderColor: filter === f ? '#0F172A' : '#E2E8F0',
                backgroundColor: filter === f ? '#0F172A' : 'white',
                color: filter === f ? 'white' : '#64748B',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <FolderKanban size={40} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              {search || filter !== 'All' ? 'No projects match' : 'No projects yet'}
            </div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>
              {search || filter !== 'All' ? 'Try a different search or filter' : 'Create your first project to get started'}
            </div>
            {!search && filter === 'All' && (
              <button
                onClick={() => navigate('/projects/new')}
                style={{
                  backgroundColor: '#0F172A', color: 'white', border: 'none',
                  borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                + New Project
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(project => {
              const st = STATUS_CONFIG[project.status] || STATUS_CONFIG.active
              const count = docCounts[project.id] || 0
              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  style={{
                    backgroundColor: 'white', border: '1px solid #E2E8F0',
                    borderRadius: 12, padding: '16px 18px',
                    cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FolderKanban size={18} color="#475569" />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {project.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {project.client_name && <span>{project.client_name}</span>}
                      {project.client_name && <span style={{ color: '#CBD5E1' }}>·</span>}
                      <span>Started {new Date(project.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span style={{ color: '#CBD5E1' }}>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileText size={11} />
                        {count} doc{count !== 1 ? 's' : ''}
                      </span>
                      {project.project_value && (
                        <>
                          <span style={{ color: '#CBD5E1' }}>·</span>
                          <span style={{ fontWeight: 600, color: '#334155' }}>
                            ₦{Number(project.project_value).toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status + chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '4px 10px',
                      borderRadius: 20, backgroundColor: st.bg, color: st.color,
                    }}>
                      {st.label}
                    </span>
                    <ChevronRight size={16} color="#CBD5E1" />
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
