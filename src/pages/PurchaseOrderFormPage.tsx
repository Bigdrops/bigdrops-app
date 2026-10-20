import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useEntity, useAuthorization } from '@/lib/tenant/contexts'
import SharedDocumentForm from '@/components/document/SharedDocumentForm'
import { PURCHASE_ORDER_DESCRIPTOR } from '@/components/document/documentDescriptor'
import SupplierPartySelector from '@/components/supplier/SupplierPartySelector'
import { useInvoiceColumns } from '../components/useInvoiceColumns'
import { computePurchaseOrderTotals } from '@/domain/purchase-order/calculations'
import {
  createEmptyPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderItem,
} from '@/domain/purchase-order/types'
import { validatePurchaseOrder } from '@/domain/purchase-order/validation'
import {
  PURCHASE_ORDER_FORM_COLUMNS,
  applyPurchaseOrderItemUpdate,
  applySharedHeaderUpdate,
  createPurchaseOrderFormItem,
  purchaseOrderItemFromImport,
  toDomainDiscountTiming,
  toFormDiscountTiming,
  toPurchaseOrderFormItems,
  toSharedHeaderModel,
} from '@/domain/purchase-order/formAdapter'
import {
  getPurchaseOrder,
  peekNextPurchaseOrderNumber,
  savePurchaseOrder,
} from '@/modules/purchase-order/purchaseOrderService'
import { resolvePurchaseOrderPrefix } from '@/domain/purchase-order/numbering'
import { generateImportPrompt } from '@/domain/import/promptGenerator'
import type { ApplyImportResult, ImportMode } from '@/domain/import/types'
import type { ColumnConfig } from '@/domain/invoice/types'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { useSettings } from '@/hooks/useSettings'
import { numberToWords } from '@/lib/formatters/money'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { invalidateListCache, purchaseOrderListCacheKey } from '@/lib/cache/listCache'

interface PurchaseOrderFormPageProps {
  mode: 'create' | 'edit'
}

const CHARGE_LABELS = {
  workmanship: 'Workmanship',
  transportation: 'Transportation',
  shipping: 'Shipping',
}

