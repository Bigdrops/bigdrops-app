export interface ToastMessage {
  id: string
  title: string
  description?: string
  tone?: 'info' | 'success' | 'danger' | 'warning'
}

interface InvoiceToastViewportProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

// Deprecated invoice-local viewport kept as a no-op shim while invoices use
// the shared feedback toaster.
export default function InvoiceToastViewport(_: InvoiceToastViewportProps) {
  return null
}
