import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Download } from 'lucide-react'

import Layout from '@/components/Layout'
import { Button } from '@/components/ui/button'
import {
  formatProjectDocumentDate,
  getProjectDocumentFileName,
  getProjectDocumentDate,
  getProjectDocumentItemsTable,
  getProjectDocumentKeyFields,
  getProjectDocumentMainLabel,
  getProjectDocumentNotes,
  getProjectDocumentRawJson,
  getProjectDocumentTypeMeta,
  type ProjectDocumentRecord,
} from '@/domain/projectDocuments'
import { useToast } from '@/hooks/use-toast'
import { useSettings } from '@/hooks/useSettings'
import { supabase } from '@/supabase'

export default function ProjectDocumentView() {
  const { projectId, documentId } = useParams<{ projectId: string; documentId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { settings } = useSettings()
  const [projectName, setProjectName] = useState('')
  const [documentRecord, setDocumentRecord] = useState<ProjectDocumentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [projectResponse, documentResponse] = await Promise.all([
        supabase.from('projects').select('id, name').eq('id', projectId).single(),
        supabase.from('project_documents').select('*').eq('id', documentId).eq('project_id', projectId).single(),
      ])

      setProjectName(String(projectResponse.data?.name || ''))
      setDocumentRecord((documentResponse.data as ProjectDocumentRecord | null) || null)
      setLoading(false)
    }

    load()
  }, [documentId, projectId])

  const meta = useMemo(
    () => (documentRecord ? getProjectDocumentTypeMeta(documentRecord) : { label: 'Document', shortLabel: 'Document' }),
    [documentRecord],
  )
  const mainLabel = documentRecord ? getProjectDocumentMainLabel(documentRecord) : 'Document'
  const keyFields = documentRecord ? getProjectDocumentKeyFields(documentRecord) : []
  const itemsTable = documentRecord ? getProjectDocumentItemsTable(documentRecord) : null
  const notes = documentRecord ? getProjectDocumentNotes(documentRecord) : ''
  const rawJson = documentRecord ? getProjectDocumentRawJson(documentRecord) : ''
  const documentDate = documentRecord ? formatProjectDocumentDate(getProjectDocumentDate(documentRecord)) : ''

  const handleCopyJson = async () => {
    if (!documentRecord) return
    try {
      await navigator.clipboard.writeText(rawJson)
      toast({ title: 'Copied', description: 'Raw document JSON copied.' })
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy the JSON for this document.' })
    }
  }

  const handleExportPdf = async () => {
    if (!documentRecord || pdfLoading) return
    setPdfLoading(true)
    try {
      const [{ pdf }, { default: ProjectDocumentPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/project/ProjectDocumentPDF'),
      ])
      const blob = await pdf(
        <ProjectDocumentPDF document={documentRecord} projectName={projectName} settings={settings ?? {}} />,
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = getProjectDocumentFileName(documentRecord)
      window.document.body.appendChild(anchor)
      anchor.click()
      setTimeout(() => {
        window.document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
      }, 100)
      toast({ title: 'PDF ready', description: `${meta.label} exported for internal use.` })
    } catch (error) {
      console.error(error)
      toast({ title: 'Export failed', description: 'Could not generate the PDF for this document.' })
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout title="Document" session={null}>
        <div className="px-4 py-10 text-sm text-muted-foreground">Loading document...</div>
      </Layout>
    )
  }

  if (!documentRecord) {
    return (
      <Layout title="Document" session={null}>
        <div className="px-4 py-10 text-sm text-red-600">Document not found.</div>
      </Layout>
    )
  }

  return (
    <Layout title={mainLabel} session={null} hidePageHeader>
      <div className="mx-auto w-full max-w-5xl space-y-4 px-3 pb-20 pt-4 sm:px-4 sm:pt-6">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {meta.label}
                </span>
                {documentDate ? <span className="text-sm text-muted-foreground">{documentDate}</span> : null}
              </div>
              <h1 className="break-words text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{mainLabel}</h1>
              {projectName ? <p className="mt-2 text-sm text-muted-foreground">Project: {projectName}</p> : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate(`/projects/${projectId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Button>
              <Button type="button" className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={handleExportPdf} disabled={pdfLoading}>
                <Download className="mr-2 h-4 w-4" />
                {pdfLoading ? 'Generating PDF...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </div>

        {keyFields.length > 0 ? (
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-4 text-sm font-semibold text-slate-700">Key Fields</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {keyFields.map((field) => (
                <div key={`${field.label}-${field.value}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{field.label}</div>
                  <div className="mt-1 break-words text-sm font-medium text-foreground">{field.value}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {itemsTable ? (
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-4 text-sm font-semibold text-slate-700">Items</div>
            <div className="overflow-x-auto rounded-2xl border border-border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-900 text-left text-xs uppercase tracking-wide text-white">
                    {itemsTable.columns.map((column) => (
                      <th key={column} className="px-3 py-2 font-semibold">
                        {column.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itemsTable.rows.map((row, index) => (
                    <tr key={`item-row-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      {itemsTable.columns.map((column) => (
                        <td key={`${index}-${column}`} className="px-3 py-2.5 text-sm text-foreground">
                          {row[column] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {notes ? (
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="mb-3 text-sm font-semibold text-slate-700">Notes</div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-foreground">
              {notes}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">Raw JSON</div>
              <div className="mt-1 text-sm text-muted-foreground">Stored for traceability, but kept secondary to the readable view.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleCopyJson}>
                <Copy className="mr-2 h-4 w-4" />
                Copy JSON
              </Button>
              <Button type="button" variant="outline" onClick={() => setJsonOpen((current) => !current)}>
                {jsonOpen ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                {jsonOpen ? 'Hide JSON' : 'Show JSON'}
              </Button>
            </div>
          </div>

          {jsonOpen ? (
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {rawJson}
            </pre>
          ) : null}
        </section>
      </div>
    </Layout>
  )
}
