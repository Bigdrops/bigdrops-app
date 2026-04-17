import { useNavigate } from 'react-router-dom'

import InvoiceHeroMeta from '@/components/document-view/invoice/InvoiceHeroMeta'
import InvoiceTopNavActions from '@/components/document-view/invoice/InvoiceTopNavActions'
import InvoiceViewPage from '@/components/document-view/invoice/InvoiceViewPage'
import {
  invoiceDocument,
  invoiceMetrics,
  invoiceSubtitle,
  invoiceThreadTag,
} from '@/components/document-view/invoice/invoiceViewMockData'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import '@/components/document-view/shared/documentViewTheme.css'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import DocumentToastViewport from '@/components/document-view/shared/DocumentToastViewport'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'

const SHEET_ID = 'customize-output'
const MORE_SHEET_ID = 'more-actions'

export default function ViewInvoiceNew() {
  const navigate = useNavigate()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(invoiceDocument.number)
      showToast('Invoice number copied', invoiceDocument.number, 'success')
    } catch {
      showToast('Copy unavailable', 'Clipboard access is not available in this static scaffold.')
    }
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={invoiceDocument.number}
            subtitle="Invoice"
            onBack={() => navigate('/invoices')}
            actions={
              <InvoiceTopNavActions
                onShare={() => showToast('Share clicked', 'Share flow remains static in Phase 1.')}
                onCustomize={() => ui.openSheet(SHEET_ID)}
                onMore={() => ui.openSheet(MORE_SHEET_ID)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={invoiceDocument.title}
            title={invoiceDocument.number}
            subtitle={invoiceSubtitle}
            status={invoiceDocument.status}
            meta={<InvoiceHeroMeta threadTag={invoiceThreadTag} />}
          />
        }
        floating={
          <FloatingDownloadButton
            onClick={() =>
              showToast(
                'Download clicked',
                'PDF export is intentionally static in Phase 1.',
                'success',
              )
            }
          />
        }
        overlays={
          <>
            <DocumentSheet
              open={ui.isSheetOpen(SHEET_ID)}
              onClose={ui.closeSheet}
              title="Customise Output"
              subtitle="Controls how the PDF is generated and displayed"
            >
              <p style={overlayCopyStyle}>
                Customisation controls stay visual-only in this phase. Save behavior and real export
                wiring will land later.
              </p>
            </DocumentSheet>

            <DocumentSheet
              open={ui.isSheetOpen(MORE_SHEET_ID)}
              onClose={ui.closeSheet}
              title="More Actions"
              subtitle="Additional invoice actions remain static in Phase 1."
            >
              <p style={overlayCopyStyle}>
                Archive, revert, and destructive flows are intentionally not connected yet.
              </p>
            </DocumentSheet>
          </>
        }
      >
        <InvoiceViewPage
          document={invoiceDocument}
          metrics={invoiceMetrics}
          onRecordPayment={() =>
            showToast('Record Payment', 'Payment form is not connected in this static phase.')
          }
          onEdit={() => showToast('Edit Invoice', 'Edit flow stays outside Phase 1 scope.')}
          onDuplicate={() => showToast('Duplicate', 'Duplicate action is represented visually only.')}
          onCopyNumber={handleCopyNumber}
          onAdvanceDownload={() =>
            showToast('Advance Download', 'Advance invoice download remains static for now.')
          }
          onAdvanceEdit={() => showToast('Advance Edit', 'Advance edit remains static for now.')}
          onAdvanceRemove={() =>
            showToast('Advance Remove', 'Advance removal remains static for now.')
          }
        />
      </DocumentPage>

      <DocumentToastViewport
        toasts={toastStack.toasts}
        onDismiss={toastStack.dismissToast}
      />
    </>
  )
}

const overlayCopyStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.6,
  color: '#57534a',
} as const
