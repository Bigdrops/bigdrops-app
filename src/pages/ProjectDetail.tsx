import * as React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

import Layout from '../components/Layout'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { CenteredSpinner, SkeletonCard, SkeletonRow } from '@/components/loading/AppLoadingStates'
import ProjectDocumentCard from '@/components/project/ProjectDocumentCard'
import ProjectDocumentSheet from '@/components/project/ProjectDocumentSheet'
import { feedback } from '@/lib/feedback'
import { applyParentInvoiceFilter } from '@/domain/invoice/isParentInvoiceFilter'
import { getClientMismatchMessage, isClientMismatch } from '@/domain/projects'
import { supabase } from '../supabase'

// Subcomponents
import ProjectDetailHeader from '@/components/project/detail/ProjectDetailHeader'
import ProjectDetailStats from '@/components/project/detail/ProjectDetailStats'
import ProjectOperatingStream from '@/components/project/detail/ProjectOperatingStream'
import ProjectDocumentGroups from '@/components/project/detail/ProjectDocumentGroups'
import ProjectActionRail from '@/components/project/detail/ProjectActionRail'
import ProjectLinkDialog from '@/components/project/detail/ProjectLinkDialog'

import {
  formatCurrency,
  formatDate,
  DOC_TYPE,
  cardClassName,
  inputClassName,
  PROJECT_STATUS_CONFIG,
  DOC_TYPE_LABELS,
} from '@/domain/projectDetailUtils'

interface Project {
  id: string
  name: string
  status: string
  project_value: number | null
  po_number: string | null
  start_date: string | null
  notes: string | null
  location: string | null
  project_code: string | null
  client_id: string | null
  client_name: string | null
  [key: string]: any
}

interface Financials {
  total_invoiced: number
  cash_collected: number
  wht_collected: number
  outstanding: number
  invoice_count: number
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_title: string | null
  status: string
  total: number
  issue_date: string
  document_type: string
  custom_fields: any
  invoiceFinancials: {
    balance_due: number
    computed_status: string
    cash_received: number
  } | null
}

interface CSR {
  id: string
  csr_number: string
  title: string | null
  status: string
  created_at: string
}

interface Quotation {
  id: string
  quotation_number: string
  status: string
  total: number
  issue_date: string
}

interface Waybill {
  id: string
  waybill_number: string
  status: string
  date: string | null
  created_at: string
  type: string | null
}

