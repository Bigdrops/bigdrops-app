import { useState, useEffect, useMemo } from 'react'  
import { useNavigate } from 'react-router-dom'  
import { supabase } from '../supabase'  
import Layout from '../components/Layout'  
import { Calendar, FileText, FolderKanban, Plus, Search, SlidersHorizontal, X } from 'lucide-react'  
  
const STATUS_CONFIG = {  
  active:    { label: 'Active',    bg: '#DCFCE7', color: '#16A34A', dot: '#22C55E' },  
  completed: { label: 'Completed', bg: '#E0F2FE', color: '#0369A1', dot: '#0EA5E9' },  
  on_hold:   { label: 'On Hold',   bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },  
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', color: '#DC2626', dot: '#EF4444' },  
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
  const [showFilters, setShowFilters] = useState(false)  
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
      .is('archived_at', null)  
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
    } else {  
      setDocCounts({})  
    }  
    setLoading(false)  
  }  
  
  const clientOptions = useMemo(() => {  
    return Array.from(new Set(projects.map(p => p.client_name).filter(Boolean))).sort((a, b) => a.localeCompare(b))  
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
      if (sortBy === 'Oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)  
      if (sortBy === 'Highest Value') return Number(b.project_value || 0) - Number(a.project_value || 0)  
      if (sortBy === 'Lowest Value') return Number(a.project_value || 0) - Number(b.project_value || 0)  
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)  
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
  
  const handleArchive = async (project) => {  
    await supabase.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', project.id)  
    setOpenMenuId(null)  
    await fetchProjects()  
  }  
  
  const hasActiveFilters = !!search || clientFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All Time' || sortBy !== 'Newest'  
  const activeFilterCount = [search, clientFilter !== 'All', statusFilter !== 'All', dateFilter !== 'All Time', sortBy !== 'Newest'].filter(Boolean).length  
  
  const formatProjectValue = (value) => {  
    const amount = Number(value || 0)  
    if (!amount) return '₦0'  
    if (amount >= 1_000_000) return '₦' + (amount / 1_000_000).toFixed(1) + 'M'  
    if (amount >= 1_000) return '₦' + (amount / 1_000).toFixed(1) + 'K'  
    return '₦' + amount.toLocaleString()  
  }  
  
  return (  
    <Layout title="Projects">  
      <style>{`  
        @keyframes pulse {  
          0%, 100% { opacity: 1; }  
          50% { opacity: 0.6; }  
        }  
        .proj-menu-item:hover {  
          background: #F8FAFC !important;  
        }  
        .proj-card {  
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);  
        }  
        .proj-card:active {  
          transform: scale(0.98);  
        }  
        @media (hover: hover) {  
          .proj-card:hover {  
            transform: translateY(-1px);  
            box-shadow: 0 8px 24px rgba(15,23,42,0.12) !important;  
          }  
        }  
        .filter-badge {  
          transition: all 0.2s ease;  
        }  
        .filter-badge:active {  
          transform: scale(0.95);  
        }  
      `}</style>  
  
      <div style={{   
        maxWidth: 900,   
        margin: '0 auto',  
        padding: '0 16px 24px',  
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif"   
      }}>  
  
        {/* Header */}  
        <div style={{   
          padding: '16px 0 20px',  
          position: 'sticky',  
          top: 0,  
          background: '#FAFAFA',  
          zIndex: 10,  
          marginLeft: -16,  
          marginRight: -16,  
          paddingLeft: 16,  
          paddingRight: 16,  
        }}>  
          <div style={{   
            display: 'flex',   
            alignItems: 'center',   
            justifyContent: 'space-between',  
            marginBottom: 12,  
            gap: 12   
          }}>  
            <div style={{ minWidth: 0, flex: 1 }}>  
              <h2 style={{   
                margin: 0,   
                fontSize: 24,   
                fontWeight: 800,   
                color: '#0F172A',  
                letterSpacing: '-0.02em'  
              }}>  
                Projects  
              </h2>  
              <p style={{   
                margin: '2px 0 0',   
                fontSize: 13,   
                color: '#64748B',  
                fontWeight: 500  
              }}>  
                {filtered.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}  
              </p>  
            </div>  
            <button  
              onClick={() => navigate('/projects/new')}  
              style={{  
                display: 'flex',  
                alignItems: 'center',  
                gap: 6,  
                background: '#0F172A',  
                color: 'white',  
                border: 'none',  
                borderRadius: 12,  
                padding: '10px 16px',  
                fontSize: 14,  
                fontWeight: 700,  
                cursor: 'pointer',  
                boxShadow: '0 2px 8px rgba(15,23,42,0.15)',  
                whiteSpace: 'nowrap'  
              }}  
            >  
              <Plus size={18} strokeWidth={2.5} />  
              <span>New</span>  
            </button>  
          </div>  
  
          {/* Search & Filter Bar */}  
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>  
            <div style={{ position: 'relative', flex: 1 }}>  
              <Search   
                size={16}   
                style={{   
                  position: 'absolute',   
                  left: 12,   
                  top: '50%',   
                  transform: 'translateY(-50%)',   
                  color: '#94A3B8',  
                  pointerEvents: 'none'  
                }}   
              />  
              <input  
                value={search}  
                onChange={e => setSearch(e.target.value)}  
                placeholder="Search projects..."  
                style={{  
                  width: '100%',  
                  boxSizing: 'border-box',  
                  padding: '10px 12px 10px 38px',  
                  border: '1px solid #E2E8F0',  
                  borderRadius: 12,  
                  fontSize: 14,  
                  color: '#1E293B',  
                  background: 'white',  
                  outline: 'none',  
                  fontWeight: 500  
                }}  
              />  
            </div>  
            <button  
              onClick={() => setShowFilters(p => !p)}  
              style={{  
                position: 'relative',  
                width: 42,  
                height: 42,  
                borderRadius: 12,  
                border: showFilters ? '1.5px solid #0F172A' : '1px solid #E2E8F0',  
                background: showFilters ? '#F8FAFC' : 'white',  
                color: showFilters ? '#0F172A' : '#64748B',  
                display: 'flex',  
                alignItems: 'center',  
                justifyContent: 'center',  
                cursor: 'pointer',  
                flexShrink: 0  
              }}  
            >  
              <SlidersHorizontal size={18} />  
              {activeFilterCount > 0 && (  
                <div style={{  
                  position: 'absolute',  
                  top: -4,  
                  right: -4,  
                  width: 18,  
                  height: 18,  
                  borderRadius: '50%',  
                  background: '#0F172A',  
                  color: 'white',  
                  fontSize: 10,  
                  fontWeight: 800,  
                  display: 'flex',  
                  alignItems: 'center',  
                  justifyContent: 'center',  
                  border: '2px solid #FAFAFA'  
                }}>  
                  {activeFilterCount}  
                </div>  
              )}  
            </button>  
          </div>  
  
          {/* Filters Panel */}  
          {showFilters && (  
            <div style={{  
              marginTop: 12,  
              background: 'white',  
              border: '1px solid #E2E8F0',  
              borderRadius: 16,  
              padding: 16,  
              boxShadow: '0 4px 12px rgba(15,23,42,0.08)'  
            }}>  
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>  
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>  
                  <div>  
                    <label style={{   
                      display: 'block',  
                      fontSize: 11,   
                      fontWeight: 700,   
                      textTransform: 'uppercase',   
                      color: '#64748B',  
                      marginBottom: 6,  
                      letterSpacing: '0.05em'  
                    }}>  
                      Client  
                    </label>  
                    <select   
                      value={clientFilter}   
                      onChange={e => setClientFilter(e.target.value)}  
                      style={{  
                        width: '100%',  
                        height: 38,  
                        borderRadius: 10,  
                        border: '1px solid #E2E8F0',  
                        background: 'white',  
                        padding: '0 10px',  
                        fontSize: 13,  
                        fontWeight: 600,  
                        color: '#1E293B',  
                        outline: 'none',  
                        cursor: 'pointer'  
                      }}  
                    >  
                      <option>All</option>  
                      {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}  
                    </select>  
                  </div>  
  
                  <div>  
                    <label style={{   
                      display: 'block',  
                      fontSize: 11,   
                      fontWeight: 700,   
                      textTransform: 'uppercase',   
                      color: '#64748B',  
                      marginBottom: 6,  
                      letterSpacing: '0.05em'  
                    }}>  
                      Status  
                    </label>  
                    <select   
                      value={statusFilter}   
                      onChange={e => setStatusFilter(e.target.value)}  
                      style={{  
                        width: '100%',  
                        height: 38,  
                        borderRadius: 10,  
                        border: '1px solid #E2E8F0',  
                        background: 'white',  
                        padding: '0 10px',  
                        fontSize: 13,  
                        fontWeight: 600,  
                        color: '#1E293B',  
                        outline: 'none',  
                        cursor: 'pointer'  
                      }}  
                    >  
                      {['All', 'Active', 'Completed', 'On Hold', 'Cancelled'].map(o => <option key={o}>{o}</option>)}  
                    </select>  
                  </div>  
                </div>  
  
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>  
                  <div>  
                    <label style={{   
                      display: 'block',  
                      fontSize: 11,   
                      fontWeight: 700,   
                      textTransform: 'uppercase',   
                      color: '#64748B',  
                      marginBottom: 6,  
                      letterSpacing: '0.05em'  
                    }}>  
                      Period  
                    </label>  
                    <select   
                      value={dateFilter}   
                      onChange={e => setDateFilter(e.target.value)}  
                      style={{  
                        width: '100%',  
                        height: 38,  
                        borderRadius: 10,  
                        border: '1px solid #E2E8F0',  
                        background: 'white',  
                        padding: '0 10px',  
                        fontSize: 13,  
                        fontWeight: 600,  
                        color: '#1E293B',  
                        outline: 'none',  
                        cursor: 'pointer'  
                      }}  
                    >  
                      {['All Time', 'This Month', 'Last Month', 'This Year'].map(o => <option key={o}>{o}</option>)}  
                    </select>  
                  </div>  
  
                  <div>  
                    <label style={{   
                      display: 'block',  
                      fontSize: 11,   
                      fontWeight: 700,   
                      textTransform: 'uppercase',   
                      color: '#64748B',  
                      marginBottom: 6,  
                      letterSpacing: '0.05em'  
                    }}>  
                      Sort By  
                    </label>  
                    <select   
                      value={sortBy}   
                      onChange={e => setSortBy(e.target.value)}  
                      style={{  
                        width: '100%',  
                        height: 38,  
                        borderRadius: 10,  
                        border: '1px solid #E2E8F0',  
                        background: 'white',  
                        padding: '0 10px',  
                        fontSize: 13,  
                        fontWeight: 600,  
                        color: '#1E293B',  
                        outline: 'none',  
                        cursor: 'pointer'  
                      }}  
                    >  
                      {['Newest', 'Oldest', 'Highest Value', 'Lowest Value'].map(o => <option key={o}>{o}</option>)}  
                    </select>  
                  </div>  
                </div>  
  
                {hasActiveFilters && (  
                  <button  
                    onClick={resetFilters}  
                    style={{  
                      width: '100%',  
                      height: 38,  
                      borderRadius: 10,  
                      border: '1px solid #E2E8F0',  
                      background: 'white',  
                      color: '#64748B',  
                      fontSize: 13,  
                      fontWeight: 700,  
                      cursor: 'pointer',  
                      display: 'flex',  
                      alignItems: 'center',  
                      justifyContent: 'center',  
                      gap: 6  
                    }}  
                  >  
                    <X size={14} />  
                    Clear All Filters  
                  </button>  
                )}  
              </div>  
            </div>  
          )}  
        </div>  
  
        {/* Project List */}  
        {loading ? (  
          <div style={{   
            textAlign: 'center',   
            padding: '80px 20px',   
            color: '#94A3B8',   
            fontSize: 14,  
            fontWeight: 500  
          }}>  
            Loading projects...  
          </div>  
        ) : filtered.length === 0 ? (  
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>  
            <div style={{  
              width: 64,  
              height: 64,  
              borderRadius: 16,  
              background: '#F1F5F9',  
              display: 'flex',  
              alignItems: 'center',  
              justifyContent: 'center',  
              margin: '0 auto 16px'  
            }}>  
              <FolderKanban size={32} color="#94A3B8" />  
            </div>  
            <div style={{   
              fontSize: 17,   
              fontWeight: 800,   
              color: '#1E293B',   
              marginBottom: 6,  
              letterSpacing: '-0.01em'  
            }}>  
              {hasActiveFilters ? 'No matches found' : 'No projects yet'}  
            </div>  
            <div style={{   
              fontSize: 14,   
              color: '#64748B',   
              marginBottom: 24,  
              fontWeight: 500  
            }}>  
              {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first project to get started'}  
            </div>  
            {!hasActiveFilters && (  
              <button  
                onClick={() => navigate('/projects/new')}  
                style={{  
                  background: '#0F172A',  
                  color: 'white',  
                  border: 'none',  
                  borderRadius: 12,  
                  padding: '12px 24px',  
                  fontSize: 14,  
                  fontWeight: 700,  
                  cursor: 'pointer',  
                  display: 'inline-flex',  
                  alignItems: 'center',  
                  gap: 8  
                }}  
              >  
                <Plus size={18} />  
                New Project  
              </button>  
            )}  
          </div>  
        ) : (  
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>  
            {filtered.map(project => {  
              const st = STATUS_CONFIG[project.status] || STATUS_CONFIG.active  
              const count = docCounts[project.id] || 0  
              const formattedValue = formatProjectValue(project.project_value)  
              const startedText = project.start_date  
                ? new Date(project.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })  
                : null  
              const isMenuOpen = openMenuId === project.id  
  
              return (  
                <div  
                  key={project.id}  
                  className="proj-card"  
                  onClick={() => navigate(`/projects/${project.id}`)}  
                  style={{  
                    position: 'relative',  
                    background: 'white',  
                    border: '1px solid #E2E8F0',  
                    borderRadius: 20,  
                    padding: '18px 16px',  
                    cursor: 'pointer',  
                    boxShadow: '0 1px 3px rgba(15,23,42,0.08)',  
                  }}  
                >  
                  {/* Top accent */}  
                  <div style={{  
                    position: 'absolute',  
                    top: 0,  
                    left: 0,  
                    right: 0,  
                    height: 3,  
                    background: `linear-gradient(90deg, ${st.dot}, ${st.color})`,  
                    borderRadius: '20px 20px 0 0',  
                  }} />  
  
                  {/* Header */}  
                  <div style={{   
                    display: 'flex',   
                    alignItems: 'flex-start',   
                    justifyContent: 'space-between',  
                    gap: 12,  
                    marginBottom: 14  
                  }}>  
                    <div style={{ minWidth: 0, flex: 1 }}>  
                      <div style={{   
                        display: 'flex',   
                        alignItems: 'center',   
                        gap: 6,   
                        marginBottom: 8,  
                        flexWrap: 'wrap'  
                      }}>  
                        <span style={{  
                          fontSize: 10,  
                          fontWeight: 800,  
                          textTransform: 'uppercase',  
                          color: st.color,  
                          background: st.bg,  
                          borderRadius: 6,  
                          padding: '3px 8px',  
                          letterSpacing: '0.03em'  
                        }}>  
                          {st.label}  
                        </span>  
                        <div style={{  
                          width: 4,  
                          height: 4,  
                          borderRadius: '50%',  
                          background: st.dot,  
                          animation: project.status === 'active' ? 'pulse 2s infinite' : 'none',  
                        }} />  
                      </div>  
                      <h3 style={{  
                        margin: 0,  
                        fontSize: 18,  
                        fontWeight: 800,  
                        letterSpacing: '-0.02em',  
                        color: '#0F172A',  
                        lineHeight: 1.3,  
                        marginBottom: 4  
                      }}>  
                        {project.name}  
                      </h3>  
                      {project.client_name && (  
                        <div style={{  
                          fontSize: 14,  
                          fontWeight: 600,  
                          color: '#64748B',  
                          overflow: 'hidden',  
                          textOverflow: 'ellipsis',  
                          whiteSpace: 'nowrap'  
                        }}>  
                          {project.client_name}  
                        </div>  
                      )}  
                    </div>  
  
                    {/* Menu */}  
                    <div  
                      style={{   
                        position: 'relative',   
                        flexShrink: 0,   
                        zIndex: isMenuOpen ? 300 : 1   
                      }}  
                      onClick={e => e.stopPropagation()}  
                    >  
                      <button  
                        onClick={e => {  
                          e.stopPropagation()  
                          setOpenMenuId(isMenuOpen ? null : project.id)  
                        }}  
                        style={{  
                          width: 32,  
                          height: 32,  
                          borderRadius: 10,  
                          border: isMenuOpen ? '1.5px solid #0F172A' : '1px solid #E2E8F0',  
                          background: isMenuOpen ? '#F8FAFC' : 'white',  
                          color: '#64748B',  
                          cursor: 'pointer',  
                          fontSize: 16,  
                          fontWeight: 800,  
                          display: 'flex',  
                          alignItems: 'center',  
                          justifyContent: 'center',  
                        }}  
                      >  
                        •••  
                      </button>  
  
                      {isMenuOpen && (  
                        <div  
                          style={{  
                            position: 'absolute',  
                            right: 0,  
                            top: 'calc(100% + 6px)',  
                            zIndex: 300,  
                            minWidth: 200,  
                            maxHeight: '70vh',  
                            overflowY: 'auto',  
                            borderRadius: 14,  
                            border: '1px solid #E2E8F0',  
                            background: 'white',  
                            padding: '6px',  
                            boxShadow: '0 12px 40px rgba(15,23,42,0.15)',  
                          }}  
                          onClick={e => e.stopPropagation()}  
                        >  
                          <button  
                            className="proj-menu-item"  
                            onClick={e => {  
                              e.stopPropagation()  
                              setOpenMenuId(null)  
                              navigate(`/projects/${project.id}`)  
                            }}  
                            style={{  
                              display: 'block',  
                              width: '100%',  
                              border: 'none',  
                              background: 'transparent',  
                              textAlign: 'left',  
                              padding: '10px 12px',  
                              borderRadius: 10,  
                              fontSize: 14,  
                              color: '#1E293B',  
                              cursor: 'pointer',  
                              fontWeight: 600  
                            }}  
                          >  
                            Edit  
                          </button>  
  
                          <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />  
  
                          <div style={{ padding: '8px 12px 4px' }}>  
                            <span style={{  
                              fontSize: 10,  
                              color: '#94A3B8',  
                              textTransform: 'uppercase',  
                              fontWeight: 800,  
                              letterSpacing: '0.05em'  
                            }}>  
                              Change Status  
                            </span>  
                          </div>  
  
                          {[  
                            { label: 'Active', value: 'active' },  
                            { label: 'Completed', value: 'completed' },  
                            { label: 'On Hold', value: 'on_hold' },  
                            { label: 'Cancelled', value: 'cancelled' },  
                          ].map(action => {  
                            const isCurrent = project.status === action.value  
                            return (  
                              <button  
                                key={action.value}  
                                className="proj-menu-item"  
                                onClick={e => {  
                                  e.stopPropagation()  
                                  supabase  
                                    .from('projects')  
                                    .update({ status: action.value })  
                                    .eq('id', project.id)  
                                    .then(() => {  
                                      setOpenMenuId(null)  
                                      fetchProjects()  
                                    })  
                                }}  
                                style={{  
                                  display: 'flex',  
                                  alignItems: 'center',  
                                  justifyContent: 'space-between',  
                                  width: '100%',  
                                  border: 'none',  
                                  background: isCurrent ? '#F0FDF4' : 'transparent',  
                                  textAlign: 'left',  
                                  padding: '9px 12px',  
                                  borderRadius: 10,  
                                  fontSize: 13,  
                                  color: '#1E293B',  
                                  cursor: 'pointer',  
                                  fontWeight: isCurrent ? 700 : 500,  
                                }}  
                              >  
                                <span>{action.label}</span>  
                                {isCurrent && (  
                                  <span style={{   
                                    color: '#16A34A',   
                                    fontWeight: 800,   
                                    fontSize: 14   
                                  }}>  
                                    ✓  
                                  </span>  
                                )}  
                              </button>  
                            )  
                          })}  
  
                          <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />  
  
                          <button  
                            className="proj-menu-item"  
                            onClick={e => {  
                              e.stopPropagation()  
                              handleArchive(project)  
                            }}  
                            style={{  
                              display: 'block',  
                              width: '100%',  
                              border: 'none',  
                              background: 'transparent',  
                              textAlign: 'left',  
                              padding: '10px 12px',  
                              borderRadius: 10,  
                              fontSize: 14,  
                              color: '#D97706',  
                              cursor: 'pointer',  
                              fontWeight: 600  
                            }}  
                          >  
                            Archive  
                          </button>  
  
                          <button  
                            className="proj-menu-item"  
                            onClick={e => {  
                              e.stopPropagation()  
                              handleDelete(project)  
                            }}  
                            style={{  
                              display: 'block',  
                              width: '100%',  
                              border: 'none',  
                              background: 'transparent',  
                              textAlign: 'left',  
                              padding: '10px 12px',  
                              borderRadius: 10,  
                              fontSize: 14,  
                              color: '#DC2626',  
                              cursor: 'pointer',  
                              fontWeight: 600  
                            }}  
                          >  
                            Delete  
                          </button>  
                        </div>  
                      )}  
                    </div>  
                  </div>  
  
                  {/* Meta Info */}  
                  <div style={{   
                    display: 'flex',   
                    gap: 12,   
                    flexWrap: 'wrap',  
                    marginBottom: 14  
                  }}>  
                    <div style={{   
                      display: 'flex',   
                      alignItems: 'center',   
                      gap: 6   
                    }}>  
                      <div style={{  
                        width: 24,  
                        height: 24,  
                        borderRadius: 6,  
                        background: '#F8FAFC',  
                        display: 'flex',  
                        alignItems: 'center',  
                        justifyContent: 'center',  
                        color: '#64748B'  
                      }}>  
                        <FileText size={12} strokeWidth={2.5} />  
                      </div>  
                      <span style={{   
                        fontSize: 12,   
                        color: '#64748B',   
                        fontWeight: 600   
                      }}>  
                        {count} doc{count !== 1 ? 's' : ''}  
                      </span>  
                    </div>  
                    {startedText && (  
                      <div style={{   
                        display: 'flex',   
                        alignItems: 'center',   
                        gap: 6   
                      }}>  
                        <div style={{  
                          width: 24,  
                          height: 24,  
                          borderRadius: 6,  
                          background: '#F8FAFC',  
                          display: 'flex',  
                          alignItems: 'center',  
                          justifyContent: 'center',  
                          color: '#64748B'  
                        }}>  
                          <Calendar size={12} strokeWidth={2.5} />  
                        </div>  
                        <span style={{   
                          fontSize: 12,   
                          color: '#64748B',   
                          fontWeight: 600   
                        }}>  
                          {startedText}  
                        </span>  
                      </div>  
                    )}  
                  </div>  
  
                  {/* Value */}  
                  <div style={{  
                    paddingTop: 14,  
                    borderTop: '1px solid #F1F5F9',  
                  }}>  
                    <div style={{  
                      fontSize: 20,  
                      fontWeight: 800,  
                      letterSpacing: '-0.02em',  
                      color: '#0F172A'  
                    }}>  
                      {formattedValue}  
                    </div>  
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