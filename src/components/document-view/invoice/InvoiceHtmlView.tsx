type InvoiceHtmlViewProps = {
  invoice: any
  viewModel: any
  previewModel: any
  pdfOutput: any
  settingsData: any
}

export default function InvoiceHtmlView({
  invoice,
  viewModel,
  previewModel,
  pdfOutput,
  settingsData,
}: InvoiceHtmlViewProps) {
  return (
    <div
      style={{
        padding: '16px',
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e4e0d8',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <strong>Invoice Title:</strong> {invoice?.invoice_title || '—'}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <strong>Invoice Number:</strong> {invoice?.invoice_number || '—'}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <strong>Client:</strong> {invoice?.client_name || '—'}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <strong>Total Due:</strong> {viewModel?.invoiceTotal || 0}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <strong>PDF Output Settings:</strong> {pdfOutput ? 'Loaded' : 'Not loaded'}
      </div>
      <div style={{ marginBottom: '12px' }}>
        <strong>Company Name:</strong> {settingsData?.company_name || '—'}
      </div>
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#9c9589' }}>
        ✅ InvoiceHtmlView is receiving all props correctly.
      </div>
    </div>
  )
}