interface ProjectDoc {
  id: string
  name: string
  url: string
  created_at: string
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [financials, setFinancials] = useState<Financials | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [csrs, setCsrs] = useState<CSR[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [waybills, setWaybills] = useState<Waybill[]>([])
  const [projectDocs, setProjectDocs] = useState<ProjectDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [showLink, setShowLink] = useState(false)
  const [showProjectDocumentSheet, setShowProjectDocumentSheet] = useState(false)
  const [projectDocumentToDelete, setProjectDocumentToDelete] = useState<string | null>(null)
  const [linkDocId, setLinkDocId] = useState('')
  const [linkType, setLinkType] = useState<'invoice' | 'csr' | 'quotation' | 'waybill'>('invoice')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [confirmingReassign, setConfirmingReassign] = useState(false)
  const [pendingReassignData, setPendingReassignData] = useState<any>(null)

  const [editForm, setEditForm] = useState<any>({})
  const [actionsOpen, setActionsOpen] = useState(false)

  useEffect(() => {
    if (id) {
      fetchAll()
    }
  }, [id])

  const fetchAll = async () => {
    setLoading(true)

    try {
      const [projectRes, invoiceRes, csrRes, quotationRes, waybillRes, financialsRes, projectDocsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        applyParentInvoiceFilter(supabase
          .from('invoices')
          .select('id, invoice_number, invoice_title, status, total, issue_date, document_type, custom_fields')
          .eq('project_id', id)
          .is('archived_at', null))
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

      let invoiceFinancialsById: Record<string, any> = {}
      if (invoiceIds.length > 0) {
        const { data: invoiceFinancialsRows } = await supabase
          .from('invoice_financials_v')
          .select('id, balance_due, computed_status, cash_received')
          .in('id', invoiceIds)

        invoiceFinancialsById = (invoiceFinancialsRows || []).reduce((acc: Record<string, any>, row) => {
          acc[row.id] = row
          return acc
        }, {})
      }

      const enrichedInvoices: Invoice[] = invoiceRows.map((invoice) => ({
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
    } catch (err) {
      console.error('[ProjectDetail] fetchAll error:', err)
      feedback.error('Failed to load project', {
        description: 'Please refresh and try again.',
      })
    } finally {
      setLoading(false)
    }
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
      feedback.error('Save failed', { description: error.message })
      return
    }

    // Audit Trail
    try {
      const { recordProjectUpdated, recordProjectNoteAdded, recordAuditLog, PROJECT_TRACKED_FIELDS } = await import('@/lib/audit')
      const { data: updatedProject } = await supabase.from('projects').select('*').eq('id', id).single()
      
      await recordProjectUpdated(id!)
      
      // If notes changed, record that specifically too
      if (editForm.notes.trim() !== (project?.notes || '')) {
        await recordProjectNoteAdded(id!, editForm.notes.trim())
      }
      
      await recordAuditLog({
        entityType: 'project',
        recordId: id!,
        entityLabel: updatedProject?.name || project?.name || null,
        action: 'UPDATE',
        oldData: project,
        newData: updatedProject,
        trackedFields: PROJECT_TRACKED_FIELDS,
      })
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
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
    const linkConfig: Record<string, { table: string; numberField: string }> = {
      invoice: { table: 'invoices', numberField: 'invoice_number' },
      csr: { table: 'csrs', numberField: 'csr_number' },
      quotation: { table: 'quotations', numberField: 'quotation_number' },
      waybill: { table: 'waybills', numberField: 'waybill_number' },
    }
    const selectedConfig = linkConfig[linkType]
    const { data, error } = (await supabase
      .from(selectedConfig.table)
      .select(`id, ${selectedConfig.numberField}, client_id, client_name, project_id` as any)
      .ilike(selectedConfig.numberField, val)
      .maybeSingle()) as any

    if (error) {
      setLinking(false)
      setLinkError(error.message)
      return
    }

    if (!data) {
      setLinking(false)
      setLinkError(
        `No ${linkType} found with that document number. Check the number and try again.`,
      )
      return
    }

    if (data.project_id && String(data.project_id) !== String(id)) {
      setLinking(false)
      setPendingReassignData(data)
      setConfirmingReassign(true)
      return
    }

    await executeLink(data)
  }


  const executeLink = async (dataToLink?: any) => {
    setConfirmingReassign(false)
    setLinking(true)
    const linkConfig: Record<string, { table: string; numberField: string }> = {
      invoice: { table: 'invoices', numberField: 'invoice_number' },
      csr: { table: 'csrs', numberField: 'csr_number' },
      quotation: { table: 'quotations', numberField: 'quotation_number' },
      waybill: { table: 'waybills', numberField: 'waybill_number' },
    }
    const selectedConfig = linkConfig[linkType]

    const data = dataToLink || pendingReassignData
    const auditEntityType = linkType === 'invoice' || linkType === 'quotation' ? linkType : null

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

    const auditBeforeLink = auditEntityType
      ? await supabase.from(selectedConfig.table).select('*').eq('id', data.id).single()
      : { data: null }

    const { error: updateError } = await supabase
      .from(selectedConfig.table)
      .update({ project_id: id })
      .eq('id', data.id)

    setLinking(false)
    if (updateError) {
      setLinkError(updateError.message)
      return
    }

    // Audit Trail
    try {
      const { recordProjectLinkedActivity, recordAuditLog, INVOICE_TRACKED_FIELDS, QUOTATION_TRACKED_FIELDS } = await import('@/lib/audit')
      if (auditEntityType) {
        await recordProjectLinkedActivity(id!, auditEntityType as any, data.id, data[selectedConfig.numberField] || null)
      }
      
      // Update audit log for the linked document
      const { data: updatedDoc } = await supabase.from(selectedConfig.table).select('*').eq('id', data.id).single()
      const fields = selectedConfig.table === 'invoices' ? INVOICE_TRACKED_FIELDS : selectedConfig.table === 'quotations' ? QUOTATION_TRACKED_FIELDS : []
      if (fields.length > 0) {
        await recordAuditLog({
          entityType: auditEntityType as any,
          recordId: data.id,
          entityLabel: updatedDoc?.[selectedConfig.numberField] || data[selectedConfig.numberField] || null,
          action: 'LINK',
          oldData: auditBeforeLink.data,
          newData: updatedDoc,
          trackedFields: fields,
        })
      }
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }

    const docLabel = (DOC_TYPE_LABELS as any)[linkType] || linkType
    setLinkDocId('')
    setShowLink(false)
    feedback.success(`${docLabel} linked`, {
      description: `${linkDocId.trim() || docLabel} has been linked to this project.`,
    })
    fetchAll()
  }

  const handleDeleteProjectDocument = async (docId: string) => {
    const { error } = await supabase.from('project_documents').delete().eq('id', docId)
    if (error) {
      feedback.error('Delete failed', { description: error.message })
      return
    }

    setProjectDocumentToDelete(null)
    feedback.success('File removed', {
      description: 'The external file has been removed from this project.',
    })
    fetchAll()
  }

  const timeline: any[] = [
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
  ].sort((a, b) => new Date(b._date).getTime() - new Date(a._date).getTime())

  if (loading) {
    return (
      <Layout title="Project">
        <div className="space-y-3 px-4 py-4">
          <SkeletonCard className="h-[120px]" />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <CenteredSpinner />
        </div>
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

  const projectState = {
    projectId: id,
    projectCode: project.project_code,
    projectName: project.name,
    clientId: project.client_id,
    clientName: project.client_name,
  }

  const quickActions = [
    {
      label: 'Create Invoice',
      path: '/invoices/new',
      className: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
      state: projectState,
      icon: (DOC_TYPE as any).invoice.icon,
    },
    {
      label: 'Create Quotation',
      path: '/quotations/new',
      className: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
      state: projectState,
      icon: (DOC_TYPE as any).quotation.icon,
    },
    {
      label: 'Create CSR',
      path: '/csr/new',
      className: 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      state: projectState,
      icon: (DOC_TYPE as any).csr.icon,
    },
    {
      label: 'Create Waybill',
      path: '/waybills/new',
      className: 'border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
      state: projectState,
      icon: (DOC_TYPE as any).waybill.icon,
    },
  ]

  return (
    <Layout title={project.name}>
      <div className="mx-auto max-w-6xl space-y-6 pb-24 sm:pb-12">
        <ProjectDetailHeader
          project={project}
          editing={editing}
          setEditing={setEditing}
          editForm={editForm}
          setEditForm={setEditForm}
          saving={saving}
          onSave={handleSaveEdit}
        />

        <ProjectDetailStats
          summaryCards={[
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
          ]}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_300px] md:items-start">
          <div className="space-y-6">
            <ProjectOperatingStream timeline={timeline} navigate={navigate} />

            <ProjectDocumentGroups
              invoices={invoices}
              quotations={quotations}
              csrs={csrs}
              waybills={waybills}
              navigate={navigate}
            />

            {/* ── External documents ───────────────────────────────────── */}
            <div className={`mt-5 ${cardClassName} border-l-4 border-l-amber-500 p-4 shadow-sm ring-1 ring-amber-50`}>
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    External Documents
                    {projectDocs.length > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                        {projectDocs.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    POs, receipts, and other third-party project files.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProjectDocumentSheet(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  + Add File
                </button>
              </div>

              {projectDocs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-center">
                  <div className="text-sm font-semibold text-slate-700">No external files yet</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Add purchase orders, receipts, or other project records using the button above.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {projectDocs.map((document) => (
                    <ProjectDocumentCard key={document.id} document={document} onDelete={(id) => setProjectDocumentToDelete(id)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <ProjectActionRail
            project={project}
            financials={financials}
            quickActions={quickActions}
            actionsOpen={actionsOpen}
            setActionsOpen={setActionsOpen}
            setShowLink={setShowLink}
            navigate={navigate}
          />
        </div>

        <ProjectDocumentSheet
          open={showProjectDocumentSheet}
          onOpenChange={setShowProjectDocumentSheet}
          projectId={id!}
          onSuccess={fetchAll}
        />

        <ProjectLinkDialog
          showLink={showLink}
          setShowLink={setShowLink}
          linkType={linkType}
          setLinkType={setLinkType as any}
          linkDocId={linkDocId}
          setLinkDocId={setLinkDocId}
          linkError={linkError}
          setLinkError={setLinkError}
          linking={linking}
          handleLink={handleLink}
        />

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

        <ConfirmActionDialog
          open={confirmingReassign}
          onOpenChange={setConfirmingReassign}
          title={`Reassign ${(DOC_TYPE_LABELS as any)[linkType] || linkType}?`}
          description={
            linkType === 'invoice' || linkType === 'quotation'
              ? `This ${(DOC_TYPE_LABELS as any)[linkType] || linkType} is already linked to another project. Reassigning will move it to this project and break the existing project connection. Make sure this is correct.`
              : `This ${(DOC_TYPE_LABELS as any)[linkType] || linkType} is already linked to another project. Are you sure you want to reassign it?`
          }
          confirmLabel="Reassign"
          onConfirm={() => void executeLink()}
        />
      </div>
    </Layout>
  )
}
