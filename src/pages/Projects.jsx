import { useState, useEffect, useMemo } from 'react'
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

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All Time')
  const [sortBy, setSortBy] = useState('Newest')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [docCounts, setDocCounts] = useState({})

  useEffect(() => { fetchProjects() }, [])

  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null)
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    setProjects(data || [])

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

  const clientOptions = useMemo(() => {
    return Array.from(new Set(projects.map(project => project.client_name).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [projects])

  const filtered = useMemo(() => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const currentYearStart = new Date(now.getFullYear(), 0, 1)
    const searchTerm = search.trim().toLowerCase()

    const matchesDateRange = (value, fallback) => {
      if (dateFilter === 'All Time') return true
      const date = new Date(value || fallback || 0)
      if (Number.isNaN(date.getTime())) return false
      if (dateFilter === 'This Month') return date >= currentMonthStart
      if (dateFilter === 'Last Month') return date >= lastMonthStart && date <= lastMonthEnd
      if (dateFilter === 'This Year') return date >= currentYearStart
      return true
    }

    const list = projects.filter(project => {
      const normalizedStatus = (project.status || '').replace('_', ' ')
      const matchSearch = !searchTerm
        || project.name?.toLowerCase().includes(searchTerm)
        || project.client_name?.toLowerCase().includes(searchTerm)
      const matchClient = clientFilter === 'All' || (project.client_name || '') === clientFilter
      const matchStatus = statusFilter === 'All' || normalizedStatus === statusFilter.toLowerCase()
      const matchDate = matchesDateRange(project.start_date, project.created_at)
      return matchSearch && matchClient && matchStatus && matchDate
    })

    list.sort((a, b) => {
      if (sortBy === 'Oldest') return new Date(a.created_at || a.start_date || 0) - new Date(b.created_at || b.start_date || 0)
      if (sortBy === 'Highest Value') return Number(b.project_value || 0) - Number(a.project_value || 0)
      if (sortBy === 'Lowest Value') return Number(a.project_value || 0) - Number(b.project_value || 0)
      return new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0)
    })

    return list
  }, [clientFilter, dateFilter, projects, search, sortBy, statusFilter])

  const resetFilters = () => {
    setSearch('')
    setClientFilter('All')
    setStatusFilter('All')
    setDateFilter('All Time')
    setSortBy('Newest')
  }

  const handleDelete = async (project) => {
    const confirmed = window.confirm('Delete this project permanently? This cannot be undone.')
    if (!confirmed) return
    await supabase.from('projects').delete().eq('id', project.id)
    setOpenMenuId(null)
    await fetchProjects()
  }

  const filterControlStyle = {
    height: 40,
    borderRadius: 10,
    border: '1px solid #E2E8F0',
    background: 'white',
    padding: '0 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    outline: 'none',
  }

  const hasActiveFilters =
    !!search || clientFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All Time'

  return (
    <Layout title="Projects">
      <div style={{ maxWidth: 900 }}>
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

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center', background: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8' }}>Client</span>
            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={filterControlStyle}>
              <option>All</option>
              {clientOptions.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8' }}>Status</span>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={filterControlStyle}>
              {['All', 'Active', 'Completed', 'On Hold', 'Cancelled'].map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8' }}>Date</span>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={filterControlStyle}>
              {['All Time', 'This Month', 'Last Month', 'This Year'].map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#94A3B8' }}>Sort</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={filterControlStyle}>
              {['Newest', 'Oldest', 'Highest Value', 'Lowest Value'].map(option => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <button
            onClick={resetFilters}
            style={{
              height: 40, borderRadius: 10, border: '1px solid #E2E8F0', background: 'white',
              padding: '0 14px', fontSize: 12, fontWeight: 700, color: '#64748B', cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: 14 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <FolderKanban size={40} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              {hasActiveFilters ? 'No projects match' : 'No projects yet'}
            </div>
            <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 24 }}>
              {hasActiveFilters ? 'Try a different search or filter' : 'Create your first project to get started'}
            </div>
            {!hasActiveFilters && (
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
                <div key={project.id} style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
                  <div
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{
                      backgroundColor: 'white', border: '1px solid #E2E8F0',
                      borderRadius: 12, padding: '16px 18px',
                      cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
                      display: 'flex', alignItems: 'center', gap: 16, flex: 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FolderKanban size={18} color="#475569" />
                    </div>

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

                  <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === project.id ? null : project.id)
                      }}
                      style={{
                        width: 44, height: '100%', minHeight: 72, borderRadius: 12, border: '1px solid #E2E8F0',
                        background: 'white', color: '#64748B', cursor: 'pointer', fontSize: 18, fontWeight: 700,
                      }}
                    >
                      •••
                    </button>
                    {openMenuId === project.id && (
                      <div style={{
                        position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 20, width: 170,
                        borderRadius: 14, border: '1px solid #E2E8F0', background: 'white', padding: 6,
                        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
                      }}>
                        <button onClick={() => { setOpenMenuId(null); navigate(`/projects/${project.id}`) }} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '10px 12px', borderRadius: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleDelete(project)} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '10px 12px', borderRadius: 10, fontSize: 13, color: '#DC2626', cursor: 'pointer' }}>Delete</button>
                        <button onClick={() => { setOpenMenuId(null); alert('Archive coming soon') }} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '10px 12px', borderRadius: 10, fontSize: 13, color: '#334155', cursor: 'pointer' }}>Archive</button>
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
