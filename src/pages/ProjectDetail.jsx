import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronRight,
  ClipboardList,
  DollarSign,
  FileText,
  FolderKanban,
  Hash,
  Link2,
  MapPin,
  Pencil,
  Truck,
  Wrench,
  X,
} from 'lucide-react'

import Layout from '../components/Layout'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import ProjectDocumentCard from '@/components/project/ProjectDocumentCard'
import ProjectDocumentSheet from '@/components/project/ProjectDocumentSheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { getClientMismatchMessage, isClientMismatch } from '@/domain/projects'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'
import { supabase } from '../supabase'

const PROJECT_STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-blue-500 text-white' },
  completed: { label: 'Completed', className: 'bg-slate-500 text-white' },
  on_hold: { label: 'On Hold', className: 'bg-amber-500 text-white' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500 text-white' },
}

const PAYMENT_STATUS_CONFIG = {
  paid: { label: 'Paid', className: 'bg-emerald-500 text-white' },
  overdue: { label: 'Overdue', className: 'bg-red-500 text-white' },
  partial: { label: 'Partial', className: 'bg-amber-500 text-white' },
  active: { label: 'Active', className: 'bg-blue-500 text-white' },
  completed: { label: 'Completed', className: 'bg-slate-500 text-white' },
}

const DOC_TYPE = {
  invoice: {
    label: 'Invoice',
    icon: FileText,
    iconWrapClassName: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
    labelClassName: 'text-blue-700',
  },
  csr: {
    label: 'CSR',
    icon: Wrench,
    iconWrapClassName: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
    labelClassName: 'text-emerald-700',
  },
  quotation: {
    label: 'Quotation',
    icon: ClipboardList,
    iconWrapClassName: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
    labelClassName: 'text-violet-700',
  },
  waybill: {
    label: 'Waybill',
    icon: Truck,
    iconWrapClassName: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100',
    labelClassName: 'text-orange-700',
  },
}

const inputClassName =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'

const cardClassName = 'rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100'

const formatCurrency = (value) => formatNaira(value)

