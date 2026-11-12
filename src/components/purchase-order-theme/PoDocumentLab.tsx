/**
 * Purchase Order Document View — Design Lab page content.
 *
 * Route: `/design-lab/po-view` (mounted by PoThemeExperiment).
 *
 * Isolation contract:
 *  - Design Lab theme drives the page through one scoped token layer on
 *    `.podlab-root`. No document-root write, no global stylesheet rule,
 *    no change to the saved user preference.
 *  - Specimen data is the static fixture in `po-document-fixtures.ts`. No
 *    tenant data, no network, no database.
 *  - Lifecycle transitions in the PO view mutate local React state only.
 *  - The "Invoice (reference)" mode mounts the production Invoice document
 *    card with the same figures and artifacts, so the new concept can be
 *    compared against the current Invoice presentation in identical viewports.
 */

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  LayoutGrid,
  Moon,
  Palette,
  ShoppingBag,
  Sun,
  X,
} from 'lucide-react'

import {
  resolveAppearance,
  useExperimentThemeStyle,
} from '@/components/design-lab/design-lab-theme'
import { ViewportStage, ViewportSwitcher } from '@/components/design-lab/viewport-stage'
import { InvoiceDocumentCard } from '@/components/document-view/invoice/InvoiceDocumentCard'
import {
  PHOTO_HERO_FAMILY_META,
  isPhotoHeroFamilyId,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { useDesignLabViewport } from '@/lib/designLabViewports'
import { buildInvoicePreviewModel } from '@/domain/invoice/previewModel'

import PoDocumentView from './PoDocumentView'
import {
  PREVIEW_CLIENT,
  PREVIEW_COMPANY,
  PREVIEW_INVOICE,
  PREVIEW_INVOICE_ITEMS,
  PREVIEW_SETTINGS,
} from './po-document-fixtures'

const moneyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const formatMoney = (value: number) => moneyFormatter.format(value || 0)

type CompareMode = 'po' | 'invoice'

export default function PoDocumentLab() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()

  const [family, setFamily] = React.useState<PhotoHeroFamilyId>(() =>
    isPhotoHeroFamilyId(preference.themePresetId) ? preference.themePresetId : 'slate-navy',
  )
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )
  const { viewportId, viewport, setViewportId } = useDesignLabViewport()

  const [mode, setMode] = React.useState<CompareMode>('po')
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const paletteRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)

  const { rootStyle } = useExperimentThemeStyle(family, appearance)

  const invoicePreviewModel = React.useMemo(
    () =>
      buildInvoicePreviewModel({
        invoice: {
          custom_fields: { pdfTemplateId: 'industry' },
          invoice_title: PREVIEW_INVOICE.invoice_title,
          document_type: 'INVOICE',
          client_name: PREVIEW_INVOICE.client_name,
          payment_terms: 'Net 30',
          subtotal: PREVIEW_INVOICE.subtotal,
          discount: PREVIEW_INVOICE.discount,
          vat: PREVIEW_INVOICE.vat,
          total: PREVIEW_INVOICE.total,
          notes: PREVIEW_INVOICE.notes,
          terms: PREVIEW_INVOICE.terms,
        },
        items: PREVIEW_INVOICE_ITEMS,
        client: PREVIEW_CLIENT,
        settings: PREVIEW_SETTINGS,
        bankAccounts: [],
        customFieldObject: { notesTitle: 'Notes', termsTitle: 'Terms and Conditions' },
        signatory: { name: 'Adaeze Nwosu', role: 'Head of Procurement', signatureUrl: '' },
        poNumber: PREVIEW_INVOICE.po_reference,
        invoiceTotal: PREVIEW_INVOICE.total,
        cashReceived: 0,
        balanceDue: PREVIEW_INVOICE.total,
        totals: {
          rawSubtotal: PREVIEW_INVOICE.subtotal,
          discountAmount: PREVIEW_INVOICE.discount,
          vatAmount: PREVIEW_INVOICE.vat,
        },
        formatMoney,
      }),
    [],
  )

  // Close the palette on Escape / outside tap.
  React.useEffect(() => {
    if (!paletteOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPaletteOpen(false)
    }
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (popoverRef.current?.contains(target)) return
      if (paletteRef.current?.contains(target)) return
      setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('touchstart', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('touchstart', onPointer)
    }
  }, [paletteOpen])

  const familyMeta = PHOTO_HERO_FAMILY_META.find((meta) => meta.id === family)

  return (
    <div
      className="podlab-root"
      data-podlab-mode={mode}
      data-podlab-appearance={appearance}
      style={rootStyle}
    >
      <style>{PODLAB_CSS}</style>

      <ViewportStage viewport={viewport}>
        {mode === 'po' ? (
          <PoDocumentView />
        ) : (
          <div className="podlab-invoice-host">
            <div className="podlab-specimen-caption">
              <span className="podlab-specimen-dot" style={{ background: 'hsl(var(--bd-status-info-text))' }} />
              Invoice view (reference) · {PREVIEW_INVOICE.invoice_number} · identical figures
            </div>
            <InvoiceDocumentCard
              invoice={{ ...PREVIEW_INVOICE }}
              items={PREVIEW_INVOICE_ITEMS}
              previewModel={invoicePreviewModel}
              viewModel={{
                invoiceTotal: PREVIEW_INVOICE.total,
                cashReceived: 0,
                balanceDue: PREVIEW_INVOICE.total,
              }}
              logoUrl={null}
              companyName={PREVIEW_COMPANY.name}
              companySub={PREVIEW_COMPANY.tagline}
              settings={PREVIEW_SETTINGS}
            />
          </div>
        )}
      </ViewportStage>

      {/* Compact dock: mode switch + theme palette trigger */}
      <div className="podlab-dock">
        <button
          type="button"
          className={`podlab-dock-btn podlab-mode-btn${mode === 'po' ? ' podlab-mode-active' : ''}`}
          onClick={() => setMode('po')}
          aria-pressed={mode === 'po'}
          title="Purchase Order concept"
        >
          <ShoppingBag size={17} strokeWidth={1.9} aria-hidden="true" />
          <span className="podlab-dock-label">PO</span>
        </button>
        <button
          type="button"
          className={`podlab-dock-btn podlab-mode-btn${mode === 'invoice' ? ' podlab-mode-active' : ''}`}
          onClick={() => setMode('invoice')}
          aria-pressed={mode === 'invoice'}
          title="Invoice view (reference)"
        >
          <FileText size={17} strokeWidth={1.9} aria-hidden="true" />
          <span className="podlab-dock-label">Invoice</span>
        </button>
        <button
          type="button"
          className="podlab-dock-btn"
          onClick={() => setAppearance((value) => (value === 'light' ? 'dark' : 'light'))}
          aria-label={appearance === 'light' ? 'Switch to dark appearance' : 'Switch to light appearance'}
          title={appearance === 'light' ? 'Dark appearance' : 'Light appearance'}
        >
          {appearance === 'light' ? (
            <Moon size={17} strokeWidth={1.9} aria-hidden="true" />
          ) : (
            <Sun size={17} strokeWidth={1.9} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="podlab-dock-btn"
          onClick={() => navigate('/design-lab')}
          aria-label="Back to Design Lab"
          title="Back to Design Lab"
        >
          <LayoutGrid size={17} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <button
          ref={paletteRef}
          type="button"
          className="podlab-dock-btn"
          aria-expanded={paletteOpen}
          aria-controls="podlab-palette"
          aria-label={paletteOpen ? 'Close theme palette' : 'Open theme palette'}
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <Palette size={17} strokeWidth={1.9} aria-hidden="true" />
          <span
            className="podlab-dock-dot"
            style={{ ['--swatch' as string]: familyMeta?.swatch ?? '#60a5fa' }}
            aria-hidden="true"
          />
        </button>
      </div>

      {paletteOpen && (
        <div
          ref={popoverRef}
          id="podlab-palette"
          role="dialog"
          aria-label="Experiment theme palette"
          className="podlab-pop"
        >
          <div className="podlab-pop-head">
            <div className="podlab-pop-title">Theme &amp; viewport</div>
            <button
              type="button"
              className="podlab-pop-close"
              onClick={() => {
                setPaletteOpen(false)
                paletteRef.current?.focus()
              }}
              aria-label="Close palette"
            >
              <X size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
          <div className="podlab-pop-section">
            <div className="podlab-pop-label">Family</div>
            <div className="podlab-swatches" role="radiogroup" aria-label="Theme family">
              {PHOTO_HERO_FAMILY_META.map((meta) => {
                const selected = meta.id === family
                return (
                  <button
                    key={meta.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`podlab-swatch${selected ? ' selected' : ''}`}
                    style={{ ['--swatch' as string]: meta.swatch }}
                    onClick={() => setFamily(meta.id)}
                  >
                    <span className="podlab-swatch-fill" aria-hidden="true" />
                    <span className="podlab-swatch-name">{meta.short}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="podlab-pop-section">
            <div className="podlab-pop-label">Viewport</div>
            <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
          </div>
          <div className="podlab-pop-note">
            Purchase Order concept · Invoice-view foundation · static specimen data
          </div>
        </div>
      )}
    </div>
  )
}

const PODLAB_CSS = `
.podlab-root{position:relative;min-height:100dvh}
/* Design Lab canvas: atmospheric scene replaces the flat page background. */
.podlab-root .dlv-stage{background-color:transparent;background-image:var(--scene-intro);background-attachment:fixed;background-size:cover}
.podlab-root[data-podlab-appearance="dark"] .dlv-stage{background-image:var(--scene-intro)}
.podlab-invoice-host{position:relative;z-index:1;max-width:640px;margin-inline:auto;padding:16px 16px 96px}
.podlab-specimen-caption{display:flex;align-items:center;gap:8px;margin:6px 2px 12px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:hsl(var(--bd-text-muted))}
.podlab-specimen-dot{width:8px;height:8px;border-radius:999px;display:inline-block}

/* Dock — anchored above the download FAB on the right, clearing the paper column. */
.podlab-dock{position:fixed;right:16px;bottom:calc(88px + env(safe-area-inset-bottom, 0px));z-index:25;display:flex;gap:8px;align-items:center;justify-content:flex-end}
.podlab-dock-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:44px;height:44px;padding:0 10px;border-radius:14px;border:1px solid hsl(var(--bd-border) / .6);background:hsl(var(--bd-overlay-bg, var(--bd-surface)) / .82);backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);color:hsl(var(--bd-text));cursor:pointer;transition:transform .12s ease,background .16s ease;box-shadow:0 6px 18px rgba(0,0,0,.18)}
.podlab-dock-btn:hover{background:hsl(var(--bd-overlay-bg, var(--bd-surface)) / .94)}
.podlab-dock-btn:active{transform:scale(.94)}
.podlab-dock-btn:focus-visible{outline:2px solid hsl(var(--bd-status-info-text));outline-offset:2px}
.podlab-dock-dot{position:absolute;right:6px;top:6px;width:9px;height:9px;border-radius:999px;background:var(--swatch,#60a5fa);box-shadow:0 0 0 2px hsl(var(--bd-surface))}
.podlab-dock-label{font-size:11px;font-weight:700;letter-spacing:.02em}
.podlab-mode-btn{padding:0 14px}
.podlab-mode-active{background:hsl(var(--bd-status-info-bg));color:hsl(var(--bd-status-info-text));border-color:hsl(var(--bd-status-info-border))}
.podlab-mode-active:hover{background:hsl(var(--bd-status-info-bg))}

/* Palette popover */
.podlab-pop{position:fixed;right:16px;left:auto;bottom:150px;z-index:26;width:290px;border-radius:18px;border:1px solid hsl(var(--bd-border) / .6);background:hsl(var(--bd-overlay-bg, var(--bd-surface)) / .92);backdrop-filter:blur(16px) saturate(150%);-webkit-backdrop-filter:blur(16px) saturate(150%);padding:14px;display:grid;gap:14px;box-shadow:0 18px 48px rgba(0,0,0,.28)}
.podlab-pop-head{display:flex;align-items:center;justify-content:space-between}
.podlab-pop-title{font-size:12px;font-weight:700;color:hsl(var(--bd-text))}
.podlab-pop-close{border:none;background:transparent;color:hsl(var(--bd-text-muted));padding:4px;border-radius:8px;cursor:pointer}
.podlab-pop-close:hover{background:hsl(var(--bd-surface-muted))}
.podlab-pop-section{display:grid;gap:8px}
.podlab-pop-label{font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:hsl(var(--bd-text-muted))}
.podlab-pop-note{font-size:10px;color:hsl(var(--bd-text-muted));line-height:1.5;border-top:1px solid hsl(var(--bd-border) / .4);padding-top:10px}
.podlab-swatches{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
.podlab-swatch{display:grid;gap:5px;justify-items:center;align-items:center;padding:8px 2px 7px;border-radius:12px;border:1px solid transparent;background:transparent;cursor:pointer}
.podlab-swatch:hover{background:hsl(var(--bd-surface-muted))}
.podlab-swatch.selected{border-color:hsl(var(--bd-status-info-border));background:hsl(var(--bd-status-info-bg))}
.podlab-swatch-fill{width:26px;height:26px;border-radius:999px;background:var(--swatch);box-shadow:inset 0 0 0 2px rgba(255,255,255,.35)}
.podlab-swatch-name{font-size:9px;font-weight:600;color:hsl(var(--bd-text-muted))}
.podlab-swatch.selected .podlab-swatch-name{color:hsl(var(--bd-status-info-text))}

@media (min-width: 1200px){
  .podlab-dock{right:24px;bottom:calc(88px + env(safe-area-inset-bottom, 0px))}
  .podlab-pop{right:24px;left:auto;bottom:150px}
}
@media (max-width: 1100px){
  .podlab-dock-label{display:none}
  .podlab-dock-btn{min-width:40px;height:40px;padding:0 9px}
}
@media (max-width: 767px){
  /* Clear the production bottom navigation bar in the phone tier; stack vertically above the FAB. */
  .podlab-dock{right:8px;bottom:calc(84px + env(safe-area-inset-bottom, 0px) + 72px);flex-direction:column;align-items:flex-end}
  .podlab-pop{right:8px;left:auto;bottom:212px}
}
@media (prefers-reduced-motion: reduce){
  .podlab-dock-btn{transition:none}
}
`
