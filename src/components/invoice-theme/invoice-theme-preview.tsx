/**
 * Invoice Form Theme Experiment — Design Lab preview.
 *
 * The experiment mounts the real invoice form presentation (`SharedDocumentForm`,
 * the same component the invoice route renders) at full viewport, and drives the
 * Design Lab theme through one scoped token layer on its root.
 *
 * Isolation contract:
 *  - The Design Lab theme drives the whole experiment through one scoped token
 *    layer on `.ite-root`. No document-root write, no global stylesheet rule,
 *    no change to the saved user preference.
 *  - Representative data replaces live tenant data. The mounted form reads
 *    through an inert tenant client that resolves empty, so no Supabase request
 *    can start from this route.
 *  - Save, draft, cancel, import, and client actions resolve to local preview
 *    state or to a preview-only notice. No invoice is created or modified.
 *
 * The editing state comes from the production `useInvoiceEditableState` hook,
 * so client selection, document details, dates, line items, groups, quantities,
 * pricing, tax controls, discount, and notes behave as they do on the invoice
 * route. Only the four collections the route seeds from tenant reference data
 * (header fields, additional fields, extra charges, reference links) and the
 * signature selection are preview-local.
 */

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Moon, Palette, Sun, X } from 'lucide-react'

import {
  resolveAppearance,
  useExperimentThemeStyle,
} from '@/components/design-lab/design-lab-theme'
import { ViewportStage, ViewportSwitcher } from '@/components/design-lab/viewport-stage'
import SharedDocumentForm from '@/components/document/SharedDocumentForm'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import { buildCalculationInputs, useInvoiceColumns } from '@/components/useInvoiceColumns'
import {
  PHOTO_HERO_FAMILY_META,
  isPhotoHeroFamilyId,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { makeExtraCharge, makeFieldEntry } from '@/domain/invoice'
import type { ExtraCharge, InvoiceAttachment, InvoiceFieldEntry, InvoicePdfOutput } from '@/domain/invoice'
import { useInvoiceEditableState } from '@/hooks/useInvoiceEditableState'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { computeDocument } from '@/lib/Calculations'
import { useDesignLabViewport } from '@/lib/designLabViewports'
import { numberToWords } from '@/lib/formatters/money'
import {
  PREVIEW_ADDITIONAL_FIELDS,
  PREVIEW_ATTACHMENTS,
  PREVIEW_BANK_ACCOUNTS,
  PREVIEW_COMPANY_PROFILE,
  PREVIEW_EXTRA_CHARGES,
  PREVIEW_HEADER_FIELDS,
  PREVIEW_INVOICE,
  PREVIEW_INVOICE_ITEMS,
  PREVIEW_SIGNATORIES,
} from './preview-invoice-data'
import { PreviewEntityProvider } from './preview-entity-context'

const PREVIEW_TITLE = 'Create Invoice'
const PREVIEW_MODE_LABEL = 'New Invoice'
const PREVIEW_PRIMARY_LABEL = 'Create Invoice'

const PREVIEW_PDF_OUTPUT: InvoicePdfOutput = {
  showBankDetails: true,
  bankAccountId: PREVIEW_BANK_ACCOUNTS[0].id,
  showFooter: true,
  showTagline: true,
  showBalanceDue: true,
  showAmountInWords: true,
  compact: false,
}

export default function InvoiceThemePreview() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()
  const { isMobile } = useLayoutMode()

  // Seed from the persisted preference once; the preview then owns its own
  // family and appearance and never writes back.
  const [family, setFamily] = React.useState<PhotoHeroFamilyId>(() =>
    isPhotoHeroFamilyId(preference.themePresetId) ? preference.themePresetId : 'slate-navy',
  )
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )
  // Viewport selection is local to this experiment, so the dashboard experiment
  // keeps its own selection.
  const { viewportId, viewport, setViewportId } = useDesignLabViewport()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [showColumnManager, setShowColumnManager] = React.useState(false)
  const [pdfOutput, setPdfOutput] = React.useState<InvoicePdfOutput>(PREVIEW_PDF_OUTPUT)
  const [notice, setNotice] = React.useState<string | null>(null)

  // Preview-local collections. The production route seeds these from tenant
  // reference data; the preview supplies representative values instead.
  const [headerFields, setHeaderFields] = React.useState<InvoiceFieldEntry[]>(PREVIEW_HEADER_FIELDS)
  const [additionalFields, setAdditionalFields] =
    React.useState<InvoiceFieldEntry[]>(PREVIEW_ADDITIONAL_FIELDS)
  const [extraCharges, setExtraCharges] = React.useState<ExtraCharge[]>(PREVIEW_EXTRA_CHARGES)
  const [attachments, setAttachments] = React.useState<InvoiceAttachment[]>(PREVIEW_ATTACHMENTS)
  const [signatoryId, setSignatoryId] = React.useState<string | null>(PREVIEW_SIGNATORIES[0].id)

  const noticeTimer = React.useRef<number | null>(null)
  const paletteRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)

  // Shared Design Lab theme layer, scoped to this experiment root.
  const { rootStyle } = useExperimentThemeStyle(family, appearance)


  const editable = useInvoiceEditableState({
    mode: 'create',
    prefill: { ...PREVIEW_INVOICE },
    prefillItems: PREVIEW_INVOICE_ITEMS,
    projectPrefill: { projectId: '', clientId: PREVIEW_INVOICE.client_id, clientName: PREVIEW_INVOICE.client_name },
  })

  const {
    columns,
    isVisible,
    getColumn,
    toggleVisible,
    toggleDisabled,
    updateColumn,
    addCustomColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
  } = useInvoiceColumns()

  const invoiceFallback = React.useMemo(() => ({ ...PREVIEW_INVOICE }), [])
  const invoice = editable.invoice ?? invoiceFallback

  const calculationInputs = React.useMemo(
    () =>
      buildCalculationInputs({
        invoice,
        discountType: editable.discountType,
        discountTiming: editable.discountTiming,
        whtType: editable.whtType,
      }),
    [invoice, editable.discountType, editable.discountTiming, editable.whtType],
  )

  const documentTotals = React.useMemo(
    () =>
      computeDocument({
        items: editable.items,
        columns,
        document: {
          ...invoice,
          workmanship: Number(invoice.workmanship || 0),
          transportation: Number(invoice.transportation || 0),
          shipping: Number(invoice.shipping || 0),
        },
        cf: { extraCharges, calculationInputs },
      }),
    [editable.items, columns, extraCharges, calculationInputs, invoice],
  )

  const familyLabel = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)?.label ?? family
  const familySwatch = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)?.swatch ?? '#ffffff'

  const notify = React.useCallback((message: string) => {
    setNotice(message)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600)
  }, [])

  React.useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    },
    [],
  )

  // Popover dismissal: Escape returns focus to the trigger, outside taps close.
  React.useEffect(() => {
    if (!paletteOpen) return
    popoverRef.current?.querySelector('button')?.focus()

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (popoverRef.current?.contains(target) || paletteRef.current?.contains(target)) return
      setPaletteOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPaletteOpen(false)
      paletteRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [paletteOpen])

  /* ── Preview-local collection handlers (mirror the production semantics) ── */

  const addHeaderField = React.useCallback(() => {
    setHeaderFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])
  }, [])
  const updateHeaderField = React.useCallback((id: string, field: 'label' | 'value', value: string) => {
    setHeaderFields((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
    )
  }, [])
  const removeHeaderField = React.useCallback((id: string) => {
    setHeaderFields((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const addAdditionalField = React.useCallback(() => {
    setAdditionalFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])
  }, [])
  const updateAdditionalField = React.useCallback(
    (id: string, field: 'label' | 'value', value: string) => {
      setAdditionalFields((current) =>
        current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)),
      )
    },
    [],
  )
  const removeAdditionalField = React.useCallback((id: string) => {
    setAdditionalFields((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const addExtraCharge = React.useCallback((withTax: boolean) => {
    setExtraCharges((current) => [...current, makeExtraCharge({ withTax })])
  }, [])
  const updateExtraCharge = React.useCallback((chargeId: string | number, field: string, value: unknown) => {
    setExtraCharges((current) =>
      current.map((charge) => (charge.id === chargeId ? { ...charge, [field]: value } : charge)),
    )
  }, [])
  const removeExtraCharge = React.useCallback((chargeId: string | number) => {
    setExtraCharges((current) => current.filter((charge) => charge.id !== chargeId))
  }, [])

  const previewOnly = React.useCallback(
    (message: string) => () => notify(message),
    [notify],
  )

  return (
    <div
      className="ite-root"
      style={rootStyle}
      data-ite-root="invoice-theme-experiment"
      data-ite-family={family}
      data-ite-appearance={appearance}
    >
      <style>{PREVIEW_CSS}</style>

      <h1 className="ite-vh">Invoice Form Theme Experiment</h1>
      <p className="ite-vh" role="status">
        {`Invoice form theme experiment. ${familyLabel} in ${appearance} mode. Preview only.`}
      </p>

      <ViewportStage viewport={viewport}>
        {/* The real invoice form presentation, with preview-local state. */}
        <PreviewEntityProvider>
          <div className="ite-form-host mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
            <SharedDocumentForm
              mode="create"
              title={PREVIEW_TITLE}
              modeLabel={PREVIEW_MODE_LABEL}
              invoice={invoice}
              invoiceTitle={editable.invoiceTitle}
              setInvoiceTitle={editable.setInvoiceTitle}
              updateInvoice={editable.updateInvoice}
              items={editable.items}
              groups={editable.groups}
              customFields={headerFields}
              additionalFields={additionalFields}
              extraCharges={extraCharges}
              chargeLabels={editable.chargeLabels}
              notesTitle={editable.notesTitle}
              setNotesTitle={editable.setNotesTitle}
              termsTitle={editable.termsTitle}
              setTermsTitle={editable.setTermsTitle}
              attachments={attachments}
              setAttachments={setAttachments}
              signatories={PREVIEW_SIGNATORIES}
              signatoryId={signatoryId}
              onSignatoryChange={setSignatoryId}
              mergeQtyUnit={editable.mergeQtyUnit}
              setMergeQtyUnit={editable.setMergeQtyUnit}
              columns={columns}
              isVisible={isVisible}
              getColumn={getColumn}
              toggleVisible={toggleVisible}
              toggleDisabled={toggleDisabled}
              updateColumn={updateColumn}
              addCustomColumn={addCustomColumn}
              removeCustomColumn={removeCustomColumn}
              resetColumns={resetColumns}
              moveColumn={moveColumn}
              customColumns={customColumns}
              computedItems={documentTotals.items}
              computedGroups={documentTotals.groups}
              rawSubtotal={documentTotals.subtotal}
              installRateTotal={documentTotals.installRateTotal}
              vatAmount={documentTotals.vat}
              discountAmount={documentTotals.discount}
              grandTotal={documentTotals.grandTotal}
              whtAmount={documentTotals.wht}
              totalPayable={documentTotals.totalPayable}
              amountInWords={numberToWords(documentTotals.totalPayable)}
              discountType={editable.discountType}
              setDiscountType={editable.setDiscountType}
              discountTiming={editable.discountTiming}
              setDiscountTiming={editable.setDiscountTiming}
              whtType={editable.whtType}
              setWhtType={editable.setWhtType}
              saving={false}
              primaryLabel={PREVIEW_PRIMARY_LABEL}
              onSaveSent={previewOnly('Preview only — no invoice was created.')}
              onSaveDraft={previewOnly('Preview only — no draft was saved.')}
              onFloatingSave={previewOnly('Preview only — no invoice was created.')}
              onCancel={previewOnly('Preview only — the form was not closed.')}
              onApplyImport={previewOnly('Preview only — no items were imported.')}
              onAddItem={editable.addItem}
              onAddGroup={editable.addGroup}
              onAddItemToGroup={editable.addItemToGroup}
              onUpdateItem={editable.updateItem}
              onResetItemOverrides={editable.resetItemOverrides}
              onRemoveItem={editable.removeItem}
              onMoveItem={editable.moveItem}
              onInsertItemAfter={editable.insertItemAfter}
              onUpdateGroupName={editable.updateGroupName}
              onToggleGroupSubtotal={editable.toggleGroupSubtotal}
              onDeleteGroup={editable.deleteGroup}
              onAddHeaderField={addHeaderField}
              onUpdateHeaderField={updateHeaderField}
              onRemoveHeaderField={removeHeaderField}
              onAddAdditionalField={addAdditionalField}
              onUpdateAdditionalField={updateAdditionalField}
              onRemoveAdditionalField={removeAdditionalField}
              onChargeLabelChange={editable.handleChargeLabelChange}
              onAddExtraCharge={addExtraCharge}
              onUpdateExtraCharge={updateExtraCharge}
              onRemoveExtraCharge={removeExtraCharge}
              onClearAll={editable.handleClearAll}
              invalidRowIndex={null}
              onClearInvalidRow={() => undefined}
              showColumnManager={showColumnManager}
              setShowColumnManager={setShowColumnManager}
              isMobile={isMobile}
            />

            <div className="mx-auto w-full max-w-4xl px-0 pb-6 sm:px-2">
              <PdfOutputSettings
                value={pdfOutput}
                onChange={setPdfOutput}
                bankAccounts={PREVIEW_BANK_ACCOUNTS}
                companyTagline={PREVIEW_COMPANY_PROFILE.tagline}
                footerText={PREVIEW_COMPANY_PROFILE.footerText}
              />
            </div>
          </div>
        </PreviewEntityProvider>
      </ViewportStage>

      {/* Compact floating palette, outside the form scroll flow. */}
      <div className="ite-dock">
        <button
          ref={paletteRef}
          type="button"
          className="ite-dock-btn active:scale-95"
          aria-expanded={paletteOpen}
          aria-controls="ite-palette"
          aria-label={paletteOpen ? 'Close theme palette' : 'Open theme palette'}
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <Palette className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
          <span className="ite-dock-dot" style={{ ['--swatch' as string]: familySwatch }} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ite-dock-btn active:scale-95"
          aria-label="Close experiment and return to Design Lab"
          onClick={() => navigate('/design-lab')}
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {paletteOpen ? (
        <div ref={popoverRef} id="ite-palette" className="ite-pop" role="dialog" aria-label="Experiment theme palette">
          <div className="ite-pop-group" role="group" aria-label="Theme family">
            {PHOTO_HERO_FAMILY_META.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={family === item.id}
                aria-label={`Use ${item.label}`}
                onClick={() => setFamily(item.id)}
              >
                <span className="ite-pop-dot" style={{ ['--swatch' as string]: item.swatch }} aria-hidden="true" />
                {item.short}
              </button>
            ))}
          </div>

          <div className="ite-pop-group" role="group" aria-label="Appearance">
            <button
              type="button"
              aria-pressed={appearance === 'light'}
              aria-label="Use light appearance"
              onClick={() => setAppearance('light')}
            >
              <Sun className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Light
            </button>
            <button
              type="button"
              aria-pressed={appearance === 'dark'}
              aria-label="Use dark appearance"
              onClick={() => setAppearance('dark')}
            >
              <Moon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Dark
            </button>
          </div>

          <div className="ite-pop-group ite-pop-group--viewport">
            <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
          </div>

          <button
            type="button"
            className="ite-pop-close"
            onClick={() => {
              setPaletteOpen(false)
              paletteRef.current?.focus()
            }}
          >
            Close
          </button>
        </div>
      ) : null}

      {notice ? (
        <p className="ite-notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  )
}

const PREVIEW_CSS = `
  /* Experiment scope. No rule here targets html, body, or :root. */
  .ite-root{position:relative;min-height:100dvh}
  .ite-vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

  /* Design Lab canvas: the atmospheric scene replaces the flat form background. */
  .ite-root .dlv-stage{background-color:transparent;background-image:var(--scene-intro);background-attachment:fixed;background-size:cover}
  .ite-root .ite-form-host{position:relative;z-index:1}
  .ite-root .bd-document-form{background-color:transparent;color:hsl(var(--ink))}
  .ite-root .bd-document-form .cps-form-topbar{background:linear-gradient(180deg,hsl(var(--dlv-chrome,var(--bg))/.86) 70%,hsl(var(--dlv-chrome,var(--bg))/0) 100%);-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%)}
  .ite-root[data-ite-appearance="dark"] .bd-document-form .cps-form-topbar{background:linear-gradient(180deg,hsl(var(--dlv-chrome,var(--bg))/.72) 70%,hsl(var(--dlv-chrome,var(--bg))/0) 100%)}
  /* The production header carries a theme toggle that writes the saved user
     preference. The experiment owns appearance, so the control is removed from
     the experimental form instead of mutating production state. */
  .ite-root .cps-form-topbar button[aria-label^="Switch to light mode"],
  .ite-root .cps-form-topbar button[aria-label^="Switch to dark mode"]{display:none}

  /* Simulated viewports: the surface is a size container, so the production
     composition tiers are restated against it. Nothing is scaled; a wider
     preset scrolls horizontally instead. In actual-device mode these rules
     never match, and production media queries decide the composition. */
  @container dlv (max-width: 767.9px){
    [data-dlv-sim] .ite-root .bd-document-room{max-width:560px;padding:10px var(--gutter) calc(112px + env(safe-area-inset-bottom))}
    [data-dlv-sim] .ite-root .bd-document-grid > div[class~="hidden"][class~="lg:flex"]{display:none}
    [data-dlv-sim] .ite-root .bd-document-form [class~="lg:hidden"]{display:block}
  }
  @container dlv (min-width: 768px){
    [data-dlv-sim] .ite-root .bd-document-room{max-width:820px;padding:14px var(--gutter) calc(112px + env(safe-area-inset-bottom))}
    [data-dlv-sim] .ite-root .bd-document-grid > div[class~="hidden"][class~="lg:flex"]{display:none}
    [data-dlv-sim] .ite-root .bd-document-form [class~="lg:hidden"]{display:block}
  }
  @container dlv (min-width: 1024px){
    [data-dlv-sim] .ite-root .bd-document-grid > div[class~="hidden"][class~="lg:flex"]{display:flex;flex-direction:column;gap:1.25rem}
    [data-dlv-sim] .ite-root .bd-document-form [class~="lg:hidden"]{display:none}
  }

  /* Compact floating controls, bottom left, clear of the form action bar. */
  .ite-dock{
    position:fixed;
    z-index:70;
    left:12px;
    bottom:calc(84px + env(safe-area-inset-bottom,0px));
    display:flex;
    align-items:center;
    gap:8px;
  }
  .ite-dock-btn{
    position:relative;
    display:grid;
    width:44px;
    height:44px;
    place-items:center;
    border:1px solid var(--glass-line);
    border-radius:14px;
    background:var(--glass-bg);
    color:var(--glass-ink);
    -webkit-backdrop-filter:blur(18px) saturate(150%);
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .ite-dock-dot{
    position:absolute;
    right:6px;
    bottom:6px;
    width:10px;
    height:10px;
    border-radius:999px;
    background:var(--swatch);
    box-shadow:0 0 0 2px var(--glass-bg);
  }
  .ite-pop{
    position:fixed;
    z-index:71;
    left:12px;
    bottom:calc(140px + env(safe-area-inset-bottom,0px));
    display:flex;
    flex-direction:column;
    gap:8px;
    width:min(340px,calc(100vw - 24px));
    max-height:calc(100dvh - 180px);
    overflow-y:auto;
    padding:8px;
    border:1px solid var(--glass-line);
    border-radius:18px;
    background:var(--glass-bg);
    color:var(--glass-ink);
    -webkit-backdrop-filter:blur(18px) saturate(150%);
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .ite-pop-group{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
  .ite-pop button{
    display:inline-flex;
    align-items:center;
    gap:7px;
    min-height:36px;
    padding:0 11px;
    border-radius:12px;
    color:var(--glass-ink);
    font-size:11px;
    font-weight:800;
    letter-spacing:.01em;
    opacity:.78;
    transition:background .16s ease,color .16s ease,opacity .16s ease;
  }
  .ite-pop button[aria-pressed="true"]{
    background:var(--chrome-ink);
    color:var(--primary-ink);
    opacity:1;
  }
  .ite-pop-dot{
    width:10px;
    height:10px;
    border-radius:999px;
    background:var(--swatch);
    box-shadow:0 0 0 2px rgba(128,128,128,.25),0 0 18px var(--swatch);
  }
  .ite-pop-close{
    justify-content:center;
    width:100%;
    border-top:1px solid var(--glass-line);
    border-radius:0 0 12px 12px;
  }
  .ite-notice{
    position:fixed;
    z-index:72;
    right:12px;
    bottom:calc(140px + env(safe-area-inset-bottom,0px));
    max-width:min(78vw,360px);
    margin:0;
    padding:10px 14px;
    border:1px solid var(--glass-line);
    border-radius:14px;
    background:var(--glass-bg);
    color:var(--chrome-ink);
    font-size:12px;
    font-weight:700;
    -webkit-backdrop-filter:blur(18px) saturate(150%);
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .ite-root .ite-dock-btn:focus-visible,
  .ite-pop :focus-visible{
    outline:2px solid var(--hero-accent);
    outline-offset:2px;
  }

  /* Tablet and desktop: the dock moves clear of the desktop rail. */
  @media (min-width:768px){
    .ite-dock{left:calc(16rem + 16px);bottom:20px}
    .ite-pop{left:calc(16rem + 16px);bottom:76px}
    .ite-notice{bottom:96px}
  }
  @media (prefers-reduced-transparency:reduce){
    .ite-dock-btn,.ite-pop,.ite-notice{
      -webkit-backdrop-filter:none;
      backdrop-filter:none;
      background:var(--scene-intro);
      color:var(--chrome-ink);
    }
  }
  @media (prefers-reduced-motion:reduce){
    .ite-dock-btn,.ite-pop button{transition:none}
  }
`
