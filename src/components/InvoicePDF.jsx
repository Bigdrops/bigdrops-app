import InvoicePDF_Proforma from './pdf/InvoicePDF_Proforma'
import InvoicePDF_Bold from './pdf/InvoicePDF_Bold'
import InvoicePDF_Compact from './pdf/InvoicePDF_Compact'
import InvoicePDF_Professional from './pdf/InvoicePDF_Professional'
import QuotationPDF from '@/components/quotation/QuotationPDF'

export default function InvoicePDF({ template, ...props }) {
  if (template === 'bold') return <InvoicePDF_Bold {...props} />
  if (template === 'compact') return <InvoicePDF_Compact {...props} />
  if (template === 'professional') return <InvoicePDF_Professional {...props} />
  if (template === 'quotation') return <QuotationPDF {...props} />
  return <InvoicePDF_Proforma {...props} />
}