const formatDate = (value) =>
  formatDisplayDate(value, {
    fallback: '',
    invalidFallback: '',
    locale: 'en-GB',
    dateOptions: {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  })

function getPaymentStatusConfig(status) {
  return PAYMENT_STATUS_CONFIG[status] || {
    label: status ? formatStatusLabel(status) : 'Open',
    className: 'bg-slate-500 text-white',
  }
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [financials, setFinancials] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [csrs, setCsrs] = useState([])
  const [quotations, setQuotations] = useState([])
  const [waybills, setWaybills] = useState([])
  const [projectDocs, setProjectDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [showLink, setShowLink] = useState(false)
  const [showProjectDocumentSheet, setShowProjectDocumentSheet] = useState(false)
  const [projectDocumentToDelete, setProjectDocumentToDelete] = useState(null)
  const [linkDocId, setLinkDocId] = useState('')
  const [linkType, setLinkType] = useState('invoice')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState('')

  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    fetchAll()
  }, [id])

  const fetchAll = async () => {
    setLoading(true)

    const [projectRes, invoiceRes, csrRes, quotationRes, waybillRes, financialsRes, projectDocsRes] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase
        .from('invoices')
        .select('id, invoice_number, invoice_title, status, total, issue_date, document_type')
        .eq('project_id', id)
        .is('archived_at', null)
        .order('issue_date', { ascending: false }),
      supabase
        .from('csrs')
        .select('id, csr_number, title, status, created_at')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('quotations')
        .select('id, quotation_number, status, total, issue_date')
        .eq('project_id', id)
        .order('issue_date', { ascending: false }),
      supabase
        .from('waybills')
        .select('id, waybill_number, status, date, created_at, type')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
      supabase.from('project_financials_v').select('*').eq('project_id', id).single(),
      supabase.from('project_documents').select('*').eq('project_id', id).order('created_at', { ascending: false }),
    ])

    const projectData = projectRes.data
    const invoiceRows = invoiceRes.data || []
    const invoiceIds = invoiceRows.map((invoice) => invoice.id)

    let invoiceFinancialsById = {}
    if (invoiceIds.length > 0) {
      const { data: invoiceFinancialsRows } = await supabase
        .from('invoice_financials_v')
        .select('id, balance_due, computed_status, cash_received')
        .in('id', invoiceIds)

      invoiceFinancialsById = (invoiceFinancialsRows || []).reduce((acc, row) => {
        acc[row.id] = row
        return acc
      }, {})
    }

    const enrichedInvoices = invoiceRows.map((invoice) => ({
      ...invoice,
      invoiceFinancials: invoiceFinancialsById[invoice.id] || null,
    }))

    setProject(projectData)
    setFinancials(financialsRes.data || null)
    setInvoices(enrichedInvoices)
    setCsrs(csrRes.data || [])
    setQuotations(quotationRes.data || [])
    setWaybills(waybillRes.data || [])
    setProjectDocs(projectDocsRes.data || [])
    setEditForm({
      name: projectData?.name || '',
      status: projectData?.status || 'active',
      project_value: projectData?.project_value || '',
      po_number: projectData?.po_number || '',
      start_date: projectData?.start_date || '',
      notes: projectData?.notes || '',
      location: projectData?.location || '',
    })
    setLoading(false)
  }

  const handleSaveEdit = async () => {
    setSaving(true)

    const { error } = await supabase
      .from('projects')
      .update({
        name: editForm.name.trim(),
        status: editForm.status,
        project_value: editForm.project_value ? parseFloat(editForm.project_value) : null,
        po_number: editForm.po_number.trim() || null,
        start_date: editForm.start_date,
        notes: editForm.notes.trim() || null,
        location: editForm.location.trim() || null,
      })
      .eq('id', id)

    setSaving(false)
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' })
      return
    }

    setEditing(false)
    fetchAll()
  }

  const handleLink = async () => {
    setLinkError('')
    const val = linkDocId.trim()
    if (!val) {
      setLinkError('Enter a document number')
      return
    }

    setLinking(true)
    const linkConfig = {
      invoice: { table: 'invoices', numberField: 'invoice_number' },
      csr: { table: 'csrs', numberField: 'csr_number' },
      quotation: { table: 'quotations', numberField: 'quotation_number' },
      waybill: { table: 'waybills', numberField: 'waybill_number' },
    }
    const selectedConfig = linkConfig[linkType]
    const { data, error } = await supabase
      .from(selectedConfig.table)
      .select(`id, ${selectedConfig.numberField}, client_id, client_name`)
      .is('project_id', null)
      .ilike(selectedConfig.numberField, val)
      .maybeSingle()

    if (error) {
      setLinking(false)
      setLinkError(error.message)
      return
    }

    if (!data) {
      setLinking(false)
      setLinkError(
        `No unlinked ${linkType} found with that document number. Check the number and make sure it is not already linked to another project.`,
      )
      return
    }

    if (
      isClientMismatch({
        documentClientId: data.client_id,
        documentClientName: data.client_name,
        projectClientId: project?.client_id,
        projectClientName: project?.client_name,
      })
    ) {
      setLinking(false)
      setLinkError(
        getClientMismatchMessage({
          documentClientName: data.client_name,
          projectClientName: project?.client_name,
        }),
      )
      return
    }

    const { error: updateError } = await supabase
      .from(selectedConfig.table)
      .update({ project_id: id })
      .eq('id', data.id)

    setLinking(false)
    if (updateError) {
      setLinkError(updateError.message)
      return
    }

    setLinkDocId('')
    setShowLink(false)
    fetchAll()
  }

  const handleDeleteProjectDocument = async (docId) => {
    const { error } = await supabase.from('project_documents').delete().eq('id', docId)
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
      return
    }

    setProjectDocumentToDelete(null)
    fetchAll()
  }

  const timeline = [
    ...invoices.map((invoice) => ({
      ...invoice,
      _type: 'invoice',
      _date: invoice.issue_date,
    })),
    ...csrs.map((csr) => ({
      ...csr,
      _type: 'csr',
      _date: csr.created_at,
    })),
    ...quotations.map((quotation) => ({
      ...quotation,
      _type: 'quotation',
      _date: quotation.issue_date,
    })),
    ...waybills.map((waybill) => ({
      ...waybill,
      _type: 'waybill',
      _date: waybill.date || waybill.created_at,
    })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date))

  const docCount = timeline.length

  if (loading) {
    return (
      <Layout title="Project">
        <div className="px-6 py-10 text-sm text-muted-foreground">Loading...</div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout title="Project">
        <div className="px-6 py-10 text-sm text-muted-foreground">Project not found.</div>
      </Layout>
    )
  }

  const projectStatus = PROJECT_STATUS_CONFIG[project.status] || PROJECT_STATUS_CONFIG.active
  const summaryCards = [
    {
      label: 'Total Invoiced',
      value: formatCurrency(financials?.total_invoiced),
      valueClassName: 'text-slate-900',
      accentClassName: 'border-blue-200',
    },
    {
      label: 'Cash Collected',
      value: formatCurrency(financials?.cash_collected),
      valueClassName: 'text-emerald-600',
      accentClassName: 'border-emerald-200',
    },
    {
      label: 'WHT Collected',
      value: formatCurrency(financials?.wht_collected),
      valueClassName: 'text-emerald-600',
      accentClassName: 'border-emerald-200',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(financials?.outstanding),
      valueClassName: Number(financials?.outstanding || 0) > 0 ? 'text-red-600' : 'text-slate-900',
      accentClassName: Number(financials?.outstanding || 0) > 0 ? 'border-red-200' : 'border-slate-200',
    },
    {
      label: 'Invoice Count',
      value: Number(financials?.invoice_count || 0).toLocaleString(),
      valueClassName: 'text-slate-900',
      accentClassName: 'border-violet-200',
    },
  ]

  const quickActions = [
    {
      label: '+ New Invoice',
      path: '/invoices/new',
      className: 'bg-emerald-600 text-white hover:bg-emerald-700',
      state: {
        projectId: id,
        projectCode: project.project_code,
        projectName: project.name,
        clientId: project.client_id,
        clientName: project.client_name,
      },
    },
    {
      label: '+ New Quotation',
      path: '/quotations/new',
      className: 'bg-blue-600 text-white hover:bg-blue-700',
      state: {
        projectId: id,
        projectCode: project.project_code,
        projectName: project.name,
        clientId: project.client_id,
        clientName: project.client_name,
      },
    },
    {
      label: '+ New CSR',
      path: '/csr/new',
      className: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      state: {
        projectId: id,
        projectCode: project.project_code,
        projectName: project.name,
        clientId: project.client_id,
        clientName: project.client_name,
      },
    },
    {
      label: '+ New Waybill',
      path: '/waybills/new',
      className: 'border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
      state: {
        projectId: id,
        projectCode: project.project_code,
        projectName: project.name,
        clientId: project.client_id,
        clientName: project.client_name,
      },
    },
  ]

  return (
    <Layout title={project.name}>
      <div className="mx-auto max-w-6xl space-y-4">
        <div className={`${cardClassName} border-l-4 border-l-emerald-500 p-5 sm:p-6`}>
          {!editing ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <FolderKanban size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{project.name}</h1>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${projectStatus.className}`}>
                    {projectStatus.label}
                  </span>
                </div>

                {project.project_code ? (
                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {project.project_code}
                  </div>
                ) : null}

                <div className="mb-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {project.client_name ? (
                    <span className="inline-flex items-center gap-2">
                      <Building2 size={14} className="text-muted-foreground" />
                      <span className="font-medium text-slate-700">{project.client_name}</span>
                    </span>
                  ) : null}

                  {project.location ? (
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={14} className="text-muted-foreground" />
                      <span>{project.location}</span>
                    </span>
                  ) : null}

                  {String(project.po_number || '').trim() ? (
                    <span className="inline-flex items-center gap-2">
                      <Hash size={14} className="text-muted-foreground" />
                      <span>
                        PO: <span className="font-medium text-slate-700">{String(project.po_number || '').trim()}</span>
                      </span>
                    </span>
                  ) : null}

                  {project.project_value ? (
                    <span className="inline-flex items-center gap-2">
                      <DollarSign size={14} className="text-muted-foreground" />
                      <span>{formatCurrency(project.project_value)}</span>
                    </span>
                  ) : null}

                  {project.start_date ? (
                    <span className="inline-flex items-center gap-2">
                      <Calendar size={14} className="text-muted-foreground" />
                      <span>Started {formatDate(project.start_date)}</span>
                    </span>
                  ) : null}
                </div>

                {project.notes ? <p className="text-sm italic text-muted-foreground">{project.notes}</p> : null}
              </div>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Pencil size={14} />
                Edit
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Project Name
                  </label>
                  <input
                    className={inputClassName}
                    value={editForm.name}
                    onChange={(e) => setEditForm((form) => ({ ...form, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </label>
                  <Select value={editForm.status} onValueChange={(value) => setEditForm((form) => ({ ...form, status: value }))}>
                    <SelectTrigger className={`${inputClassName} cursor-pointer`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className={inputClassName}
                    value={editForm.start_date}
                    onChange={(e) => setEditForm((form) => ({ ...form, start_date: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Project Value (₦)
                  </label>
                  <input
                    type="number"
                    className={inputClassName}
                    value={editForm.project_value}
                    onChange={(e) => setEditForm((form) => ({ ...form, project_value: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    P.O. Number
                  </label>
                  <input
                    className={inputClassName}
                    value={editForm.po_number}
                    onChange={(e) => setEditForm((form) => ({ ...form, po_number: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Site / Location
                  </label>
                  <input
                    className={inputClassName}
                    value={editForm.location}
                    onChange={(e) => setEditForm((form) => ({ ...form, location: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </label>
                  <textarea
                    className={`${inputClassName} min-h-[96px] resize-y`}
                    value={editForm.notes}
                    onChange={(e) => setEditForm((form) => ({ ...form, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-muted/50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <div key={card.label} className={`${cardClassName} border-l-4 ${card.accentClassName} p-4`}>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {card.label}
              </div>
              <div className={`text-2xl font-extrabold tracking-tight ${card.valueClassName}`}>{card.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_280px] md:items-start">
          <div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold text-slate-700">Documents ({docCount})</div>
              <button
                type="button"
                onClick={() => setShowLink(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                <Link2 size={14} />
                Link Existing
              </button>
            </div>

            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-card p-10 text-center shadow-sm ring-1 ring-emerald-50">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                  <FolderKanban size={24} />
                </div>
                <div className="mb-1 text-sm font-semibold text-slate-700">No documents yet</div>
                <div className="text-sm text-muted-foreground">
                  Create a document from the quick actions panel, or link an existing one.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {timeline.map((doc) => {
                  const cfg = DOC_TYPE[doc._type] || DOC_TYPE.invoice
                  const Icon = cfg.icon
                  const docNumber = doc.invoice_number || doc.csr_number || doc.quotation_number || '—'
                  const docTitle = doc.invoice_title || doc.title || ''
                  const docDate = formatDate(doc._date)
                  const docPath =
                    doc._type === 'invoice'
                      ? `/invoices/${doc.id}`
                      : doc._type === 'quotation'
                        ? `/quotations/${doc.id}`
                      : doc._type === 'waybill'
                        ? `/waybills/${doc.id}`
                        : `/csr/${doc.id}`

                  const invoiceFinancials = doc.invoiceFinancials
                  const paymentStatus = doc._type === 'invoice' ? getPaymentStatusConfig(invoiceFinancials?.computed_status) : null
                  const balanceDue = Number(invoiceFinancials?.balance_due || 0)

                  return (
                    <button
                      key={`${doc._type}-${doc.id}`}
                      type="button"
                      onClick={() => navigate(docPath)}
                      className="group flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm ring-1 ring-ring transition hover:border-border hover:shadow-md"
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cfg.iconWrapClassName}`}>
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.labelClassName}`}>
                            {cfg.label}
                          </span>
                          <span className="text-sm font-bold text-foreground">{docNumber}</span>
                          {paymentStatus ? (
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${paymentStatus.className}`}>
                              {paymentStatus.label}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          {docTitle ? <span className="truncate text-muted-foreground">{docTitle}</span> : null}
                          {docDate ? <span>{docDate}</span> : null}
                        </div>

                        {doc._type === 'invoice' ? (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            {balanceDue > 0 ? (
                              <span className="font-semibold text-red-600">{formatCurrency(balanceDue)} outstanding</span>
                            ) : (
                              <span className="font-semibold text-emerald-600">Paid</span>
                            )}
                            {invoiceFinancials?.cash_received ? (
                              <span className="text-emerald-600">
                                Collected {formatCurrency(invoiceFinancials.cash_received)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        {doc.total ? (
                          <div className={`text-sm font-bold ${doc._type === 'invoice' && balanceDue > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {formatCurrency(doc.total)}
                          </div>
                        ) : null}
                        <ChevronRight size={16} className="text-slate-300 transition group-hover:text-muted-foreground" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-5 rounded-2xl border-l-4 border-l-amber-500 border border-border bg-card p-4 shadow-sm ring-1 ring-amber-50">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-700">External Documents ({projectDocs.length})</div>
                  <div className="mt-1 text-sm text-muted-foreground">POs, receipts, waybills, and other third-party project records.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProjectDocumentSheet(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  + Add Document
                </button>
              </div>

              {projectDocs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-8 text-center">
                  <div className="text-sm font-semibold text-slate-700">No external documents yet</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Use the AI prompt to extract JSON, then save a readable project record for purchase orders, receipts, waybills, and other files.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectDocs.map((document) => (
                    <ProjectDocumentCard key={document.id} document={document} onDelete={setProjectDocumentToDelete} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${cardClassName} border-t-4 border-t-blue-500 p-4`}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Quick Actions</div>
              <div className="space-y-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => navigate(action.path, { state: action.state })}
                    className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition ${action.className}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ProjectDocumentSheet
          open={showProjectDocumentSheet}
          onOpenChange={setShowProjectDocumentSheet}
          projectId={id}
          onSuccess={fetchAll}
        />

        {showLink ? (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/55 p-5"
            onClick={() => {
              setShowLink(false)
              setLinkDocId('')
              setLinkError('')
            }}
          >
            <div
              className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl ring-1 ring-ring"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-foreground">Link Existing Document</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Search by the exact document number, like <strong>SASINV-B021</strong>, <strong>SASQ-0012</strong>, or{' '}
                    <strong>CSR-004</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowLink(false)
                    setLinkDocId('')
                    setLinkError('')
                  }}
                  className="rounded-full border border-border bg-muted/50 p-2 text-muted-foreground transition hover:bg-muted/50"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Document Type</div>
                  <div className="grid grid-cols-2 gap-2">
                    {['invoice', 'quotation', 'csr', 'waybill'].map((type) => {
                      const active = linkType === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setLinkType(type)}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
                            active
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {type}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Document Number
                  </div>
                  <input
                    className={inputClassName}
                    value={linkDocId}
                    onChange={(e) => {
                      setLinkDocId(e.target.value)
                      setLinkError('')
                    }}
                    placeholder={
                      linkType === 'invoice'
                        ? 'e.g. SASINV-B021'
                        : linkType === 'quotation'
                          ? 'e.g. SASQ-0012'
                          : linkType === 'csr'
                            ? 'e.g. CSR-004'
                            : 'e.g. SASWB-E003'
                    }
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleLink()}
                  />
                  {linkError ? (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{linkError}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLink(false)
                      setLinkDocId('')
                      setLinkError('')
                    }}
                    className="rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-muted/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleLink}
                    disabled={linking}
                    className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {linking ? 'Linking...' : 'Link Document'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <ConfirmActionDialog
          open={Boolean(projectDocumentToDelete)}
          onOpenChange={(open) => {
            if (!open) setProjectDocumentToDelete(null)
          }}
          title="Delete this external document?"
          description="This action cannot be undone."
          confirmLabel="Delete Document"
          onConfirm={() => {
            if (projectDocumentToDelete) void handleDeleteProjectDocument(projectDocumentToDelete)
          }}
        />
      </div>
    </Layout>
  )
}
