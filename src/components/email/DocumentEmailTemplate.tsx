import * as React from 'react'
// Underlying email rendering framework types for BOUXRE document sharing
import type { Html, Head, Body, Container } from '@react-email/components'
import type { render } from '@react-email/render'
import {
  buildDocumentEmailHtml,
  type DocumentEmailTemplateProps,
} from '@/domain/documentShare/documentEmailHtml'

export type DocumentEmailProps = DocumentEmailTemplateProps

/**
 * Renders the authoritative BOUXRE document email design.
 * Single source of truth: buildDocumentEmailHtml().
 * Features:
 * - BOUXRE executive branding & layout
 * - Primary Action: View Document Online
 * Eliminates visual and structural divergence between preview and Resend delivery.
 */
export const DocumentEmailTemplate: React.FC<DocumentEmailProps> = (props) => {
  const html = React.useMemo(() => buildDocumentEmailHtml(props), [props])

  return (
    <div
      className="bourxe-document-email-preview-host"
      style={{ width: '100%' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * Canonical helper for async rendering, maintaining backward compatibility with tests and callers.
 */
export async function renderDocumentEmailHtml(props: DocumentEmailProps): Promise<string> {
  return buildDocumentEmailHtml(props)
}

export { buildDocumentEmailHtml }
export default DocumentEmailTemplate
