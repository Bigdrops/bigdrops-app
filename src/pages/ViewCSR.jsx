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
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { getDocumentActionState, getProjectActionState } from '@/domain/document/documentActionState'
import { fetchInvoiceSummary, fetchProjectSummary } from '@/domain/documentRelationships'
import { getPdfDesignPreset, setPdfDesignPreset } from '@/lib/pdfDesignPreset'
import { isDocumentFillableEnabled } from '@/lib/documentFillableSettings'

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

  if (loading) return <Layout title="CSR"><p style={{ padding: 30 }}>Loading...</p></Layout>
  if (!csr) return <Layout title="CSR"><p style={{ padding: 30 }}>CSR not found.</p></Layout>

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
    {
      key: 'source',
      title: 'Source',
      description: 'Documents this CSR is linked to.',
      items: [
        {
          key: 'attach-invoice',
          label: 'Attach to Invoice',
          subtitle: 'Search and link an invoice',
          onClick: () => {
            setShowLinkedDocuments(false)
            setShowAttachInvoice(true)
          },
        },
        ...(linkedInvoice
          ? [{
              key: `invoice-${linkedInvoice.id}`,
              label: `Invoice ${linkedInvoice.invoice_number || linkedInvoice.id}`,
              subtitle: 'Open linked invoice',
              onClick: () => navigate(`/invoices/${linkedInvoice.id}`),
            }]
          : []),
      ],
    },
    {
      key: 'project',
      title: 'Project',
      description: 'Project connected to this CSR.',
      items: linkedProject
        ? [{
            key: `project-${linkedProject.id}`,
            label: linkedProject.name || linkedProject.id,
            subtitle: 'Open linked project',
            onClick: () => navigate(`/projects/${linkedProject.id}`),
          }]
        : [],
    },
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
      <div style={{ maxWidth: '900px', width: '100%' }}>
        <div
          style={{
            background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF4FF 100%)',
            border: '1px solid #DBE5F3',
            borderRadius: '16px',
            padding: '18px',
            marginBottom: '18px',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '999px', backgroundColor: '#ffffff', border: '1px solid #D6E0EF', fontSize: '12px', fontWeight: '700', color: '#0F172A', marginBottom: '10px' }}>
                Customer Service Report
              </div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>{previewData.csr_number}</div>
              <div style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                {previewData.client_name || 'Unassigned client'}{previewData.date ? ` • ${previewData.date}` : ''}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => navigate('/csr')} style={{ padding: '9px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600', color: '#0F172A' }}>Back</button>
              <button type="button" onClick={handleDownload} style={{ padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', backgroundColor: '#0056B3', color: 'white', fontWeight: '700', border: 'none', boxShadow: '0 10px 24px rgba(0, 86, 179, 0.18)' }}>Download PDF</button>
              <button type="button" onClick={() => navigate('/csr/edit/' + id)} style={{ display: 'none' }}>Edit CSR</button>
              <div>
                <button type="button" onClick={() => setShowMore(true)} style={{ padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', border: '1px solid #CBD5E1', backgroundColor: 'white', fontWeight: '700', color: '#0F172A' }}>
                  More actions
                </button>
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
