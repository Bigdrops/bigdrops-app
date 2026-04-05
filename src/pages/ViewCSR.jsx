import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  buildCsrPreviewData,
  getCsrBranding,
} from '../components/csr/csrUtils'
import CSRPreviewPanel from '../components/csr/CSRPreviewPanel'
import { toast } from '@/hooks/use-toast'
import {
  DocumentActionSheet,
  DocumentDesignPanel,
  DocumentFillableWritingEditor,
  DocumentSection,
} from '@/components/document/DocumentViewShell'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import AttachExistingDocumentSheet from '@/components/document/AttachExistingDocumentSheet'
import ProjectLinkDialog from '@/components/document/ProjectLinkDialog'
import {
  createLinkedDocumentItem,
  createLinkedDocumentsSection,
  createLinkedProjectSection,
} from '@/components/document/linkedDocumentSections'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { Button } from '@/components/ui/button'
import {
  documentDetailHeaderCardClassName,
  documentDetailStatusBadgeClassName,
} from '@/components/ui/document-detail-styles'
import { operationalEmptyStateClassName } from '@/components/ui/operational-card-styles'
import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'
import { fetchInvoiceSummary, fetchProjectSummary } from '@/domain/documentRelationships'
import { getPdfDesignPreset, setPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { isDocumentFillableEnabled } from '@/lib/documentFillableSettings'
import { ensureFillableWebFontsLoaded } from '@/lib/pdfFillableFonts'

export default function ViewCSR() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [csr, setCsr] = useState(null)
  const [settings, setSettings] = useState({})
  const [signatories, setSignatories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMore, setShowMore] = useState(false)
  const [linkedInvoice, setLinkedInvoice] = useState(null)
  const [linkedProject, setLinkedProject] = useState(null)
  const [showLinkedDocuments, setShowLinkedDocuments] = useState(false)
  const [showProjectLinkDialog, setShowProjectLinkDialog] = useState(false)
  const [showAttachInvoice, setShowAttachInvoice] = useState(false)
  const [pendingAttachInvoice, setPendingAttachInvoice] = useState(null)
  const [template, setTemplate] = useState(() => {
    try {
      return localStorage.getItem('csr_pdf_template') || '4'
    } catch {
      return '4'
    }
  })
  const [pdfDesignPreset, setPdfDesignPresetState] = useState(() => getPdfDesignPreset('csr'))

  useEffect(() => {
    void ensureFillableWebFontsLoaded()
  }, [])

  useEffect(() => {
    supabase.from('csrs').select('*').eq('id', id).single().then(({ data }) => {
      setCsr(data)
      setLoading(false)
      if (data?.linked_invoice_id) {
        fetchInvoiceSummary(data.linked_invoice_id).then((invoice) => setLinkedInvoice(invoice))
      } else {
        setLinkedInvoice(null)
      }
      if (data?.project_id) {
        fetchProjectSummary(data.project_id).then((project) => setLinkedProject(project))
      } else {
        setLinkedProject(null)
      }
    })
    supabase.from('settings').select('*').eq('id', 1).single().then(({ data }) => {
      if (data) setSettings(data)
    })
    supabase.from('signatories').select('id, name, role, signature_url').order('name').then(({ data }) => {
      setSignatories(data || [])
    })
  }, [id])

  useEffect(() => {
    try {
      localStorage.setItem('csr_pdf_template', template)
    } catch {
      // Ignore storage write failures and keep the in-memory selection.
    }
  }, [template])

  if (loading) {
    return (
      <Layout title="CSR">
        <div className={operationalEmptyStateClassName}>Loading CSR...</div>
      </Layout>
    )
  }
  if (!csr) {
    return (
      <Layout title="CSR">
        <div className={operationalEmptyStateClassName}>CSR not found.</div>
      </Layout>
    )
  }

  const previewData = buildCsrPreviewData(csr, { signatories })
  const branding = getCsrBranding(settings)
  const showCsrFillableControls = isDocumentFillableEnabled(settings?.document_fillable_settings, 'csr')
  const projectActionState = getProjectActionState({ projectId: csr?.project_id, project: linkedProject })
  const documentActionState = getDocumentActionState({
    sourceDocument: linkedInvoice,
    relatedDocuments: [],
  })
  const hasLinkedDocuments = documentActionState.hasLinkedDocuments
  const linkedDocumentsSections = [
    createLinkedDocumentsSection({
      key: 'source',
      title: 'Source',
      description: 'Documents this CSR is linked to.',
      items: [
        createLinkedDocumentItem({
          key: 'attach-invoice',
          label: 'Attach to Invoice',
          subtitle: 'Search and link an invoice',
          onClick: () => {
            setShowLinkedDocuments(false)
            setShowAttachInvoice(true)
          },
        }),
        linkedInvoice
          ? createLinkedDocumentItem({
              key: `invoice-${linkedInvoice.id}`,
              label: `Invoice ${linkedInvoice.invoice_number || linkedInvoice.id}`,
              subtitle: 'Open linked invoice',
              onClick: () => navigate(`/invoices/${linkedInvoice.id}`),
            })
          : null,
      ],
    }),
    createLinkedProjectSection({
      project: linkedProject,
      description: 'Project connected to this CSR.',
      onOpenProject: () => navigate(`/projects/${linkedProject.id}`),
    }),
  ]

  const attachInvoice = async (invoice) => {
    if (!csr?.id || !invoice?.id) return
    await supabase.from('csrs').update({ linked_invoice_id: invoice.id }).eq('id', csr.id)
    const { data } = await supabase.from('csrs').select('*').eq('id', csr.id).single()
    if (data) {
      setCsr(data)
      setLinkedInvoice(data.linked_invoice_id ? await fetchInvoiceSummary(data.linked_invoice_id) : null)
    }
    setShowAttachInvoice(false)
  }

  const handleAttachInvoice = (invoice) => {
    if (!csr?.id || !invoice?.id) return
    if (csr.linked_invoice_id && csr.linked_invoice_id !== invoice.id) {
      setPendingAttachInvoice(invoice)
      return
    }
    void attachInvoice(invoice)
  }

  const handleDownload = async () => {
    const [{ pdf }, { getCsrPdfDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../components/csr/CSRPreviewTemplates'),
    ])
    const blob = await pdf(
      getCsrPdfDocument({ csr: previewData, branding, template, designPreset: pdfDesignPreset })
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = previewData.csr_number + '.pdf'
    a.click()
  }

  const handleCopy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value)
      setShowMore(false)
      toast({ title: 'Copied', description: `${label} copied` })
    } catch {
      toast({ title: 'Copy failed', description: `Could not copy ${label.toLowerCase()}`, variant: 'destructive' })
    }
  }

  const moreActions = [
    {
      label: projectActionState.label,
      subtitle: projectActionState.hasProject ? (linkedProject?.name || 'Open the linked project workspace') : 'Attach this CSR to a project',
      action: () => {
        if (csr.project_id) {
          navigate(`/projects/${csr.project_id}`)
          return
        }
        setShowProjectLinkDialog(true)
      },
      iconKey: projectActionState.hasProject ? 'projectView' : 'projectLink',
    },
    {
      label: documentActionState.label,
      subtitle: hasLinkedDocuments ? 'View source and related records' : 'Connect this CSR to related records',
      action: () => setShowLinkedDocuments(true),
      iconKey: hasLinkedDocuments ? 'documentsView' : 'documentsLink',
    },
    {
      label: 'Copy CSR Number',
      subtitle: previewData.csr_number || 'Copy the current CSR number',
      action: () => handleCopy(previewData.csr_number || '', 'CSR number'),
      iconKey: 'copy',
    },
    {
      label: 'Copy Client Name',
      subtitle: previewData.client_name || 'Copy the linked client name',
      action: () => handleCopy(previewData.client_name || '', 'Client name'),
      iconKey: 'copy',
    },
    {
      label: 'Open Edit Screen',
      subtitle: 'Continue editing this CSR',
      action: () => navigate('/csr/edit/' + id),
      iconKey: 'open',
    },
  ]

  const handlePdfDesignPresetChange = (nextPreset) => {
    const resolvedPreset = {
      ...nextPreset,
      fillableFontMode: 'custom',
    }
    setPdfDesignPresetState(resolvedPreset)
    setPdfDesignPreset('csr', resolvedPreset)
  }

  return (
    <Layout title={previewData.csr_number}>
      <div className="w-full max-w-[900px]">
        <div className={`${documentDetailHeaderCardClassName} bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF4FF_100%)]`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className={`mb-2.5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-900 ${documentDetailStatusBadgeClassName}`}>
                Customer Service Report
              </div>
              <div className="mb-1 text-[26px] font-bold text-slate-900">{previewData.csr_number}</div>
              <div className="text-sm leading-[1.6] text-slate-600">
                {previewData.client_name || 'Unassigned client'}{previewData.date ? ` • ${previewData.date}` : ''}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button type="button" variant="outline" className="h-10 rounded-[10px] px-4 text-[13px] font-semibold" onClick={() => navigate('/csr')}>
                Back
              </Button>
              <Button type="button" className="h-10 rounded-[10px] bg-blue-700 px-[18px] text-[13px] font-bold shadow-[0_10px_24px_rgba(0,86,179,0.18)] hover:bg-blue-800" onClick={handleDownload}>
                Download PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[10px] px-4 text-[13px] font-bold"
                onClick={() => navigate('/csr/edit/' + id)}
              >
                Edit CSR
              </Button>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-[10px] px-4 text-[13px] font-bold"
                  onClick={() => setShowMore(true)}
                >
                  More actions
                </Button>
              </div>
            </div>
          </div>
        </div>

        <CSRPreviewPanel
          csr={previewData}
          template={template}
          onTemplateChange={setTemplate}
          branding={branding}
          designPreset={pdfDesignPreset}
        />

        {showCsrFillableControls ? (
          <DocumentSection title="Customize" defaultOpen>
            <DocumentDesignPanel
              title="Customize"
              subtitle="Fillable-writing controls for CSR preview and PDF export."
              badge="CSR"
              sections={[
                {
                  key: 'fillable-writing',
                  title: 'Fillable Writing',
                  content: (
                    <DocumentFillableWritingEditor
                      value={pdfDesignPreset}
                      onChange={handlePdfDesignPresetChange}
                    />
                  ),
                },
              ]}
            />
          </DocumentSection>
        ) : null}

        <DocumentActionSheet
          open={showMore}
          onOpenChange={setShowMore}
          title="CSR Actions"
          subtitle={previewData.csr_number}
          actions={moreActions.map((item) => ({
            label: item.label,
            subtitle: item.subtitle,
            onClick: item.action,
            iconKey: item.iconKey,
          }))}
        />
        <LinkedDocumentsSheet
          open={showLinkedDocuments}
          onOpenChange={setShowLinkedDocuments}
          title="Linked Documents"
          subtitle={previewData.csr_number}
          sections={linkedDocumentsSections}
        />
        <AttachExistingDocumentSheet
          open={showAttachInvoice}
          onOpenChange={setShowAttachInvoice}
          title="Attach to Invoice"
          description={previewData.csr_number}
          table="invoices"
          numberField="invoice_number"
          clientField="client_name"
          poField="po_number"
          currentClientName={previewData.client_name}
          searchPlaceholder="Search invoice number, client, or PO"
          onAttach={handleAttachInvoice}
        />
        <ConfirmActionDialog
          open={Boolean(pendingAttachInvoice)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setPendingAttachInvoice(null)
          }}
          title="Reassign linked CSR?"
          description="This CSR is already linked to a different invoice. Reassigning will detach it from the previous invoice."
          confirmLabel="Reassign"
          onConfirm={() => {
            const invoice = pendingAttachInvoice
            setPendingAttachInvoice(null)
            void attachInvoice(invoice)
          }}
        />
        <ProjectLinkDialog
          open={showProjectLinkDialog}
          onOpenChange={setShowProjectLinkDialog}
          tableName="csrs"
          recordId={id}
          documentLabel="CSR"
          onLinked={async () => {
            const { data } = await supabase.from('csrs').select('*').eq('id', id).single()
            if (!data) return
            setCsr(data)
            setLinkedProject(data.project_id ? await fetchProjectSummary(data.project_id) : null)
          }}
        />
      </div>
    </Layout>
  )
}
