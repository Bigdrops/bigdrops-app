import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/supabase'
import { computeDocument } from '@/lib/Calculations'
import { formatNaira } from '@/lib/formatters/money'
import { 
  parseCustomFields, 
  normalizeExtraCharges,
  ensureUiKey,
  inferLegacyCalculationState,
  buildCalculationInputs,
  BUILTIN_COLUMNS,
} from '@/domain/invoice'
import type { QuotationMetric } from '@/components/document-view/quotation/quotationViewMockData'
import type { BaseDocument } from '@/components/document-view/types/documentView'

import QuotationHeroMeta from '@/components/document-view/quotation/QuotationHeroMeta'
import DocumentTopNavActions from '@/components/document-view/shared/DocumentTopNavActions'
import QuotationViewPage from '@/components/document-view/quotation/QuotationViewPage'
import QuotationMoreSheet from '@/components/document-view/quotation/QuotationMoreSheet'
import QuotationCustomizeSheet from '@/components/document-view/quotation/QuotationCustomizeSheet'
import { useDocumentUIState } from '@/components/document-view/hooks/useDocumentUIState'
import { useToastStack } from '@/components/document-view/hooks/useToastStack'
import DocumentPage from '@/components/document-view/shared/DocumentPage'
import '@/components/document-view/shared/documentViewTheme.css'
import DocumentConfirmDialog from '@/components/document-view/shared/DocumentConfirmDialog'
import DocumentHero from '@/components/document-view/shared/DocumentHero'
import DocumentToastViewport from '@/components/document-view/shared/DocumentToastViewport'
import DocumentTopNav from '@/components/document-view/shared/DocumentTopNav'
import FloatingDownloadButton from '@/components/document-view/shared/FloatingDownloadButton'
import { CenteredSpinner } from '@/components/loading/AppLoadingStates'

const SHEET_CUSTOMIZE = 'customize-output'
const SHEET_MORE = 'more-actions'
const MODAL_CONVERT = 'convert'
const MODAL_DELETE = 'delete'
const MODAL_ARCHIVE = 'archive'

