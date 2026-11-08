import React from 'react'
import type { PdfcnTemplateDefinition } from '@/domain/pdf/resolver'
import { registerPdfcnTemplate } from '@/domain/pdf/resolver'
import type { CommercialDocumentData } from '../industryAdapter'
import { adaptCommercialDocumentData } from '../industryAdapter'
import type { PdfDocumentModel } from '../types'
import { IndustryFormeDocument } from '../forme/IndustryFormeDocument'

export const industryInvoiceDefinition: PdfcnTemplateDefinition<PdfDocumentModel, CommercialDocumentData> = {
  documentType: 'invoice',
  templateId: 'industry',
  templateName: 'Industry Invoice',
  templateVersion: '1.0.0',
  defaultPageConfig: {
    orientation: 'portrait',
    size: 'A4',
  },
  prepare: (model: PdfDocumentModel) => adaptCommercialDocumentData(model),
  validate: (data: CommercialDocumentData) => ({
    valid: Boolean(data && data.documentNumber),
    errors: data?.documentNumber ? [] : ['Invoice requires documentNumber'],
  }),
  render: (envelope) => React.createElement(IndustryFormeDocument, { data: envelope.data }),
}

export const industryQuotationDefinition: PdfcnTemplateDefinition<PdfDocumentModel, CommercialDocumentData> = {
  documentType: 'quotation',
  templateId: 'industry',
  templateName: 'Industry Quotation',
  templateVersion: '1.0.0',
  defaultPageConfig: {
    orientation: 'portrait',
    size: 'A4',
  },
  prepare: (model: PdfDocumentModel) => adaptCommercialDocumentData(model),
  validate: (data: CommercialDocumentData) => ({
    valid: Boolean(data && data.documentNumber),
    errors: data?.documentNumber ? [] : ['Quotation requires documentNumber'],
  }),
  render: (envelope) => React.createElement(IndustryFormeDocument, { data: envelope.data }),
}

export const industryPurchaseOrderDefinition: PdfcnTemplateDefinition<PdfDocumentModel, CommercialDocumentData> = {
  documentType: 'purchase_order',
  templateId: 'industry',
  templateName: 'Industry Purchase Order',
  templateVersion: '1.0.0',
  defaultPageConfig: {
    orientation: 'portrait',
    size: 'A4',
  },
  prepare: (model: PdfDocumentModel) => adaptCommercialDocumentData(model),
  validate: (data: CommercialDocumentData) => ({
    valid: Boolean(data && data.documentNumber),
    errors: data?.documentNumber ? [] : ['Purchase Order requires documentNumber'],
  }),
  render: (envelope) => React.createElement(IndustryFormeDocument, { data: envelope.data }),
}

export const industryFormeInvoiceDefinition: PdfcnTemplateDefinition<PdfDocumentModel, CommercialDocumentData> = {
  ...industryInvoiceDefinition,
  templateId: 'industry-forme',
  templateName: 'Industry Forme Invoice',
}

export const industryFormeQuotationDefinition: PdfcnTemplateDefinition<PdfDocumentModel, CommercialDocumentData> = {
  ...industryQuotationDefinition,
  templateId: 'industry-forme',
  templateName: 'Industry Forme Quotation',
}

export const industryFormePurchaseOrderDefinition: PdfcnTemplateDefinition<PdfDocumentModel, CommercialDocumentData> = {
  ...industryPurchaseOrderDefinition,
  templateId: 'industry-forme',
  templateName: 'Industry Forme Purchase Order',
}

export function registerCommercialPdfcnTemplates(): void {
  registerPdfcnTemplate(industryInvoiceDefinition)
  registerPdfcnTemplate(industryQuotationDefinition)
  registerPdfcnTemplate(industryPurchaseOrderDefinition)
  registerPdfcnTemplate(industryFormeInvoiceDefinition)
  registerPdfcnTemplate(industryFormeQuotationDefinition)
  registerPdfcnTemplate(industryFormePurchaseOrderDefinition)
}

// Auto-register upon module load
registerCommercialPdfcnTemplates()
