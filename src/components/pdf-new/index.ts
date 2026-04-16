import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { registerPdfFonts } from '@/lib/pdfFontRegistry'
import { PdfRenderer } from './renderers/PdfRenderer'
import { buildPdfRowCells, buildPdfTableColumns, interpretPdfTableSettings } from './table'
import Industry from './templates/Industry'
import type { InvoicePdfModel, PdfDocumentModel, QuotationPdfModel } from './types'

export type PdfGenerationResult = {
  status: 'generated'
  filename: string
}

type PdfGenerationRequest<TModel extends PdfDocumentModel> = {
  model: TModel
  documentNumber?: string | null
}

function downloadBlob(blob: Blob, filename: string) {
  const anchor = document.createElement('a')
  const url = URL.createObjectURL(blob)
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function resolveFilename(model: PdfDocumentModel, fallbackNumber?: string | null) {
  const number = String(model.identity.number || fallbackNumber || model.identity.kind).trim() || model.identity.kind
  return `${sanitizeFilename(number)}.pdf`
}

function getDocumentNumberLabel(kind: PdfDocumentModel['identity']['kind']) {
  return kind === 'invoice' ? 'Invoice Number' : 'Quotation Number'
}

function getDateLabel(kind: PdfDocumentModel['identity']['kind']) {
  return kind === 'invoice' ? 'Due Date' : 'Valid Until'
}

function splitAddressLines(lines: string[] = []) {
  const filtered = lines.filter(Boolean)
  return {
    address: filtered[0] || '',
    cityState: filtered.slice(1).join(', '),
  }
}

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function adaptIndustryData(model: PdfDocumentModel) {
  const issuerAddress = splitAddressLines(model.issuer?.addressLines || [])
  const recipientAddress = splitAddressLines(model.recipient?.addressLines || [])
  const mainLine = model.totals.rows.find((line) => line.emphasis)
  const totalLines = model.totals.rows
    .filter((line) => !line.emphasis)
    .map((line) => ({
      label: line.label,
      value: stringifyValue(line.amount),
    }))

  return {
    title: model.identity.title || (model.identity.kind === 'invoice' ? 'Invoice' : 'Quotation'),
    documentNumber: model.identity.number,
    documentNumberLabel: getDocumentNumberLabel(model.identity.kind),
    issueDate: model.identity.issueDate,
    issueDateLabel: 'Issue Date',
    dueDateOrValidityDate: model.identity.kind === 'invoice' ? model.identity.dueDate : model.identity.validUntil,
    dueDateOrValidityDateLabel: getDateLabel(model.identity.kind),
    poNumber: model.identity.poNumber,
    poNumberLabel: 'PO Number',
    customHeaderFields: model.headerFields || [],
    showTagline: Boolean(model.tagline),
    showBankDetails: Boolean(model.bankDetails),
    company: model.issuer
      ? {
          logoUrl: model.logo?.imageUrl || '',
          name: model.issuer.name || '',
          tagline: model.tagline || '',
          address: issuerAddress.address,
          cityState: issuerAddress.cityState,
          phone: model.issuer.phone || '',
          email: model.issuer.email || '',
          customInfo: model.issuer.taxId ? [{ label: 'Tax ID', value: model.issuer.taxId }] : [],
        }
      : null,
    client: model.recipient
      ? {
          name: model.recipient.name || '',
          address: recipientAddress.address,
          cityState: recipientAddress.cityState,
          phone: model.recipient.phone || '',
          email: model.recipient.email || '',
        }
      : null,
    table: {
      columns: (model.columns || []).map((column) => ({
        key: column.key,
        label: column.label,
        align: column.align,
        width: column.pdfWidth || undefined,
      })),
      rows: model.items.map((item) => ({
        type: item.rowType,
        rowType: item.rowType,
        isGroupHeader: item.rowType === 'group_header',
        groupName: item.groupLabel,
        groupLabel: item.groupLabel,
        imageUrl: item.imageUrl,
        cells: {
          ...(item.cells || {}),
          description: {
            main: item.cells?.description ?? item.description ?? '',
            sub: item.subDescription ?? '',
          },
        },
      })),
    },
    paymentDetails: model.bankDetails
      ? {
          bankName: model.bankDetails.bankName || '',
          accountName: model.bankDetails.accountName || '',
          accountNumber: model.bankDetails.accountNumber || '',
          sortCode: model.bankDetails.sortCode || '',
        }
      : null,
    totals: {
      lines: totalLines,
      mainLine: mainLine
        ? {
            label: mainLine.label,
            value: stringifyValue(mainLine.amount),
          }
        : null,
      amountInWords: model.totals.amountInWords || '',
      balanceDue: model.totals.balanceDue !== null && model.totals.balanceDue !== undefined
        ? {
            label: 'Balance Due',
            value: stringifyValue(model.totals.balanceDue),
          }
        : null,
    },
    advanceSummary: model.totals.advanceSummary
      ? {
          contractValueLabel: 'Contract Value',
          contractValue: stringifyValue(model.totals.advanceSummary.contractValue),
          primaryLabel: model.totals.advanceSummary.primaryLabel || '',
          advanceAmount: stringifyValue(model.totals.advanceSummary.requestedAmount),
          secondaryLabel: model.totals.advanceSummary.secondaryLabel || '',
          balanceRemaining: stringifyValue(model.totals.advanceSummary.balanceRemaining),
        }
      : null,
    notes: model.notes || null,
    terms: model.terms || null,
    attachments: [
      ...(model.referenceLinks || []).map((entry) => ({ label: entry.label, url: entry.url })),
      ...(model.attachments || []).map((entry) => ({ label: entry.label || entry.fileName || '', url: entry.url || undefined })),
    ].filter((entry) => entry.label || entry.url),
    additionalFields: (model.additionalSections || []).map((section) => ({
      label: section.title,
      value: section.content,
    })),
    signature: model.signature || null,
    footer: {
      documentNumber: model.identity.number,
      companyName: model.metaFooter?.companyName || model.issuer?.name || '',
    },
  }
}

async function generatePdf<TModel extends PdfDocumentModel>(request: PdfGenerationRequest<TModel>): Promise<PdfGenerationResult> {
  registerPdfFonts()
  const templateData = adaptIndustryData(request.model)
  const blob = await pdf(React.createElement(PdfRenderer, { data: templateData, Template: Industry }) as any).toBlob()
  const filename = resolveFilename(request.model, request.documentNumber)
  downloadBlob(blob, filename)
  return { status: 'generated', filename }
}

export async function generateInvoicePdf(request: PdfGenerationRequest<InvoicePdfModel>): Promise<PdfGenerationResult> {
  return generatePdf(request)
}

export async function generateQuotationPdf(request: PdfGenerationRequest<QuotationPdfModel>): Promise<PdfGenerationResult> {
  return generatePdf(request)
}

export {
  buildPdfRowCells,
  buildPdfTableColumns,
  interpretPdfTableSettings,
}

export type {
  PdfTemplateRenderer,
  PdfTemplateRendererProps,
} from './renderers/PdfRenderer'

export type {
  InvoicePdfModel,
  PdfAdvanceSummary,
  PdfAttachmentReference,
  PdfBankDetails,
  PdfBaseDocumentModel,
  PdfColumnDefinition,
  PdfColumnKind,
  PdfColumnDataType,
  PdfDocumentIdentity,
  PdfDocumentKind,
  PdfDocumentModel,
  PdfHeaderField,
  PdfLineItem,
  PdfLogo,
  PdfParty,
  PdfReferenceLink,
  PdfResolvedTableSettings,
  PdfSignature,
  PdfTemplateConfig,
  PdfTextSection,
  PdfTotalRow,
  PdfTotals,
  PdfTotalsMode,
  QuotationPdfModel,
} from './types'
