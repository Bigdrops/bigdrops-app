import InvoicePDF_Classic  from './pdf/InvoicePDF_Classic'
import InvoicePDF_Proforma from './pdf/InvoicePDF_Proforma'
import InvoicePDF_Bold     from './pdf/InvoicePDF_Bold'
import InvoicePDF_Compact  from './pdf/InvoicePDF_Compact'

export const TEMPLATES = [
  { id: 'classic',  label: 'Classic',  description: 'Navy, clean minimal' },
  { id: 'proforma', label: 'Proforma', description: 'Green accent, centered title' },
  { id: 'bold',     label: 'Bold',     description: 'Dark full-width header' },
  { id: 'compact',  label: 'Compact',  description: 'Tight spacing, dense table' },
]

export const getActiveTemplate = () => {
  try { return localStorage.getItem('invoice_pdf_template') || 'classic' } catch { return 'classic' }
}

export const setActiveTemplate = (id) => {
  try { localStorage.setItem('invoice_pdf_template', id) } catch {}
}

export default function InvoicePDF(props) {
  const template = getActiveTemplate()
  if (template === 'proforma') return <InvoicePDF_Proforma {...props} />
  if (template === 'bold')     return <InvoicePDF_Bold     {...props} />
  if (template === 'compact')  return <InvoicePDF_Compact  {...props} />
  return <InvoicePDF_Classic {...props} />
}