export default function PurchaseOrderFormPage({ mode }: PurchaseOrderFormPageProps) {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { entity, tenantClient } = useEntity()
  const { hasAuthorization } = useAuthorization()
  const { settings } = useSettings()
  const { isMobile } = useLayoutMode()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const entityId = entity?.id ?? null

  const canWrite = hasAuthorization('purchase_order', isCreate ? 'create' : 'edit')

  const [po, setPo] = useState<PurchaseOrder>(() => createEmptyPurchaseOrder())
  const [loading, setLoading] = useState<boolean>(isEdit)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [invalidRowIndex, setInvalidRowIndex] = useState<number | null>(null)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [mergeQtyUnit, setMergeQtyUnit] = useState(false)
  const [invoiceTitle, setInvoiceTitle] = useState('')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms')

  const dirtyRef = useRef(false)
  const autoNumberRef = useRef('')

  const markDirty = useCallback(() => {
    dirtyRef.current = true
  }, [])

  /* ── Edit-mode load: drafts only, unarchived only ── */
  useEffect(() => {
    if (!isEdit || !id || !tenantClient.isReady) return
    let cancelled = false
    setLoading(true)
    getPurchaseOrder(tenantClient, id).then((result) => {
      if (cancelled) return
      if (result.error || !result.data) {
        setLoadError(result.error || 'Purchase order not found')
        setLoading(false)
        return
      }
      if (result.data.status !== 'draft' || result.data.archived_at) {
        navigate(`/purchase-orders/${id}`, { replace: true })
        return
      }
      setPo({ ...result.data, items: result.data.items ?? [] })
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [isEdit, id, tenantClient.isReady, navigate, tenantClient])

  /* ── Automatic number preview. Never clobbers a typed manual number.
     Advisory only: the save path reallocates under collision retry. ── */
  useEffect(() => {
    if (!isCreate || !tenantClient.isReady) return
    let cancelled = false
    peekNextPurchaseOrderNumber(tenantClient, settings?.document_prefixes).then((next) => {
      if (cancelled || !next) return
      autoNumberRef.current = next
      setPo((current) => (current.po_number?.trim() ? current : { ...current, po_number: next }))
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isCreate, settings?.document_prefixes, tenantClient.isReady, tenantClient.schemaName])

  /* ── Refresh/tab-close guard (browsers show their own prompt). ── */
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const {
    columns,
    isVisible,
    getColumn,
    toggleVisible,
    toggleDisabled,
    updateColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
  } = useInvoiceColumns([...PURCHASE_ORDER_FORM_COLUMNS])

  /* ── Derived financials: the canonical engine is the only calculator. ── */
  const computation = useMemo(() => computePurchaseOrderTotals(po), [po])
  const computedItems = useMemo(
    () => computation.lineTotals.map((line_subtotal) => ({ line_subtotal })),
    [computation],
  )
  const formItems = useMemo(() => toPurchaseOrderFormItems(po), [po])
  const headerModel = useMemo(() => toSharedHeaderModel(po), [po])
  const formDiscountTiming = toFormDiscountTiming(po.calculation_inputs.discountTiming)
  const formExtraCharges = useMemo(
    () =>
      (po.extra_charges ?? []).map((charge, index) => ({
        ...charge,
        id: `po-charge-${index}`,
      })),
    [po.extra_charges],
  )

  /* ── Field routing ──
   * Functional update: the shared form emits party selection as two
   * synchronous updates (id, then name). A closed-over snapshot would let
   * the second call overwrite the first and silently drop supplier_id
   * while keeping supplier_name. Matching the invoice updater shape. */
  const updateHeader = useCallback(
    (field: string, value: unknown) => {
      markDirty()
      setSaveError(null)
      setPo((current) => applySharedHeaderUpdate(current, field, value) ?? current)
    },
    [markDirty],
  )

  const setDiscountType = useCallback(
    (discountType: PurchaseOrder['calculation_inputs']['discountType']) => {
      markDirty()
      setPo((current) => ({
        ...current,
        calculation_inputs: { ...current.calculation_inputs, discountType },
      }))
    },
    [markDirty],
  )

  const setFormDiscountTiming = useCallback(
    (timing: 'before' | 'after') => {
      markDirty()
      setPo((current) => ({
        ...current,
        calculation_inputs: { ...current.calculation_inputs, discountTiming: toDomainDiscountTiming(timing) },
      }))
    },
    [markDirty],
  )

  const updateItem = useCallback(
    (index: number, field: string, value: unknown) => {
      markDirty()
      setPo((current) => ({
        ...current,
        items: applyPurchaseOrderItemUpdate(current.items ?? [], index, field, value),
      }))
      setSaveError(null)
    },
    [markDirty],
  )

  const addItem = useCallback(() => {
    markDirty()
    setPo((current) => {
      const items = current.items ?? []
      const formItem = createPurchaseOrderFormItem(items.length)
      const { row_type: _rowType, unit_price: _unitPrice, _uiKey, ...domainItem } = formItem
      return { ...current, items: [...items, domainItem as PurchaseOrderItem] }
    })
  }, [markDirty])

  const removeItem = useCallback(
    (index: number) => {
      markDirty()
      setPo((current) => ({
        ...current,
        items: (current.items ?? []).filter((_, position) => position !== index),
      }))
    },
    [markDirty],
  )

  const moveItem = useCallback(
    (index: number, direction: number) => {
      markDirty()
      setPo((current) => {
        const items = [...(current.items ?? [])]
        const target = index + direction
        if (index < 0 || target < 0 || index >= items.length || target >= items.length) return current
        const [moved] = items.splice(index, 1)
        items.splice(target, 0, moved)
        return { ...current, items }
      })
    },
    [markDirty],
  )

  const insertItemAfter = useCallback(
    (index: number) => {
      markDirty()
      setPo((current) => {
        const items = [...(current.items ?? [])]
        const formItem = createPurchaseOrderFormItem(index + 1)
        const { row_type: _rowType, unit_price: _unitPrice, _uiKey, ...domainItem } = formItem
        items.splice(index + 1, 0, domainItem as PurchaseOrderItem)
        return { ...current, items }
      })
    },
    [markDirty],
  )

  const updateExtraCharge = useCallback(
    (chargeId: string | undefined, field: string, value: unknown) => {
      markDirty()
      setPo((current) => ({
        ...current,
        extra_charges: (current.extra_charges ?? []).map((charge, index) =>
          `po-charge-${index}` === chargeId ? { ...charge, [field]: value } : charge,
        ),
      }))
    },
    [markDirty],
  )

  const addExtraCharge = useCallback(
    (withTax: boolean) => {
      markDirty()
      setPo((current) => ({
        ...current,
        extra_charges: [...(current.extra_charges ?? []), { label: '', value: 0, withTax }],
      }))
    },
    [markDirty],
  )

  const removeExtraCharge = useCallback(
    (chargeId: string | undefined) => {
      markDirty()
      setPo((current) => ({
        ...current,
        extra_charges: (current.extra_charges ?? []).filter((_, index) => `po-charge-${index}` !== chargeId),
      }))
    },
    [markDirty],
  )

  const clearItems = useCallback(() => {
    markDirty()
    setPo((current) => ({ ...current, items: [] }))
  }, [markDirty])

  const noop = useCallback(() => {}, [])

  const handleCustomColumnAdd = useCallback(() => {
    feedback.info('Custom columns are display-only on purchase orders and are not saved.')
  }, [])

  const handleImportApply = useCallback(
    (result: ApplyImportResult) => {
      markDirty()
      const items = (result.items ?? []).map((row, index) =>
        purchaseOrderItemFromImport(row as unknown as Record<string, unknown>, index),
      )
      setPo((current) => ({
        ...current,
        items,
        extra_charges: (result.topLevel.extra_charges ?? []).map((charge) => ({
          label: String(charge.label ?? ''),
          value: Number(charge.value ?? 0),
          withTax: charge.withTax === true,
        })),
        notes:
          result.topLevel.notes !== undefined && result.topLevel.notes !== null
            ? String(result.topLevel.notes)
            : current.notes,
        terms:
          result.topLevel.terms !== undefined && result.topLevel.terms !== null
            ? String(result.topLevel.terms)
            : current.terms,
      }))
      setSaveError(null)
    },
    [markDirty],
  )

  const purchaseOrderImportAdapter = useMemo(
    () => ({
      documentType: 'purchase_order' as const,
      prompts: (columns: ColumnConfig[], mode: ImportMode, currentItemCount: number) =>
        generateImportPrompt(columns, mode, 'invoice', currentItemCount),
      createItem: () => ({
        description: '',
        quantity: 1,
        unit: '',
        unit_price: 0,
      }),
    }),
    [],
  )

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    if (saving) return
    if (!entityId) {
      feedback.error('Missing business context for this save.')
      return
    }
    const preflight = validatePurchaseOrder(po, { requireNumber: false })
    if (!preflight.valid) {
      if (typeof preflight.rowIndex === 'number') setInvalidRowIndex(preflight.rowIndex)
      const message = preflight.errorDescription ?? preflight.error ?? 'Invalid purchase order.'
      setSaveError(message)
      feedback.error(message)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const typed = po.po_number.trim()
      const result = await savePurchaseOrder(tenantClient, entityId, {
        purchaseOrder: po,
        mode: isCreate ? 'create' : 'update',
        documentPrefixes: settings?.document_prefixes,
        manualNumber: isCreate && typed && typed !== autoNumberRef.current ? typed : undefined,
      })
      if (result.error || !result.data) {
        setSaveError(result.error)
        feedback.error(result.error ?? 'Could not save this purchase order.')
        return
      }
      dirtyRef.current = false
      if (tenantClient.schemaName) {
        invalidateListCache(purchaseOrderListCacheKey(tenantClient.schemaName))
      }
      feedback.success(isCreate ? 'Purchase order created as draft' : 'Purchase order saved')
      navigate(`/purchase-orders/${result.data.id}`)
    } catch (error) {
      const message = getUserFacingMutationMessage(error, { action: 'save' })
      setSaveError(message)
      feedback.error(message)
    } finally {
      setSaving(false)
    }
  }, [saving, entityId, po, mode, settings?.document_prefixes, tenantClient, isCreate, navigate])

  const handleCancel = useCallback(() => {
    navigate(isCreate ? '/purchase-orders' : `/purchase-orders/${id}`)
  }, [isCreate, id, navigate])

  const handleLockedFieldClick = useCallback((field: 'client' | 'invoice_number') => {
    feedback.info(
      field === 'client'
        ? 'The supplier is locked after creation.'
        : 'The PO number cannot change after creation.',
    )
  }, [])

  const pageTitle = isCreate ? 'Create Purchase Order' : 'Edit Purchase Order'
  const modeLabel = isCreate ? 'New Purchase Order' : 'Edit Purchase Order'
  const primaryLabel = isCreate ? 'Create Purchase Order' : 'Save Changes'
  const totals = computation.totals

  if (!canWrite) {
    return (
      <Layout title={pageTitle} hidePageHeader immersive>
        <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
          <div className="text-sm font-bold text-bd-text">No access to purchase orders</div>
          <div className="mt-1 text-xs text-bd-text-muted">
            Your role cannot {isCreate ? 'create' : 'edit'} purchase orders for this business.
          </div>
        </div>
      </Layout>
    )
  }

  if (isEdit && (loading || (!po.id && !loadError))) {
    return (
      <Layout title={pageTitle} hidePageHeader immersive>
        <div className="w-full px-4 py-6 pb-24 text-sm text-muted-foreground sm:px-6 md:mx-auto md:max-w-2xl md:pb-12 lg:px-8">
          Loading purchase order...
        </div>
      </Layout>
    )
  }

  if (isEdit && loadError) {
    return (
      <Layout title={pageTitle} hidePageHeader immersive>
        <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
          <div className="text-sm font-bold text-bd-text">Purchase order could not load</div>
          <div className="mt-1 text-xs text-bd-text-muted">{loadError}</div>
          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            className="mt-4 h-10 rounded-xl border border-bd-border bg-bd-surface px-4 text-xs font-bold text-bd-text"
          >
            Back to Purchase Orders
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={pageTitle} hidePageHeader immersive>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
        {saveError ? (
          <div role="alert" className="rounded-xl border border-bd-status-danger-border bg-bd-status-danger-bg px-4 py-3 text-xs font-semibold text-bd-status-danger-text">
            {saveError}
          </div>
        ) : null}
        <SharedDocumentForm
          mode={mode}
          title={pageTitle}
          modeLabel={modeLabel}
          descriptor={PURCHASE_ORDER_DESCRIPTOR}
          partySelector={SupplierPartySelector}
          invoice={headerModel}
          invoiceTitle={invoiceTitle}
          setInvoiceTitle={setInvoiceTitle}
          updateInvoice={updateHeader}
          items={formItems}
          groups={[]}
          customFields={[]}
          additionalFields={[]}
          extraCharges={formExtraCharges}
          chargeLabels={CHARGE_LABELS}
          notesTitle={notesTitle}
          setNotesTitle={setNotesTitle}
          termsTitle={termsTitle}
          setTermsTitle={setTermsTitle}
          attachments={[]}
          setAttachments={noop}
          signatories={[]}
          signatoryId={null}
          onSignatoryChange={noop}
          hideSignatorySection
          hideReferenceLinksSection
          mergeQtyUnit={mergeQtyUnit}
          setMergeQtyUnit={setMergeQtyUnit}
          columns={columns}
          isVisible={isVisible}
          getColumn={getColumn}
          toggleVisible={toggleVisible}
          toggleDisabled={toggleDisabled}
          updateColumn={updateColumn}
          addCustomColumn={handleCustomColumnAdd}
          removeCustomColumn={removeCustomColumn}
          resetColumns={resetColumns}
          moveColumn={moveColumn}
          customColumns={customColumns}
          computedItems={computedItems}
          computedGroups={[]}
          rawSubtotal={totals.subtotal}
          installRateTotal={0}
          vatAmount={totals.vat}
          discountAmount={totals.discount}
          grandTotal={totals.total}
          whtAmount={0}
          totalPayable={totals.total}
          amountInWords={numberToWords(totals.total)}
          discountType={po.calculation_inputs.discountType}
          setDiscountType={setDiscountType}
          discountTiming={formDiscountTiming}
          setDiscountTiming={setFormDiscountTiming}
          whtType="percent"
          setWhtType={noop}
          saving={saving}
          primaryLabel={primaryLabel}
          onSaveSent={handleSave}
          onSaveDraft={handleSave}
          onFloatingSave={handleSave}
          onCancel={handleCancel}
          onApplyImport={handleImportApply}
          importAdapter={purchaseOrderImportAdapter}
          onAddItem={addItem}
          onAddGroup={undefined}
          onAddItemToGroup={noop}
          onUpdateItem={updateItem}
          onResetItemOverrides={noop}
          onRemoveItem={removeItem}
          onMoveItem={moveItem}
          onInsertItemAfter={insertItemAfter}
          onUpdateGroupName={noop}
          onToggleGroupSubtotal={noop}
          onDeleteGroup={noop}
          onAddHeaderField={noop}
          onUpdateHeaderField={noop}
          onRemoveHeaderField={noop}
          onAddAdditionalField={noop}
          onUpdateAdditionalField={noop}
          onRemoveAdditionalField={noop}
          onAddExtraCharge={addExtraCharge}
          onUpdateExtraCharge={updateExtraCharge}
          onRemoveExtraCharge={removeExtraCharge}
          onClearAll={clearItems}
          invalidRowIndex={invalidRowIndex}
          onClearInvalidRow={() => setInvalidRowIndex(null)}
          showColumnManager={showColumnManager}
          setShowColumnManager={setShowColumnManager}
          isMobile={isMobile}
          enableItemSuggestions={false}
          onLockedFieldClick={handleLockedFieldClick}
        />
      </div>
    </Layout>
  )
}
