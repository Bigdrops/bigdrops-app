import type { ToastStackItem } from '../hooks/useToastStack'

interface DocumentToastViewportProps {
  toasts: ToastStackItem[]
  onDismiss: (toastId: string) => void
}

// Deprecated local viewport kept as a no-op shim while document view pages
// finish moving to the shared feedback layer.
export default function DocumentToastViewport(_: DocumentToastViewportProps) {
  return null
}
