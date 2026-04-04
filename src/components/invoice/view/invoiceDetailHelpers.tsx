import type { ReactNode } from 'react'

import DOMPurify from 'dompurify'

import {
  createLinkedDocumentItem,
  createLinkedDocumentsSection,
  createLinkedProjectSection,
} from '@/components/document/linkedDocumentSections'

interface RelatedCsr {
  id: string
  csr_number?: string | null
}

interface RelatedWaybill {
  id: string
  waybill_number?: string | null
}

interface RelatedDocs {
  csrs?: RelatedCsr[]
  waybills?: RelatedWaybill[]
}

interface SourceDocument {
  id?: string | null
  number?: string | null
  po_number?: string | null
  type?: 'quotation' | 'invoice' | string | null
}

interface LinkedProject {
  id: string
  name?: string | null
}

interface LinkedDocumentItem {
  key: string
  label: string
  subtitle?: string
  onClick?: () => void
  disabled?: boolean
}

interface LinkedDocumentsSection {
  key: string
  title: string
  description: string
  items: LinkedDocumentItem[]
}

interface BuildInvoiceLinkedDocumentSectionsArgs {
  sourceDocument: SourceDocument | null
  relatedDocs: RelatedDocs
  navigate: (href: string) => void
  linkedProject: LinkedProject | null
  onAttachCsr: () => void
  onAttachWaybill: () => void
}

export function buildInvoiceLinkedDocumentSections({
  sourceDocument,
  relatedDocs,
  linkedProject,
  navigate,
  onAttachCsr,
  onAttachWaybill,
}: BuildInvoiceLinkedDocumentSectionsArgs): LinkedDocumentsSection[] {
  return [
    createLinkedDocumentsSection({
      key: 'source',
      title: 'Source',
      description: 'Documents this invoice came from.',
      items: sourceDocument
        ? [
            createLinkedDocumentItem({
              key: `source-${sourceDocument.id || sourceDocument.number || 'invoice-source'}`,
              label: `${sourceDocument.type === 'quotation' ? 'Quotation' : 'Document'} ${
                sourceDocument.number || sourceDocument.id || 'Linked source'
              }`,
              subtitle: sourceDocument.po_number
                ? `PO ${sourceDocument.po_number}`
                : 'Open the source document',
              onClick: () => {
                if (sourceDocument.id) {
                  navigate(`/${sourceDocument.type === 'quotation' ? 'quotations' : 'invoices'}/${sourceDocument.id}`)
                }
              },
              disabled: !sourceDocument.id,
            }),
          ]
        : [],
    }) as LinkedDocumentsSection,
    createLinkedDocumentsSection({
      key: 'generated',
      title: 'Generated / Child Documents',
      description: 'Documents created from this invoice.',
      items: [
        createLinkedDocumentItem({
          key: 'attach-csr',
          label: 'Attach Existing CSR',
          subtitle: 'Search and link a CSR to this invoice',
          onClick: onAttachCsr,
        }),
        createLinkedDocumentItem({
          key: 'attach-waybill',
          label: 'Attach Existing Waybill',
          subtitle: 'Search and link a waybill to this invoice',
          onClick: onAttachWaybill,
        }),
        ...(relatedDocs.csrs || []).map((csr) => createLinkedDocumentItem({
          key: `csr-${csr.id}`,
          label: `CSR ${csr.csr_number || csr.id}`,
          subtitle: 'Open linked CSR',
          onClick: () => navigate(`/csr/${csr.id}`),
        })),
        ...(relatedDocs.waybills || []).map((waybill) => createLinkedDocumentItem({
          key: `waybill-${waybill.id}`,
          label: `Waybill ${waybill.waybill_number || waybill.id}`,
          subtitle: 'Open linked waybill',
          onClick: () => navigate(`/waybills/${waybill.id}`),
        })),
      ],
    }) as LinkedDocumentsSection,
    createLinkedProjectSection({
      project: linkedProject,
      description: 'Project connected to this invoice.',
      onOpenProject: () => {
        if (linkedProject?.id) navigate(`/projects/${linkedProject.id}`)
      },
    }) as LinkedDocumentsSection,
  ]
}

interface ShellStatusItem {
  label: string
  active: boolean
  onClick: () => void
  disabled: boolean
}

interface BuildInvoiceShellStatusItemsArgs {
  computedStatus: string
  onStatusChange: (status: string) => void | Promise<void>
}

export function buildInvoiceShellStatusItems({
  computedStatus,
  onStatusChange,
}: BuildInvoiceShellStatusItemsArgs): ShellStatusItem[] {
  return ['draft', 'sent', 'partial', 'paid', 'overdue'].map((status) => ({
    label: String(status)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    active: computedStatus === status,
    onClick: () => {
      if (status === 'partial' || status === 'paid' || status === 'overdue') return
      void onStatusChange(status)
    },
    disabled: status === 'partial' || status === 'paid' || status === 'overdue',
  }))
}

interface PreviewHtmlSection {
  kind: 'html'
  title: string
  html: string
}

interface PreviewLinksSection {
  kind: 'links'
  title: string
  links: Array<{ label: string; url: string }>
}

interface PreviewTextSection {
  kind: 'text'
  title: string
  text: string
}

type PreviewNotesSection = PreviewHtmlSection | PreviewLinksSection | PreviewTextSection

interface PreviewNotesContent {
  title: string
  content: ReactNode
}

export function mapInvoicePreviewNotesContent(previewNotesSections: PreviewNotesSection[]): PreviewNotesContent[] {
  return previewNotesSections.map((section) => {
    if (section.kind === 'html') {
      return {
        title: section.title,
        content: (
          <div
            className="prose prose-sm max-w-none break-words text-foreground"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.html) }}
          />
        ),
      }
    }

    if (section.kind === 'links') {
      return {
        title: section.title,
        content: (
          <div className="space-y-2">
            {section.links.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-sm font-medium text-blue-700 underline decoration-blue-300 underline-offset-4"
              >
                {link.label}
              </a>
            ))}
          </div>
        ),
      }
    }

    return {
      title: section.title,
      content: <div className="whitespace-pre-wrap break-words">{section.text}</div>,
    }
  })
}
