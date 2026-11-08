import * as React from 'react'
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Button,
  Hr,
} from '@react-email/components'
import { render } from '@react-email/render'

export interface DocumentEmailProps {
  documentType: string
  documentNumber: string
  documentTitle?: string
  issuerName?: string
  recipientName?: string
  totalFormatted?: string
  issueDate?: string
  dueDate?: string
  validUntil?: string
  shareUrl: string
  message?: string
  fileName?: string
}

export const DocumentEmailTemplate: React.FC<DocumentEmailProps> = ({
  documentType = 'Invoice',
  documentNumber = 'DOC-001',
  documentTitle,
  issuerName = 'BOURXE',
  recipientName,
  totalFormatted,
  issueDate,
  dueDate,
  validUntil,
  shareUrl = 'https://bouxre.com',
  message,
  fileName,
}) => {
  const typeUpper = documentType.toUpperCase()
  const docHeading = documentTitle || `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} ${documentNumber}`
  const previewText = `${docHeading} from ${issuerName}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerSection}>
            <Row>
              <Column>
                <Text style={brandLogo}>BOURXE</Text>
                <Text style={brandSubtitle}>Business Management Suite</Text>
              </Column>
              <Column style={{ textAlign: 'right' as const }}>
                <span style={badgeStyle}>{typeUpper}</span>
              </Column>
            </Row>
          </Section>

          <Hr style={dividerStyle} />

          {/* Document Title / Greeting */}
          <Section style={contentSection}>
            <Heading style={headingStyle}>{docHeading}</Heading>
            {recipientName && (
              <Text style={recipientStyle}>
                Prepared for: <strong>{recipientName}</strong>
              </Text>
            )}

            {/* User Personalized Message */}
            {message ? (
              <Section style={messageBoxStyle}>
                <Text style={messageTextStyle}>{message}</Text>
              </Section>
            ) : (
              <Text style={defaultTextStyle}>
                Please find your official {documentType.toLowerCase()} attached to this email. You can also view and download it online at any time.
              </Text>
            )}

            {/* Key Document Details */}
            <Section style={detailsTableStyle}>
              <Row style={detailRowStyle}>
                <Column style={detailLabelCol}>Document No:</Column>
                <Column style={detailValueCol}>{documentNumber}</Column>
              </Row>
              {issuerName && (
                <Row style={detailRowStyle}>
                  <Column style={detailLabelCol}>Issued By:</Column>
                  <Column style={detailValueCol}>{issuerName}</Column>
                </Row>
              )}
              {issueDate && (
                <Row style={detailRowStyle}>
                  <Column style={detailLabelCol}>Date:</Column>
                  <Column style={detailValueCol}>{issueDate}</Column>
                </Row>
              )}
              {dueDate && (
                <Row style={detailRowStyle}>
                  <Column style={detailLabelCol}>Due Date:</Column>
                  <Column style={detailValueCol}>{dueDate}</Column>
                </Row>
              )}
              {validUntil && (
                <Row style={detailRowStyle}>
                  <Column style={detailLabelCol}>Valid Until:</Column>
                  <Column style={detailValueCol}>{validUntil}</Column>
                </Row>
              )}
              {totalFormatted && (
                <Row style={totalRowStyle}>
                  <Column style={totalLabelCol}>Total Amount:</Column>
                  <Column style={totalValueCol}>{totalFormatted}</Column>
                </Row>
              )}
            </Section>

            {/* Primary Action Button */}
            <Section style={ctaSection}>
              <Button href={shareUrl} style={buttonStyle}>
                View Document Online
              </Button>
            </Section>

            {/* Attachment notification */}
            {fileName && (
              <Section style={attachmentNoticeStyle}>
                <Text style={attachmentTextStyle}>
                  📎 <strong>Attachment:</strong> {fileName} is attached to this email for your records.
                </Text>
              </Section>
            )}
          </Section>

          <Hr style={dividerStyle} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              Sent via <strong>BOURXE</strong> — Enterprise financial and workflow management for SMEs.
            </Text>
            <Text style={footerLegalText}>
              If you have any questions regarding this document, please reply directly to this email or contact {issuerName}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export async function renderDocumentEmailHtml(props: DocumentEmailProps): Promise<string> {
  return render(React.createElement(DocumentEmailTemplate, props))
}

export default DocumentEmailTemplate

/* Styles */
const mainStyle: React.CSSProperties = {
  backgroundColor: '#f6f5f2',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '24px 0',
}

const containerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '36px 32px',
  maxWidth: '580px',
  borderRadius: '12px',
  border: '1px solid #e7e5e0',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
}

const headerSection: React.CSSProperties = {
  marginBottom: '16px',
}

const brandLogo: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 800,
  letterSpacing: '-0.5px',
  color: '#1a1815',
  margin: '0',
}

const brandSubtitle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#8c857b',
  margin: '2px 0 0 0',
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: '#5c4813',
  backgroundColor: '#fbf3db',
  border: '1px solid #eedda6',
  padding: '4px 10px',
  borderRadius: '9999px',
}

const dividerStyle: React.CSSProperties = {
  borderColor: '#ebe8e1',
  margin: '20px 0',
}

const contentSection: React.CSSProperties = {
  margin: '16px 0',
}

const headingStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#1a1815',
  margin: '0 0 8px 0',
  letterSpacing: '-0.3px',
}

const recipientStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#635d55',
  margin: '0 0 18px 0',
}

const messageBoxStyle: React.CSSProperties = {
  backgroundColor: '#faf9f7',
  borderLeft: '3px solid #2b2621',
  padding: '12px 16px',
  margin: '16px 0 20px 0',
  borderRadius: '4px',
}

const messageTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#2b2621',
  margin: '0',
}

const defaultTextStyle: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#3d3832',
  margin: '0 0 16px 0',
}

const detailsTableStyle: React.CSSProperties = {
  backgroundColor: '#faf9f6',
  borderRadius: '8px',
  padding: '14px 18px',
  border: '1px solid #eeebe3',
  margin: '20px 0',
}

const detailRowStyle: React.CSSProperties = {
  padding: '4px 0',
}

const detailLabelCol: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#7a7369',
  width: '40%',
}

const detailValueCol: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#1a1815',
  textAlign: 'right',
}

const totalRowStyle: React.CSSProperties = {
  paddingTop: '8px',
  marginTop: '8px',
  borderTop: '1px dashed #dcd8cf',
}

const totalLabelCol: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 700,
  color: '#1a1815',
  width: '40%',
}

const totalValueCol: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 800,
  color: '#1a1815',
  textAlign: 'right',
  fontFamily: 'monospace, sans-serif',
}

const ctaSection: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '28px 0 20px 0',
}

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#1f1c19',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}

const attachmentNoticeStyle: React.CSSProperties = {
  backgroundColor: '#f2f7f4',
  border: '1px solid #d4e7db',
  borderRadius: '8px',
  padding: '10px 14px',
  margin: '18px 0 8px 0',
}

const attachmentTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#1a4e2d',
  margin: '0',
}

const footerSection: React.CSSProperties = {
  marginTop: '20px',
  textAlign: 'center' as const,
}

const footerText: React.CSSProperties = {
  fontSize: '12px',
  color: '#8c857b',
  margin: '0 0 6px 0',
}

const footerLegalText: React.CSSProperties = {
  fontSize: '11px',
  color: '#a39c91',
  margin: '0',
  lineHeight: '1.4',
}
