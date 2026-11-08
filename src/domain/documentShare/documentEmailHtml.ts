/**
 * BOURXE Authoritative Document Email Template Builder
 *
 * Single source of truth for both:
 * 1. Client-side visual preview in DocumentShareSheet.tsx (via DocumentEmailTemplate.tsx)
 * 2. Server-side transactional email transmission in send-document-email Edge Function
 *
 * Designed to be runtime-neutral (works in React browser, Node.js, Bun, and Deno).
 * Adheres strictly to the BOURXE executive theme with email-client-safe inline styles.
 */

export interface DocumentEmailTemplateProps {
  documentType: string
  documentNumber: string
  documentTitle?: string
  issuerName?: string
  issuerEmail?: string
  recipientName?: string
  totalFormatted?: string
  issueDate?: string
  dueDate?: string
  validUntil?: string
  shareUrl: string
  message?: string
  fileName?: string
  replyTo?: string | null
}

export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Builds the canonical email HTML string.
 */
export function buildDocumentEmailHtml(props: DocumentEmailTemplateProps): string {
  const documentType = props.documentType || 'Document'
  const documentNumber = props.documentNumber || 'DOC-001'
  const issuerName = props.issuerName || 'BOURXE'
  const docHeading =
    props.documentTitle ||
    `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} ${documentNumber}`
  const previewText = `${docHeading} from ${issuerName}`
  const typeUpper = documentType.toUpperCase()

  const recipientHtml = props.recipientName
    ? `<p style="font-size: 13px; color: #635d55; margin: 0 0 18px 0;">Prepared for: <strong>${escapeHtml(
        props.recipientName,
      )}</strong></p>`
    : ''

  const messageHtml =
    props.message && props.message.trim()
      ? `<div style="background-color: #faf9f7; border-left: 3px solid #2b2621; padding: 12px 16px; margin: 16px 0 20px 0; border-radius: 4px;">
          <p style="font-size: 14px; line-height: 1.5; color: #2b2621; margin: 0; white-space: pre-wrap;">${escapeHtml(
            props.message.trim(),
          )}</p>
        </div>`
      : `<p style="font-size: 14px; line-height: 1.5; color: #3d3832; margin: 0 0 16px 0;">
          Please find your official ${escapeHtml(
            documentType.toLowerCase(),
          )} attached to this email. You can also view and download it online at any time.
        </p>`

  const rows: string[] = [
    `<tr style="padding: 4px 0;">
      <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Document No:</td>
      <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(
        documentNumber,
      )}</td>
    </tr>`,
  ]

  if (issuerName) {
    rows.push(
      `<tr style="padding: 4px 0;">
        <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Issued By:</td>
        <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(
          issuerName,
        )}</td>
      </tr>`,
    )
  }

  if (props.issueDate) {
    rows.push(
      `<tr style="padding: 4px 0;">
        <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Date:</td>
        <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(
          props.issueDate,
        )}</td>
      </tr>`,
    )
  }

  if (props.dueDate) {
    rows.push(
      `<tr style="padding: 4px 0;">
        <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Due Date:</td>
        <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(
          props.dueDate,
        )}</td>
      </tr>`,
    )
  }

  if (props.validUntil) {
    rows.push(
      `<tr style="padding: 4px 0;">
        <td style="font-size: 12px; font-weight: 600; color: #7a7369; width: 40%; padding: 4px 0;">Valid Until:</td>
        <td style="font-size: 13px; font-weight: 600; color: #1a1815; text-align: right; padding: 4px 0;">${escapeHtml(
          props.validUntil,
        )}</td>
      </tr>`,
    )
  }

  if (props.totalFormatted) {
    rows.push(
      `<tr style="padding-top: 8px; border-top: 1px dashed #dcd8cf;">
        <td style="font-size: 14px; font-weight: 700; color: #1a1815; width: 40%; padding: 8px 0 4px 0;">Total Amount:</td>
        <td style="font-size: 16px; font-weight: 800; color: #1a1815; text-align: right; font-family: monospace, sans-serif; padding: 8px 0 4px 0;">${escapeHtml(
          props.totalFormatted,
        )}</td>
      </tr>`,
    )
  }

  const fileName = props.fileName || `${documentNumber}.pdf`

  // Build trusted reply guidance in footer based on whether a validated reply-to address exists
  const footerContactNotice = props.replyTo
    ? `If you have any questions regarding this document, please reply directly to this email or contact ${escapeHtml(
        issuerName,
      )}.`
    : `If you have any questions regarding this document, please contact ${escapeHtml(
        issuerName,
      )} through your standard business contact channels.`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(previewText)}</title>
</head>
<body style="background-color: #f6f5f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px 0;">
  <div style="background-color: #ffffff; margin: 0 auto; padding: 36px 32px; max-width: 580px; border-radius: 12px; border: 1px solid #e7e5e0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
    <!-- Header -->
    <table style="width: 100%; margin-bottom: 16px; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: middle;">
          <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #1a1815; margin: 0;">BOURXE</div>
          <div style="font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em; color: #8c857b; margin: 2px 0 0 0;">Business Management Suite</div>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <span style="display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: #5c4813; background-color: #fbf3db; border: 1px solid #eedda6; padding: 4px 10px; border-radius: 9999px;">${escapeHtml(
            typeUpper,
          )}</span>
        </td>
      </tr>
    </table>

    <hr style="border: none; border-top: 1px solid #ebe8e1; margin: 20px 0;" />

    <!-- Document Info -->
    <div style="margin: 16px 0;">
      <h1 style="font-size: 22px; font-weight: 700; color: #1a1815; margin: 0 0 8px 0; letter-spacing: -0.3px;">${escapeHtml(
        docHeading,
      )}</h1>
      ${recipientHtml}
      ${messageHtml}

      <!-- Key Document Details -->
      <div style="background-color: #faf9f6; border-radius: 8px; padding: 14px 18px; border: 1px solid #eeebe3; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          ${rows.join('\n')}
        </table>
      </div>

      <!-- Primary Action CTA -->
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${escapeHtml(
          props.shareUrl,
        )}" style="background-color: #1f1c19; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; text-decoration: none; display: inline-block;">View Document Online</a>
      </div>

      <!-- Attachment Notice -->
      <div style="background-color: #f2f7f4; border: 1px solid #d4e7db; border-radius: 8px; padding: 10px 14px; margin: 18px 0 8px 0;">
        <p style="font-size: 12px; color: #1a4e2d; margin: 0;">
          📎 <strong>Attachment:</strong> ${escapeHtml(
            fileName,
          )} is attached to this email for your records.
        </p>
      </div>
    </div>

    <hr style="border: none; border-top: 1px solid #ebe8e1; margin: 20px 0;" />

    <!-- Footer -->
    <div style="margin-top: 20px; text-align: center;">
      <p style="font-size: 12px; color: #8c857b; margin: 0 0 6px 0;">
        Sent via <strong>BOURXE</strong> — Enterprise financial and workflow management for SMEs.
      </p>
      <p style="font-size: 11px; color: #a39c91; margin: 0; line-height: 1.4;">
        ${footerContactNotice}
      </p>
    </div>
  </div>
</body>
</html>`
}

export function renderDocumentEmailHtml(props: DocumentEmailTemplateProps): string {
  return buildDocumentEmailHtml(props)
}
