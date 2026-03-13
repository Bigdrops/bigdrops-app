import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  FolderKanban, FileText, Wrench, Plus, Link2, ChevronRight,
  MoreHorizontal, Pencil, Check, X, Calendar, Building2, Hash,
  DollarSign, AlertCircle, ExternalLink
} from 'lucide-react'

const STATUS_CONFIG = {
  active:    { label: 'Active',    bg: '#DCFCE7', color: '#16A34A' },
  completed: { label: 'Completed', bg: '#E0F2FE', color: '#0369A1' },
  on_hold:   { label: 'On Hold',   bg: '#FEF3C7', color: '#92400E' },
  cancelled: { label: 'Cancelled', bg: '#FEE2E2', color: '#DC2626' },
}

const DOC_TYPE = {
  invoice: { label: 'Invoice',  icon: FileText, bg: '#EFF6FF', color: '#1D4ED8' },
  csr:     { label: 'CSR',      icon: Wrench,   bg: '#F0FDF4', color: '#16A34A' },
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 13px', border: '1px solid #E2E8F0',
  borderRadius: 8, fontSize: 13, color: '#1E293B',
  background: 'white', outline: 'none',
}

export default function ProjectDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [project,  setProject]   = useState(null)
  const [invoices, setInvoices]  = useState([])
  const [csrs,     setCsrs]      = useState([])
  const [loading,  setLoading]   = useState(true)
  const [editing,  setEditing]   = useState(false)
  const [saving,   setSaving]    = useState(false)

  // Link existing doc modal
  const [showLink,    setShowLink]    = useState(false)
  const [linkDocId,   setLinkDocId]   = useState('')
  const [linkType,    setLinkType]    = useState('invoice')
  const [linking,     setLinking]     = useState(false)
  const [linkError,   setLinkError]   = useState('')

  // Edit form
  const [editForm, setEditForm] = useState({})

  useEffect(() => { fetchAll() }, [id])

  const fetchAll = async () => {
    setLoading(true)
    const { data: p } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(p)
    setEditForm({
      name: p?.name || '',
      status: p?.status || 'active',
      project_value: p?.project_value || '',
      po_number: p?.po_number || '',
      start_date: p?.start_date || '',
      notes: p?.notes || '',
    })

    const [invRes, csrRes] = await Promise.all([
      supabase.from('invoices').select('id, invoice_number, invoice_title, status, total, issue_date, document_type').eq('project_id', id).is('archived_at', null).order('issue_date', { ascending: false }),
      supabase.from('csrs').select('id, csr_number, title, status, created_at').eq('project_id', id).order('created_at', { ascending: false }),
    ])
    setInvoices(invRes.data || [])
    setCsrs(csrRes.data || [])
    setLoading(false)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    const { error } = await supabase.from('projects').update({
      name:          editForm.name.trim(),
      status:        editForm.status,
      project_value: editForm.project_value ? parseFloat(editForm.project_value) : null,
      po_number:     editForm.po_number.trim() || null,
      start_date:    editForm.start_date,
      notes:         editForm.notes.trim() || null,
    }).eq('id', id)
    setSaving(false)
    if (error) { alert('Failed to save: ' + error.message); return }
    setEditing(false)
    fetchAll()
  }

  // Link existing document by ID
  const handleLink = async () => {
    setLinkError('')
    const val = linkDocId.trim()
    if (!val) { setLinkError('Enter a document number or ID'); return }
    setLinking(true)

    let found = false
    if (linkType === 'invoice') {
      // Try invoice_number first, then UUID
      let query = supabase.from('invoices').select('id, invoice_number').eq('project_id', null)
      const isUUID = /^[0-9a-f-]{36}$/i.test(val)
      query = isUUID ? query.eq('id', val) : query.ilike('invoice_number', val)
      const { data } = await query.single()
      if (data) {
        await supabase.from('invoices').update({ project_id: id }).eq('id', data.id)
        found = true
      }
    } else if (linkType === 'csr') {
      let query = supabase.from('csrs').select('id, csr_number').eq('project_id', null)
      const isUUID = /^[0-9a-f-]{36}$/i.test(val)
      query = isUUID ? query.eq('id', val) : query.ilike('csr_number', val)
      const { data } = await query.single()
      if (data) {
        await supabase.from('csrs').update({ project_id: id }).eq('id', data.id)
        found = true
      }
    }

    setLinking(false)
    if (!found) {
      setLinkError(`No unlinked ${linkType} found with that ID. Make sure it's not already in a project.`)
      return
    }
    setLinkDocId('')
    setShowLink(false)
    fetchAll()
  }

  // Build unified timeline
  const timeline = [
    ...invoices.map(inv => ({ ...inv, _type: 'invoice', _date: inv.issue_date })),
    ...csrs.map(csr =>     ({ ...csr, _type: 'csr',     _date: csr.created_at })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date))

  // Summary numbers from invoices
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const totalReceived = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
  const outstanding   = Math.max(0, totalInvoiced - totalReceived)
  const docCount      = invoices.length + csrs.length

  if (loading) return <Layout title="Project"><div style={{ padding: 40, color: '#94A3B8' }}>Loading...</div></Layout>
  if (!project) return <Layout title="Project"><div style={{ padding: 40, color: '#94A3B8' }}>Project not found.</div></Layout>

  const st = STATUS_CONFIG[project.status] || STATUS_CONFIG.active

  return (
    <Layout title={project.name}>
      <div style={{ maxWidth: 960 }}>

        {/* ── Header block ──────────────────────────────────────────────── */}
        <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24, marginBottom: 16 }}>
          {!editing ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FolderKanban size={22} color="#475569" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{project.name}</h1>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#64748B' }}>
                  {project.client_name && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Building2 size={12} />{project.client_name}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={12} />
                    Started {new Date(project.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {project.project_value && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <DollarSign size={12} />₦{Number(project.project_value).toLocaleString()}
                    </span>
                  )}
                  {project.po_number && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Hash size={12} />PO: {project.po_number}
                    </span>
                  )}
                </div>
                {project.notes && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>{project.notes}</div>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white', fontSize: 12, color: '#64748B', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
              >
                <Pencil size={13} /> Edit
              </button>
            </div>
          ) : (
            // Edit mode
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 5, textTransform: 'uppercase' }}>Project Name</label>
                  <input style={inputStyle} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 5, textTransform: 'uppercase' }}>Status</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 5, textTransform: 'uppercase' }}>Start Date</label>
                  <input type="date" style={inputStyle} value={editForm.start_date} onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 5, textTransform: 'uppercase' }}>Project Value (₦)</label>
                  <input type="number" style={inputStyle} value={editForm.project_value} onChange={e => setEditForm(f => ({ ...f, project_value: e.target.value }))} placeholder="Optional" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 5, textTransform: 'uppercase' }}>P.O. Number</label>
                  <input style={inputStyle} value={editForm.po_number} onChange={e => setEditForm(f => ({ ...f, po_number: e.target.value }))} placeholder="Optional" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 5, textTransform: 'uppercase' }}>Notes</label>
                  <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '9px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white', fontSize: 13, color: '#64748B', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} style={{ flex: 2, padding: '9px', border: 'none', borderRadius: 8, background: saving ? '#94A3B8' : '#0F172A', fontSize: 13, color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Summary strip ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Documents',      value: docCount,                                       suffix: '' },
            { label: 'Total Invoiced', value: `₦${totalInvoiced.toLocaleString()}`,           suffix: '' },
            { label: 'Total Received', value: `₦${totalReceived.toLocaleString()}`,           suffix: '' },
            { label: 'Outstanding',    value: `₦${outstanding.toLocaleString()}`,             suffix: '', highlight: outstanding > 0 },
          ].map(card => (
            <div
              key={card.label}
              style={{
                backgroundColor: 'white', border: `1px solid ${card.highlight ? '#FEE2E2' : '#E2E8F0'}`,
                borderRadius: 12, padding: '14px 16px',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: card.highlight ? '#DC2626' : '#0F172A' }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>

          {/* LEFT — Document timeline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Documents ({docCount})</div>
              <button
                onClick={() => setShowLink(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white', fontSize: 12, color: '#64748B', cursor: 'pointer', fontWeight: 600 }}
              >
                <Link2 size={13} /> Link Existing
              </button>
            </div>

            {timeline.length === 0 ? (
              <div style={{ backgroundColor: 'white', border: '1px dashed #E2E8F0', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <FolderKanban size={32} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>No documents yet</div>
                <div style={{ fontSize: 12, color: '#CBD5E1' }}>Create a document from the quick actions panel, or link an existing one.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {timeline.map(doc => {
                  const cfg = DOC_TYPE[doc._type] || DOC_TYPE.invoice
                  const Icon = cfg.icon
                  const docNumber = doc.invoice_number || doc.csr_number || '—'
                  const docTitle  = doc.invoice_title || doc.title || ''
                  const docDate   = doc._date ? new Date(doc._date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                  const docPath   = doc._type === 'invoice' ? `/invoices/${doc.id}` : `/csr/${doc.id}`

                  return (
                    <div
                      key={doc.id}
                      style={{
                        backgroundColor: 'white', border: '1px solid #E2E8F0',
                        borderRadius: 12, padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: 14,
                        cursor: 'pointer', transition: 'border-color 0.15s',
                      }}
                      onClick={() => navigate(docPath)}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#94A3B8'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={16} color={cfg.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{docNumber}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {docTitle && <span style={{ marginRight: 8 }}>{docTitle}</span>}
                          <span style={{ color: '#CBD5E1' }}>{docDate}</span>
                        </div>
                      </div>
                      {doc.total && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', flexShrink: 0 }}>
                          ₦{Number(doc.total).toLocaleString()}
                        </div>
                      )}
                      <ChevronRight size={15} color="#CBD5E1" style={{ flexShrink: 0 }} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT — Side panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Quick Actions */}
            <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: '+ New Invoice', path: `/invoices/new`, state: { projectId: id, projectName: project.name, clientId: project.client_id, clientName: project.client_name } },
                  { label: '+ New CSR',     path: `/csr/new`,      state: { projectId: id, projectName: project.name } },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path, { state: action.state })}
                    style={{
                      width: '100%', padding: '9px 14px', border: '1px solid #E2E8F0',
                      borderRadius: 8, background: 'white', fontSize: 13, color: '#334155',
                      cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Info */}
            <div style={{ backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Project Info</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Client',   value: project.client_name || '—' },
                  { label: 'P.O. No.', value: project.po_number   || '—' },
                  { label: 'Value',    value: project.project_value ? `₦${Number(project.project_value).toLocaleString()}` : '—' },
                  { label: 'Started',  value: project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Link Existing Document Modal ──────────────────────────────── */}
        {showLink && (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => { setShowLink(false); setLinkDocId(''); setLinkError('') }}
          >
            <div
              style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 12px 50px rgba(0,0,0,0.2)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Link Existing Document</h3>
                <button onClick={() => { setShowLink(false); setLinkDocId(''); setLinkError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 20, lineHeight: 1 }}>×</button>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                Drop the document number or ID to link it to this project.
              </p>

              {/* Type selector */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Document Type</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['invoice', 'csr'].map(t => (
                    <button
                      key={t}
                      onClick={() => setLinkType(t)}
                      style={{
                        flex: 1, padding: '8px', border: '1px solid',
                        borderColor: linkType === t ? '#0F172A' : '#E2E8F0',
                        borderRadius: 8, background: linkType === t ? '#0F172A' : 'white',
                        color: linkType === t ? 'white' : '#64748B',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                      }}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document ID input */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Document Number or ID</div>
                <input
                  style={inputStyle}
                  value={linkDocId}
                  onChange={e => { setLinkDocId(e.target.value); setLinkError('') }}
                  placeholder={linkType === 'invoice' ? 'e.g. SASINV-B021' : 'e.g. CSR-004'}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleLink()}
                />
                {linkError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 8, padding: '8px 10px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 8 }}>
                    <AlertCircle size={13} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12, color: '#DC2626' }}>{linkError}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { setShowLink(false); setLinkDocId(''); setLinkError('') }}
                  style={{ flex: 1, padding: '10px', border: '1px solid #E2E8F0', borderRadius: 8, background: 'white', fontSize: 13, color: '#64748B', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLink}
                  disabled={linking}
                  style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 8, background: linking ? '#94A3B8' : '#0F172A', fontSize: 13, color: 'white', cursor: linking ? 'not-allowed' : 'pointer', fontWeight: 700 }}
                >
                  {linking ? 'Linking...' : 'Link Document'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
