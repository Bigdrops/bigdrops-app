import { useState, useEffect, useMemo, useRef } from 'react'  
import { useNavigate } from 'react-router-dom'  
import { supabase } from '../supabase'  
import Layout from '../components/Layout'  
import { Calendar, FileText, FolderKanban, Plus, Search, SlidersHorizontal, X, MoreVertical } from 'lucide-react'  
  
const STATUS_CONFIG = {  
  active:    { label: 'Active',    color: '#2563EB' },  
  completed: { label: 'Completed', color: '#16A34A' },  
  on_hold:   { label: 'On Hold',   color: '#F59E0B' },  
  cancelled: { label: 'Cancelled', color: '#64748B' },  
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
  const menuRefs = useRef({})  
  
  useEffect(() => { fetchProjects() }, [])  
  
  useEffect(() => {  
    const handleClickOutside = (e) => {  
      if (openMenuId && menuRefs.current[openMenuId]) {  
        if (!menuRefs.current[openMenuId].contains(e.target)) {  
          setOpenMenuId(null)  
        }  
      }  
    }  
    document.addEventListener('mousedown', handleClickOutside)  
    return () => document.removeEventListener('mousedown', handleClickOutside)  
  }, [openMenuId])  
  
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
        .proj-menu-item {  
          transition: background 0.15s ease;  
        }  
        .proj-menu-item:hover {  
          background: #F8FAFC !important;  
        }  
        .proj-card {  
          transition: box-shadow 0.2s ease, transform 0.1s ease;  
        }  
        .proj-card:active {  
          transform: scale(0.995);  
        }  
        @media (hover: hover) {  
          .proj-card:hover {  
            box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;  
          }  
        }  
      `}</style>  
  
      <div style={{   
        maxWidth: 900,   
        margin: '0 auto',  
        padding: '0 16px 24px',  
        fontFamily: "'Inter', -apple-system, sans-serif"   
      }}>  
  
        {/* Header */}  
        <div style={{ padding: '20px 0 16px' }}>  
          <div style={{   
            display: 'flex',   
            alignItems: 'center',   
            justifyContent: 'space-between',  
            marginBottom: 16,  
            gap: 12   
          }}>  
            <div style={{ minWidth: 0, flex: 1 }}>  
              <h1 style={{   
                margin: 0,   
                fontSize: 28,   
                fontWeight: 500,   
                color: '#0F172A',  
                letterSpacing: '-0.02em'  
              }}>  
                Projects  
              </h1>  
              <p style={{   
                margin: '4px 0 0',   
                fontSize: 14,   
                color: '#64748B',  
                fontWeight: 400  
              }}>  
                {filtered.length} {filtered.length !== projects.length && `of ${projects.length}`} projects  
              </p>  
            </div>  
            <button  
              onClick={() => navigate('/projects/new')}  
              style={{  
                display: 'flex',  
                alignItems: 'center',  
                gap: 6,  
                background: '#2563EB',  
                color: 'white',  
                border: 'none',  
                borderRadius: 8,  
                padding: '10px 16px',  
                fontSize: 14,  
                fontWeight: 500,  
                cursor: 'pointer',  
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',  
              }}  
            >  
              <Plus size={18} />  
              <span>New</span>  
            </button>  
          </div>  
  
          {/* Search & Filter */}  
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>  
            <div style={{ position: 'relative', flex: 1 }}>  
              <Search   
                size={18}   
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
                  padding: '11px 12px 11px 42px',  
                  border: '1px solid #E2E8F0',  
                  borderRadius: 8,  
                  fontSize: 14,  
                  color: '#0F172A',  
                  background: 'white',  
                  outline: 'none',  
                  fontWeight: 400  
                }}  
              />  
            </div>  
            <button  
              onClick={() => setShowFilters(p => !p)}  
              style={{  
                position: 'relative',  
                width: 44,  
                height: 44,  
                borderRadius: 8,  
                border: '1px solid #E2E8F0',  
                background: showFilters ? '#F8FAFC' : 'white',  
                color: '#64748B',  
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
                  top: -6,  
                  right: -6,  
                  minWidth: 18,  
                  height: 18,  
                  borderRadius: 9,  
                  background: '#2563EB',  
                  color: 'white',  
                  fontSize: 11,  
                  fontWeight: 600,  
                  display: 'flex',  
                  alignItems: 'center',  
                  justifyContent: 'center',  
                  padding: '0 5px',  
                  border: '2px solid white'  
                }}>  
                  {activeFilterCount}  
                </div>  
              )}  
            </button>  
          </div>  
  
          {/* Filters */}  
          {showFilters && (  
            <div style={{  
              marginTop: 12,  
              background: 'white',  
              border: '1px solid #E2E8F0',  
              borderRadius: 8,  
              padding: 16,  
            }}>  
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>  
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>  
                  <div>  
                    <label style={{   
                      display: 'block',  
                      fontSize: 12,   
                      fontWeight: 500,   
                      color: '#64748B',  
                      marginBottom: 6,  
                    }}>  
                      Client  
                    </label>  
                    <select   
                      value={clientFilter}   
                      onChange={e => setClientFilter(e.target.value)}  
                      style={{  
                        width: '100%',  
                        height: 40,  
                        borderRadius: 6,  
                        border: '1px solid #E2E8F0',  
                        background: 'white',  
                        padding: '0 10px',  
                        fontSize: 14,  
                        fontWeight: 400,  
                        color: '#0F172A',  
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
                      fontSize: 12,   
                      fontWeight: 500,   
                      color: '#64748B',  
                      marginBottom: 6,  
                    }}>  
                      Status  
                    </label>  
                    <select   
                      value={statusFilter}   
                      onChange={e => setStatusFilter(e.target.value)}  
                      style={{  
                        width: '100%',  
                        height: 40,  
                        borderRadius: 6,  
                        border: '1px solid #E2E8F0',  
                        background: 'white',  
                        padding: '0 10px',  
                        fontSize: 14,  
                        fontWeight: 400,  
                        color: '#0F172A',  
                        outline: 'none',  
                        cursor: 'pointer'  
                      }}  
                    >  
                      {['All', 'Active', 'Completed', 'On Hold', 'Cancelled'].map(o => <option key={o}>{o}</option>)}  
                    </select>  
                  </div>  
                </div>  
  
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>  
                  <div>  
                    <label style={{   
                      display: 'block',  
                      fontSize: 12,   
                      fontWeight: 500,   
                      color: '#64748B',  
                      marginBottom: 6,  
                    }}>  
                      Period  
                    </label>  
                    <select   
                      value={dateFilter}   
                      onChange={e => setDateFilter(e.target.value)}  
                      style={{  
                        width: '100%',  
                        height: 40,  
                        borderRadius: 6,  
                        border: '1px solid #E2E8F0',  
                        background: 'white',  
                        padding: '0 10px',  
                        fontSize: 14,  
                        fontWeight: 400,  
                        color: '#0F172A',  
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
                      fontSize: 12,   
                      fontWeight: 500,   
                      color: '#64748B',  
                      marginBottom: 6,  
                    }}>  
                      Sort  
                    </label>  
                    <select   
                      value={sortBy}   
                      onChange={e => setSortBy(e.target.value)}  
                      style={{  
                        width: '100%',  
                        height: 40,  
                        borderRadius: 6,  
                        border: '1px solid #E2E8F0',  
                        background: 'white',  
                        padding: '0 10px',  
                        fontSize: 14,  
                        fontWeight: 400,  
                        color: '#0F172A',  
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
                      height: 36,  
                      borderRadius: 6,  
                      border: 'none',  
                      background: '#F8FAFC',  
                      color: '#64748B',  
                      fontSize: 13,  
                      fontWeight: 500,  
                      cursor: 'pointer',  
                      display: 'flex',  
                      alignItems: 'center',  
                      justifyContent: 'center',  
                      gap: 6  
                    }}  
                  >  
                    <X size={14} />  
                    Clear filters  
                  </button>  
                )}  
              </div>  
            </div>  
          )}  
        </div>  
  
        {/* List */}  
        {loading ? (  
          <div style={{   
            textAlign: 'center',   
            padding: '80px 20px',   
            color: '#94A3B8',   
            fontSize: 14,  
            fontWeight: 400  
          }}>  
            Loading...  
          </div>  
        ) : filtered.length === 0 ? (  
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>  
            <div style={{  
              width: 56,  
              height: 56,  
              borderRadius: 28,  
              background: '#F1F5F9',  
              display: 'flex',  
              alignItems: 'center',  
              justifyContent: 'center',  
              margin: '0 auto 16px'  
            }}>  
              <FolderKanban size={28} color="#94A3B8" strokeWidth={1.5} />  
            </div>  
            <div style={{   
              fontSize: 16,   
              fontWeight: 500,   
              color: '#0F172A',   
              marginBottom: 4,  
            }}>  
              {hasActiveFilters ? 'No projects found' : 'No projects yet'}  
            </div>  
            <div style={{   
              fontSize: 14,   
              color: '#64748B',   
              marginBottom: 24,  
              fontWeight: 400  
            }}>  
              {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first project'}  
            </div>  
            {!hasActiveFilters && (  
              <button  
                onClick={() => navigate('/projects/new')}  
                style={{  
                  background: '#2563EB',  
                  color: 'white',  
                  border: 'none',  
                  borderRadius: 8,  
                  padding: '10px 20px',  
                  fontSize: 14,  
                  fontWeight: 500,  
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>  
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
                    borderRadius: 8,  
                    padding: '16px',  
                    cursor: 'pointer',  
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',  
                  }}  
                >  
                  <div style={{   
                    display: 'flex',   
                    alignItems: 'flex-start',   
                    justifyContent: 'space-between',  
                    gap: 12,  
                    marginBottom: 12  
                  }}>  
                    <div style={{ minWidth: 0, flex: 1 }}>  
                      <div style={{  
                        display: 'inline-block',  
                        fontSize: 11,  
                        fontWeight: 500,  
                        color: st.color,  
                        background: `${st.color}10`,  
                        borderRadius: 4,  
                        padding: '2px 8px',  
                        marginBottom: 8,  
                      }}>  
                        {st.label}  
                      </div>  
                      <h3 style={{  
                        margin: 0,  
                        fontSize: 16,  
                        fontWeight: 500,  
                        color: '#0F172A',  
                        lineHeight: 1.4,  
                        marginBottom: 4  
                      }}>  
                        {project.name}  
                      </h3>  
                      {project.client_name && (  
                        <div style={{  
                          fontSize: 14,  
                          fontWeight: 400,  
                          color: '#64748B',  
                          overflow: 'hidden',  
                          textOverflow: 'ellipsis',  
                          whiteSpace: 'nowrap'  
                        }}>  
                          {project.client_name}  
                        </div>  
                      )}  
                    </div>  
  
                    {/* Menu - FIX: Stop all propagation immediately */}  
                    <div  
                      ref={el => menuRefs.current[project.id] = el}  
                      style={{   
                        position: 'relative',   
                        flexShrink: 0,  
                      }}  
                      onMouseDown={e => e.stopPropagation()}  
                      onClick={e => e.stopPropagation()}  
                      onTouchStart={e => e.stopPropagation()}  
                    >  
                      <button  
                        onMouseDown={e => e.stopPropagation()}  
                        onClick={e => {  
                          e.preventDefault()  
                          e.stopPropagation()  
                          setOpenMenuId(isMenuOpen ? null : project.id)  
                        }}  
                        onTouchStart={e => {  
                          e.preventDefault()  
                          e.stopPropagation()  
                        }}  
                        onTouchEnd={e => {  
                          e.preventDefault()  
                          e.stopPropagation()  
                          setOpenMenuId(isMenuOpen ? null : project.id)  
                        }}  
                        style={{  
                          width: 36,  
                          height: 36,  
                          borderRadius: 6,  
                          border: '1px solid #E2E8F0',  
                          background: isMenuOpen ? '#F8FAFC' : 'white',  
                          color: '#64748B',  
                          cursor: 'pointer',  
                          display: 'flex',  
                          alignItems: 'center',  
                          justifyContent: 'center',  
                        }}  
                      >  
                        <MoreVertical size={16} />  
                      </button>  
  
                      {isMenuOpen && (  
                        <div  
                          onMouseDown={e => e.stopPropagation()}  
                          onClick={e => e.stopPropagation()}  
                          onTouchStart={e => e.stopPropagation()}  
                          style={{  
                            position: 'absolute',  
                            right: 0,  
                            top: 'calc(100% + 4px)',  
                            zIndex: 1000,  
                            minWidth: 180,  
                            maxHeight: '70vh',  
                            overflowY: 'auto',  
                            borderRadius: 8,  
                            border: '1px solid #E2E8F0',  
                            background: 'white',  
                            padding: '4px',  
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',  
                          }}  
                        >  
                          <button  
                            className="proj-menu-item"  
                            onMouseDown={e => e.stopPropagation()}  
                            onClick={e => {  
                              e.preventDefault()  
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
                              padding: '8px 12px',  
                              borderRadius: 6,  
                              fontSize: 14,  
                              color: '#0F172A',  
                              cursor: 'pointer',  
                              fontWeight: 400  
                            }}  
                          >  
                            Edit  
                          </button>  
  
                          <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />  
  
                          <div style={{ padding: '8px 12px 4px' }}>  
                            <span style={{  
                              fontSize: 11,  
                              color: '#94A3B8',  
                              fontWeight: 500,  
                            }}>  
                              Change status  
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
                                onMouseDown={e => e.stopPropagation()}  
                                onClick={e => {  
                                  e.preventDefault()  
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
                                  background: isCurrent ? '#F8FAFC' : 'transparent',  
                                  textAlign: 'left',  
                                  padding: '8px 12px',  
                                  borderRadius: 6,  
                                  fontSize: 13,  
                                  color: '#0F172A',  
                                  cursor: 'pointer',  
                                  fontWeight: isCurrent ? 500 : 400,  
                                }}  
                              >  
                                <span>{action.label}</span>  
                                {isCurrent && (  
                                  <span style={{ color: '#2563EB', fontSize: 16 }}>✓</span>  
                                )}  
                              </button>  
                            )  
                          })}  
  
                          <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />  
  
                          <button  
                            className="proj-menu-item"  
                            onMouseDown={e => e.stopPropagation()}  
                            onClick={e => {  
                              e.preventDefault()  
                              e.stopPropagation()  
                              handleArchive(project)  
                            }}  
                            style={{  
                              display: 'block',  
                              width: '100%',  
                              border: 'none',  
                              background: 'transparent',  
                              textAlign: 'left',  
                              padding: '8px 12px',  
                              borderRadius: 6,  
                              fontSize: 14,  
                              color: '#F59E0B',  
                              cursor: 'pointer',  
                              fontWeight: 400  
                            }}  
                          >  
                            Archive  
                          </button>  
  
                          <button  
                            className="proj-menu-item"  
                            onMouseDown={e => e.stopPropagation()}  
                            onClick={e => {  
                              e.preventDefault()  
                              e.stopPropagation()  
                              handleDelete(project)  
                            }}  
                            style={{  
                              display: 'block',  
                              width: '100%',  
                              border: 'none',  
                              background: 'transparent',  
                              textAlign: 'left',  
                              padding: '8px 12px',  
                              borderRadius: 6,  
                              fontSize: 14,  
                              color: '#DC2626',  
                              cursor: 'pointer',  
                              fontWeight: 400  
                            }}  
                          >  
                            Delete  
                          </button>  
                        </div>  
                      )}  
                    </div>  
                  </div>  
  
                  {/* Meta */}  
                  <div style={{   
                    display: 'flex',   
                    gap: 16,   
                    marginBottom: 12,  
                    flexWrap: 'wrap'  
                  }}>  
                    <div style={{   
                      display: 'flex',   
                      alignItems: 'center',   
                      gap: 6   
                    }}>  
                      <FileText size={16} color="#94A3B8" strokeWidth={1.5} />  
                      <span style={{   
                        fontSize: 13,   
                        color: '#64748B',   
                        fontWeight: 400   
                      }}>  
                        {count}  
                      </span>  
                    </div>  
                    {startedText && (  
                      <div style={{   
                        display: 'flex',   
                        alignItems: 'center',   
                        gap: 6   
                      }}>  
                        <Calendar size={16} color="#94A3B8" strokeWidth={1.5} />  
                        <span style={{   
                          fontSize: 13,   
                          color: '#64748B',   
                          fontWeight: 400   
                        }}>  
                          {startedText}  
                        </span>  
                      </div>  
                    )}  
                  </div>  
  
                  {/* Value */}  
                  <div style={{  
                    paddingTop: 12,  
                    borderTop: '1px solid #F1F5F9',  
                    fontSize: 20,  
                    fontWeight: 600,  
                    color: '#0F172A'  
                  }}>  
                    {formattedValue}  
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