export default function ViewQuotation() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const ui = useDocumentUIState()
  const toastStack = useToastStack()

  const [loading, setLoading] = useState(true)
  const [quotation, setQuotation] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [totals, setTotals] = useState<any>(null)

  useEffect(() => {
    const loadQuotation = async () => {
      if (!id) return
      setLoading(true)
      try {
        const [quoRes, itemsRes] = await Promise.all([
          supabase.from('quotations').select('*').eq('id', id).single(),
          supabase.from('quotation_items').select('*').eq('quotation_id', id).order('sort_order')
        ])

        if (quoRes.error || !quoRes.data) {
          navigate('/quotations')
          return
        }

        const data = quoRes.data
        const itemRows = itemsRes.data || []

        let parsedCustomFields: any = {}
        try {
          parsedCustomFields = parseCustomFields(data.custom_fields)
        } catch {}

        const legacyState = inferLegacyCalculationState({
          invoice: data,
          items: itemRows,
          customFields: parsedCustomFields && !Array.isArray(parsedCustomFields) ? parsedCustomFields : {},
        })

        const mappedItems = itemRows.map(item => ({
          ...ensureUiKey(item),
          row_type: item.row_type || 'standard'
        }))

        const calcInputs = buildCalculationInputs({
          invoice: {
            ...data,
            vat: legacyState.editableInputs.vatRate,
            discount: legacyState.editableInputs.discountValue,
            wht: legacyState.calculationInputs.whtValue,
          },
          items: mappedItems,
          discountType: legacyState.calculationInputs.discountType,
          discountTiming: legacyState.calculationInputs.discountTiming,
          whtType: legacyState.calculationInputs.whtType
        })

        const computed = computeDocument({
          items: mappedItems,
          columns: BUILTIN_COLUMNS,
          document: data,
          cf: {
            calculationInputs: calcInputs,
            extraCharges: normalizeExtraCharges(parsedCustomFields?.extraCharges || [])
          }
        })

        setQuotation(data)
        setItems(mappedItems)
        setTotals(computed)
      } catch (err) {
        console.error('Failed to load quotation', err)
      } finally {
        setLoading(false)
      }
    }

    loadQuotation()
  }, [id, navigate])

  const showToast = (title: string, description: string, tone: 'info' | 'success' = 'info') => {
    toastStack.showToast({ title, description, tone })
  }

  const handleCopyNumber = async () => {
    if (!quotation?.quotation_number) return
    try {
      await navigator.clipboard.writeText(quotation.quotation_number)
      showToast('Quotation number copied', quotation.quotation_number, 'success')
    } catch {
      showToast('Copy failed', 'Clipboard access denied.')
    }
  }

  if (loading) {
    return <DocumentPage topNav={<DocumentTopNav title="Loading..." onBack={() => navigate('/quotations')} />}><CenteredSpinner /></DocumentPage>
  }

  if (!quotation) return null

  const docProps: BaseDocument = {
    id: quotation.id,
    number: quotation.quotation_number,
    title: quotation.quotation_title || 'Quotation',
    status: (quotation.status || 'draft') as any
  }

  const metrics: QuotationMetric[] = [
    { label: 'Subtotal', value: formatNaira(totals?.subtotal || 0) },
    { label: 'VAT', value: formatNaira(totals?.vatAmount || 0) },
    { label: 'Total Amount', value: formatNaira(totals?.totalPayable || 0), status: 'info' }
  ]

  const handleDuplicate = () => {
    showToast('Duplicate', 'Logic will be added in Phase 2.')
  }

  return (
    <>
      <DocumentPage
        topNav={
          <DocumentTopNav
            title={docProps.number}
            subtitle={quotation.quotation_title || 'Quotation'}
            onBack={() => navigate('/quotations')}
            actions={
              <DocumentTopNavActions
                onShare={() => showToast('Share', 'Share flow remains outside Phase 1 scope.')}
                onCustomize={() => ui.openSheet(SHEET_CUSTOMIZE)}
                onMore={() => ui.openSheet(SHEET_MORE)}
              />
            }
          />
        }
        hero={
          <DocumentHero
            eyebrow={quotation.quotation_title || 'Quotation'}
            title={docProps.number}
            subtitle={quotation.client_name || 'No client specified'}
            status={docProps.status}
            meta={<QuotationHeroMeta threadTag={quotation.id?.slice(0, 8)} />}
          />
        }
        floating={
          <FloatingDownloadButton
            onClick={() =>
              showToast(
                'Download',
                'PDF generation requires backend service.',
                'success',
              )
            }
          />
        }
        overlays={
          <>
            <QuotationCustomizeSheet
              open={ui.isSheetOpen(SHEET_CUSTOMIZE)}
              onClose={ui.closeSheet}
              onSave={() => showToast('Settings saved', '', 'success')}
            />

            <QuotationMoreSheet
              open={ui.isSheetOpen(SHEET_MORE)}
              onClose={ui.closeSheet}
              onMarkAsSent={() => showToast('Marked as sent', '')}
              onMarkAsAccepted={() => showToast('Marked as accepted', '', 'success')}
              onMarkAsRejected={() => showToast('Marked as rejected', '')}
              onConvertToInvoice={() => ui.openModal(MODAL_CONVERT)}
              onLinkProject={() => showToast('Link to Project', '')}
              onDuplicate={handleDuplicate}
              onCopyNumber={handleCopyNumber}
              onExportCsv={() => showToast('Export as CSV', '')}
              onArchive={() => ui.openModal(MODAL_ARCHIVE)}
              onDelete={() => ui.openModal(MODAL_DELETE)}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_CONVERT)}
              title="Convert to Invoice?"
              description="This will generate a new draft invoice based on this quotation. The quotation will be marked as accepted."
              cancelLabel="Cancel"
              confirmLabel="Convert to Invoice"
              onConfirm={() => showToast('Converted to Invoice', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_ARCHIVE)}
              title="Archive Quotation?"
              description={`${docProps.number} will be moved to your archive. It won't appear in your active list but remains accessible.`}
              cancelLabel="Cancel"
              confirmLabel="Archive"
              onConfirm={() => showToast('Quotation archived', '', 'success')}
              onCancel={ui.closeModal}
            />

            <DocumentConfirmDialog
              open={ui.isModalOpen(MODAL_DELETE)}
              title="Delete Quotation?"
              description={`${docProps.number} will be permanently deleted. This cannot be undone.`}
              cancelLabel="Cancel"
              confirmLabel="Delete"
              destructive
              onConfirm={() => showToast('Quotation deleted', '', 'success')}
              onCancel={ui.closeModal}
            />
          </>
        }
      >
        <QuotationViewPage
          document={docProps}
          metrics={metrics}
          onConvert={() => ui.openModal(MODAL_CONVERT)}
          onEdit={() => navigate(`/quotations/edit/${id}`)}
          onDuplicate={handleDuplicate}
          onCopyNumber={handleCopyNumber}
        />
      </DocumentPage>

      <DocumentToastViewport
        toasts={toastStack.toasts}
        onDismiss={toastStack.dismissToast}
      />
    </>
  )
}
