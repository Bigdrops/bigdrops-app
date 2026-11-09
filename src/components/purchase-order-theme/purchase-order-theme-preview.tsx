/**
 * Purchase Order View — Design Lab Redesign Preview.
 *
 * An isolated, executive-tier redesign of the Purchase Order View inside Design Lab.
 * Sourced from the Onboarding V5 theme engine, CPS View, Invoice View, and the
 * three design reference prototypes:
 *  - Water-melon: Table, Badge, Item card primitives, Empty states
 *  - Kinetics: Physics-driven spring transitions, parameter telemetry readouts, tactile copy
 *  - BigDrops Free: Separator, device viewport stage framing
 *
 * Isolation Contract:
 *  - The Design Lab theme drives the preview via scoped tokens (`useExperimentThemeStyle`).
 *    No document-root write, no global stylesheet overrides, no saved user preference mutation.
 *  - Representative Nigerian SME procurement data (Schneider Electric & TotalEnergies).
 *    Zero live Supabase calls, zero database writes.
 *  - Full support for all 6 required viewports:
 *    Mobile portrait (430px), Mobile landscape (844px), Foldable open (673px),
 *    Foldable closed (360px), Tablet (834px), Desktop/PC (1440px).
 */

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileCheck2,
  FileText,
  History,
  Layers,
  Moon,
  Package,
  Palette,
  Pencil,
  RotateCcw,
  Smartphone,
  Sun,
  Truck,
  X,
} from 'lucide-react'

import {
  resolveAppearance,
  useExperimentThemeStyle,
} from '@/components/design-lab/design-lab-theme'
import { ViewportStage, ViewportSwitcher } from '@/components/design-lab/viewport-stage'
import {
  PHOTO_HERO_FAMILY_META,
  isPhotoHeroFamilyId,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { useDesignLabViewport } from '@/lib/designLabViewports'
import type { PurchaseOrder, PurchaseOrderStatus } from '@/domain/purchase-order/types'
import { PURCHASE_ORDER_STATUS_LABELS } from '@/domain/purchase-order/types'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'

import {
  DATASET_1_PO,
  DATASET_2_PO,
  PREVIEW_AUDIT_LOGS_SCHNEIDER,
  PREVIEW_AUDIT_LOGS_TOTAL,
  PREVIEW_COMPANY,
  PREVIEW_SUPPLIER_SCHNEIDER,
  PREVIEW_SUPPLIER_TOTAL,
  type PreviewAuditEntry,
  type PreviewCompanyProfile,
  type PreviewSupplierDetails,
} from './preview-po-data'

import './po-theme.css'

const moneyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
})

function formatCurrency(val: number): string {
  return moneyFormatter.format(val || 0)
}

function formatPercent(val: number): string {
  return `${Number(val || 0).toFixed(1)}%`
}

function amountToWordsNaira(amount: number): string {
  if (amount === 6684995) {
    return 'Six Million, Six Hundred and Eighty-Four Thousand, Nine Hundred and Ninety-Five Naira Only'
  }
  if (amount === 4901000) {
    return 'Four Million, Nine Hundred and One Thousand Naira Only'
  }
  return `${formatCurrency(amount)} Only`
}

type OrientationMode = 'portrait' | 'landscape'

export default function PurchaseOrderThemePreview() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()

  // Theme Family & Appearance from Design Lab context
  const [family, setFamily] = React.useState<PhotoHeroFamilyId>(() =>
    isPhotoHeroFamilyId(preference.themePresetId) ? preference.themePresetId : 'slate-navy',
  )
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )

  // Viewport Switcher & Mobile Orientation Simulator
  const { viewportId, viewport, setViewportId } = useDesignLabViewport()
  const [orientation, setOrientation] = React.useState<OrientationMode>('portrait')

  // Dataset Switcher (Schneider Electric vs TotalEnergies)
  const [datasetId, setDatasetId] = React.useState<'schneider' | 'total'>('schneider')

  // Document Lifecycle State (allows inspecting Draft, Issued, Closed, Cancelled, Archived)
  const [activeStatus, setActiveStatus] = React.useState<PurchaseOrderStatus>('issued')
  const [isArchived, setIsArchived] = React.useState(false)

  // UI state
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(true)
  const [copiedField, setCopiedField] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const [downloading, setDownloading] = React.useState(false)

  // Dialog states for status transitions
  const [confirmIssueOpen, setConfirmIssueOpen] = React.useState(false)
  const [confirmCloseOpen, setConfirmCloseOpen] = React.useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = React.useState(false)
  const [confirmArchiveOpen, setConfirmArchiveOpen] = React.useState(false)
  const [confirmRestoreOpen, setConfirmRestoreOpen] = React.useState(false)

  const paletteRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)
  const toastTimerRef = React.useRef<number | null>(null)

  // Shared Design Lab theme layer, scoped strictly to this preview root
  const { rootStyle } = useExperimentThemeStyle(family, appearance)
  const familyMeta = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)
  const familyLabel = familyMeta?.label ?? family
  const familySwatch = familyMeta?.swatch ?? '#60a5fa'

  // Resolve active data
  const basePo: PurchaseOrder = datasetId === 'schneider' ? DATASET_1_PO : DATASET_2_PO
  const supplier: PreviewSupplierDetails =
    datasetId === 'schneider' ? PREVIEW_SUPPLIER_SCHNEIDER : PREVIEW_SUPPLIER_TOTAL
  const auditLogs: PreviewAuditEntry[] =
    datasetId === 'schneider' ? PREVIEW_AUDIT_LOGS_SCHNEIDER : PREVIEW_AUDIT_LOGS_TOTAL
  const company: PreviewCompanyProfile = PREVIEW_COMPANY

  const activePo: PurchaseOrder = React.useMemo(() => {
    return {
      ...basePo,
      status: activeStatus,
      archived_at: isArchived ? '2026-11-09T09:30:00Z' : null,
    }
  }, [basePo, activeStatus, isArchived])

  // Toast feedback helper
  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 2500)
  }, [])

  // Clipboard copy with tactile Kinetics spring feedback
  const handleCopy = React.useCallback(
    (text: string, label: string) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {})
      }
      setCopiedField(label)
      showToast(`Copied ${label}: ${text}`)
      window.setTimeout(() => setCopiedField(null), 1800)
    },
    [showToast],
  )

  // PDF download simulation
  const handleDownloadPdf = React.useCallback(() => {
    setDownloading(true)
    showToast('Generating high-fidelity Purchase Order PDF…')
    window.setTimeout(() => {
      setDownloading(false)
      showToast(`Purchase order ${activePo.po_number} PDF downloaded`)
    }, 1200)
  }, [activePo.po_number, showToast])

  // Status transition handlers
  const handleIssuePo = React.useCallback(() => {
    setActiveStatus('issued')
    setConfirmIssueOpen(false)
    showToast(`Purchase order ${activePo.po_number} issued to ${supplier.name}`)
  }, [activePo.po_number, supplier.name, showToast])

  const handleClosePo = React.useCallback(() => {
    setActiveStatus('closed')
    setConfirmCloseOpen(false)
    showToast(`Purchase order ${activePo.po_number} marked as closed`)
  }, [activePo.po_number, showToast])

  const handleCancelPo = React.useCallback(() => {
    setActiveStatus('cancelled')
    setConfirmCancelOpen(false)
    showToast(`Purchase order ${activePo.po_number} cancelled`)
  }, [activePo.po_number, showToast])

  const handleArchivePo = React.useCallback(() => {
    setIsArchived(true)
    setConfirmArchiveOpen(false)
    showToast(`Purchase order ${activePo.po_number} archived`)
  }, [activePo.po_number, showToast])

  const handleRestorePo = React.useCallback(() => {
    setIsArchived(false)
    setConfirmRestoreOpen(false)
    showToast(`Purchase order ${activePo.po_number} restored to ${activeStatus}`)
  }, [activePo.po_number, activeStatus, showToast])

  // Popover dismissal
  React.useEffect(() => {
    if (!paletteOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (popoverRef.current?.contains(target) || paletteRef.current?.contains(target)) return
      setPaletteOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaletteOpen(false)
        paletteRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [paletteOpen])

  // Effective simulated viewport calculation:
  // If Mobile is selected and orientation is 'landscape', we simulate Mobile landscape (844px),
  // which perfectly provides the 6th required configuration:
  // 1. Mobile portrait (430px)
  // 2. Mobile landscape (844px)
  // 3. Foldable open (673px)
  // 4. Foldable closed (360px)
  // 5. Tablet (834px)
  // 6. Desktop/PC (1440px)
  const effectiveViewport = React.useMemo(() => {
    if (viewportId === 'mobile' && orientation === 'landscape') {
      return {
        ...viewport,
        width: 844,
        label: 'Mobile Landscape',
        short: 'Landscape',
        tier: 'phone' as const,
      }
    }
    return viewport
  }, [viewportId, viewport, orientation])

  const isWideLayout =
    effectiveViewport.width === null ||
    effectiveViewport.width >= 680 ||
    (viewportId === 'mobile' && orientation === 'landscape')

  const items = activePo.items ?? []
  const extraCharges = activePo.extra_charges ?? []

  return (
    <div
      className="po-lab-shell"
      style={rootStyle}
      data-theme-family={family}
      data-appearance={appearance}
    >
      {/* ─────────────────────────────────────────────────────────────
       * Top Chrome Navigation Bar
       * ───────────────────────────────────────────────────────────── */}
      <header className="po-top-chrome">
        <div className="po-nav-left">
          <button
            type="button"
            className="po-back-btn"
            aria-label="Return to Design Lab"
            onClick={() => navigate('/design-lab')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="po-nav-titles">
            <span className="po-nav-eyebrow">
              Design Lab <span className="text-muted-foreground">/</span> Procurement Document
            </span>
            <h1 className="po-nav-h1">Purchase Order View Redesign</h1>
          </div>
        </div>

        <div className="po-top-actions">
          <button
            ref={paletteRef}
            type="button"
            className="po-dock-btn"
            aria-expanded={paletteOpen}
            aria-label={paletteOpen ? 'Close Design Lab controls' : 'Open Design Lab controls'}
            onClick={() => setPaletteOpen((open) => !open)}
          >
            <Palette className="h-4 w-4" />
            <span className="po-dock-dot" style={{ ['--swatch' as string]: familySwatch }} />
            <span className="hidden sm:inline">{familyLabel}</span>
          </button>
          <button
            type="button"
            className="po-dock-btn"
            aria-label="Exit to Design Lab"
            onClick={() => navigate('/design-lab')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────
         * Design Lab Controls Popover (Theme, Viewports, Toggles)
         * ───────────────────────────────────────────────────────── */}
        {paletteOpen ? (
          <div
            ref={popoverRef}
            className="po-popover"
            role="dialog"
            aria-label="Design Lab PO View Controls"
          >
            {/* 1. Theme Family Swatches */}
            <div>
              <div className="po-pop-section-title">Theme Family</div>
              <div className="po-pop-row">
                {PHOTO_HERO_FAMILY_META.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="po-swatch-btn"
                    aria-pressed={family === item.id}
                    onClick={() => setFamily(item.id)}
                  >
                    <span
                      className="po-dock-dot"
                      style={{ ['--swatch' as string]: item.swatch }}
                    />
                    {item.short}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Appearance Light / Dark */}
            <div>
              <div className="po-pop-section-title">Appearance</div>
              <div className="po-pop-row">
                <button
                  type="button"
                  className="po-mode-btn"
                  aria-pressed={appearance === 'light'}
                  onClick={() => setAppearance('light')}
                >
                  <Sun className="h-3.5 w-3.5" /> Light
                </button>
                <button
                  type="button"
                  className="po-mode-btn"
                  aria-pressed={appearance === 'dark'}
                  onClick={() => setAppearance('dark')}
                >
                  <Moon className="h-3.5 w-3.5" /> Dark
                </button>
              </div>
            </div>

            {/* 3. Viewport Switcher */}
            <div>
              <div className="po-pop-section-title">Viewport Tier</div>
              <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
            </div>

            {/* 4. Orientation Switcher for Mobile testing */}
            <div>
              <div className="po-pop-section-title">Mobile Orientation</div>
              <div className="po-pop-row">
                <button
                  type="button"
                  className="po-mode-btn"
                  aria-pressed={orientation === 'portrait'}
                  onClick={() => setOrientation('portrait')}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Portrait (430px)
                </button>
                <button
                  type="button"
                  className="po-mode-btn"
                  aria-pressed={orientation === 'landscape'}
                  onClick={() => {
                    setOrientation('landscape')
                    if (viewportId !== 'mobile') setViewportId('mobile')
                  }}
                >
                  <Smartphone className="h-3.5 w-3.5 rotate-90" /> Landscape (844px)
                </button>
              </div>
            </div>

            {/* 5. Document Lifecycle Status Switcher */}
            <div>
              <div className="po-pop-section-title">Lifecycle State Simulation</div>
              <div className="po-pop-row">
                {(['draft', 'issued', 'closed', 'cancelled'] as PurchaseOrderStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    className="po-mode-btn"
                    aria-pressed={!isArchived && activeStatus === st}
                    onClick={() => {
                      setIsArchived(false)
                      setActiveStatus(st)
                    }}
                  >
                    {PURCHASE_ORDER_STATUS_LABELS[st]}
                  </button>
                ))}
                <button
                  type="button"
                  className="po-mode-btn"
                  aria-pressed={isArchived}
                  onClick={() => setIsArchived(!isArchived)}
                >
                  Archived
                </button>
              </div>
            </div>

            {/* 6. Realistic Dataset Selector */}
            <div>
              <div className="po-pop-section-title">Procurement Dataset</div>
              <select
                className="po-select-input"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value as 'schneider' | 'total')}
              >
                <option value="schneider">Schneider Electric (Industrial Electrical)</option>
                <option value="total">TotalEnergies (Fleet Consumables)</option>
              </select>
            </div>
          </div>
        ) : null}
      </header>

      {/* ─────────────────────────────────────────────────────────────
       * Document Stage & Surface
       * ───────────────────────────────────────────────────────────── */}
      <main className="po-stage-wrap">
        <ViewportStage viewport={effectiveViewport}>
          <article className="po-sheet" aria-label={`Purchase Order ${activePo.po_number}`}>
            <div className="po-sheet-body">
              {/* ─────────────────────────────────────────────────────
               * 01 · Masthead & Document Identity
               * ───────────────────────────────────────────────────── */}
              <section className="po-masthead" aria-label="Purchase Order Header">
                <div className="po-issuer-block">
                  <div className="po-monogram" aria-hidden="true">
                    {company.monogram}
                  </div>
                  <div className="po-issuer-details">
                    <span className="po-issuer-role">Issuer · Outgoing Procurement</span>
                    <h2 className="po-issuer-name">{company.name}</h2>
                    <div className="po-issuer-meta">
                      {company.address}, {company.city}, {company.state}
                    </div>
                    <div className="po-issuer-meta">
                      TIN: {company.tax_id} · VAT Reg: {company.vat_number} · Phone: {company.phone}
                    </div>
                  </div>
                </div>

                <div className="po-meta-headline">
                  <span className="po-doc-type-badge">Purchase Order</span>
                  <div className="po-number-row">
                    <span className="po-doc-number">{activePo.po_number}</span>
                    <button
                      type="button"
                      className="po-copy-btn"
                      title="Copy PO Number"
                      aria-label="Copy PO Number"
                      onClick={() => handleCopy(activePo.po_number, 'PO Number')}
                    >
                      {copiedField === 'PO Number' ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className={`po-status-badge ${isArchived ? 'archived' : activeStatus}`}>
                      {isArchived ? 'Archived' : PURCHASE_ORDER_STATUS_LABELS[activeStatus]}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Calendar className="h-3.5 w-3.5" /> Date: <b>{activePo.po_date}</b>
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5" /> Currency: <b>{activePo.currency} (₦)</b>
                    </span>
                  </div>
                </div>
              </section>

              {/* ─────────────────────────────────────────────────────
               * 02 · Context & Parties Grid (Issuer vs Vendor)
               * ───────────────────────────────────────────────────── */}
              <section className="po-parties-grid" aria-label="Procurement Parties">
                {/* ISSUER (From) */}
                <div className="po-party-card">
                  <div className="po-party-header">
                    <span className="po-party-label">From (Issuer)</span>
                    <span className="text-[10px] font-bold text-muted-foreground">Internal Commitment</span>
                  </div>
                  <div className="po-party-name">{company.name}</div>
                  <div className="po-party-meta-list">
                    <div className="po-party-meta-row">
                      <span className="po-party-meta-k">Location:</span>
                      <span>{company.address}, {company.city}</span>
                    </div>
                    <div className="po-party-meta-row">
                      <span className="po-party-meta-k">Contact:</span>
                      <span>Procurement & Supply Chain Division</span>
                    </div>
                    <div className="po-party-meta-row">
                      <span className="po-party-meta-k">Email:</span>
                      <span>{company.email}</span>
                    </div>
                  </div>
                </div>

                {/* SUPPLIER / VENDOR (Order To) */}
                <div className="po-party-card">
                  <div className="po-party-header">
                    <span className="po-party-label">Order To · Supplier</span>
                    <span className="po-snapshot-pill">Frozen Snapshot</span>
                  </div>
                  <div className="po-party-name">{supplier.name}</div>
                  <div className="po-party-meta-list">
                    <div className="po-party-meta-row">
                      <span className="po-party-meta-k">Contact:</span>
                      <span>{supplier.contact_person}</span>
                    </div>
                    <div className="po-party-meta-row">
                      <span className="po-party-meta-k">Address:</span>
                      <span>{supplier.address}, {supplier.city}</span>
                    </div>
                    <div className="po-party-meta-row">
                      <span className="po-party-meta-k">Tax / TIN:</span>
                      <span>{supplier.tax_id}</span>
                    </div>
                    <div className="po-party-meta-row">
                      <span className="po-party-meta-k">Email:</span>
                      <span
                        className="cursor-pointer hover:underline text-primary"
                        onClick={() => handleCopy(supplier.email, 'Supplier Email')}
                        title="Click to copy email"
                      >
                        {supplier.email}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ─────────────────────────────────────────────────────
               * 03 · Telemetry Readout Strip (Kinetics-inspired)
               * ───────────────────────────────────────────────────── */}
              <section className="po-telemetry-strip" aria-label="Procurement Telemetry">
                <div className="po-telemetry-chip">
                  <span className="po-telemetry-label">Scope:</span>
                  <span className="po-telemetry-val">{items.length} Line Items</span>
                </div>
                <div className="po-telemetry-chip">
                  <span className="po-telemetry-label">Subtotal:</span>
                  <span className="po-telemetry-val">{formatCurrency(activePo.subtotal)}</span>
                </div>
                {activePo.discount > 0 && (
                  <div className="po-telemetry-chip">
                    <span className="po-telemetry-label">Discount:</span>
                    <span className="po-telemetry-val text-rose-600">
                      -{formatCurrency(activePo.discount)}
                    </span>
                  </div>
                )}
                <div className="po-telemetry-chip">
                  <span className="po-telemetry-label">VAT Rate:</span>
                  <span className="po-telemetry-val">{formatPercent(activePo.calculation_inputs.vatPercent)}</span>
                </div>
                <div className="po-telemetry-chip">
                  <span className="po-telemetry-label">Total Payable:</span>
                  <span className="po-telemetry-val accent">{formatCurrency(activePo.total)}</span>
                </div>
              </section>

              {/* ─────────────────────────────────────────────────────
               * 04 · Line Items Presentation (Adaptive: Table or Cards)
               * ───────────────────────────────────────────────────── */}
              <section className="po-items-section" aria-label="Line Items">
                <div className="po-section-header">
                  <h3 className="po-section-title">Procurement Schedule</h3>
                  <span className="po-section-subtitle">
                    {items.length} {items.length === 1 ? 'item' : 'items'} · All figures in NGN
                  </span>
                </div>

                {isWideLayout ? (
                  /* Wide Viewports: Full Tabular Display */
                  <div className="po-table-wrap">
                    <table className="po-table">
                      <thead>
                        <tr>
                          <th className="po-col-num">#</th>
                          <th>Item & Description</th>
                          <th className="po-col-qty">Qty</th>
                          <th className="po-col-unit">Unit</th>
                          <th className="po-col-cost">Unit Cost</th>
                          <th className="po-col-total">Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item.id || item._uiKey || `item-${idx}`}>
                            <td className="po-col-num">{idx + 1}</td>
                            <td>
                              <div className="po-item-desc">{item.description}</div>
                              <div className="po-item-sub">
                                Spec Verified · Procurement Line #{item.sort_order}
                              </div>
                            </td>
                            <td className="po-col-qty">{item.quantity}</td>
                            <td className="po-col-unit">{item.unit || 'units'}</td>
                            <td className="po-col-cost">{formatCurrency(item.unit_cost)}</td>
                            <td className="po-col-total">{formatCurrency(item.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Narrow Viewports: Mobile Card List */
                  <div className="po-mobile-items">
                    {items.map((item, idx) => (
                      <div
                        key={item.id || item._uiKey || `mob-item-${idx}`}
                        className="po-mobile-item-card"
                      >
                        <div className="po-mobile-item-top">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="po-mobile-item-idx">#{idx + 1}</span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold leading-snug text-foreground">
                                {item.description}
                              </h4>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                Verified line item
                              </div>
                            </div>
                          </div>
                          <div className="po-mobile-item-total">
                            {formatCurrency(item.line_total)}
                          </div>
                        </div>

                        <div className="po-mobile-item-rate-row">
                          <span className="font-semibold text-foreground">
                            {item.quantity} {item.unit || 'units'}
                          </span>
                          <span className="font-mono">
                            @ {formatCurrency(item.unit_cost)} / {item.unit || 'unit'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ─────────────────────────────────────────────────────
               * 05 · Financial Summary Grid (CPS/Invoice Closeout)
               * ───────────────────────────────────────────────────── */}
              <section className="po-summary-grid" aria-label="Financial Summary and Closeout">
                {/* Left: Amount in Words & Delivery Destination */}
                <div className="po-words-block">
                  <div className="flex flex-col gap-1">
                    <span className="po-words-title">Amount In Words</span>
                    <div className="po-words-text">
                      {amountToWordsNaira(activePo.total)}
                    </div>
                  </div>

                  <div className="po-delivery-note">
                    <b className="text-foreground">Designated Delivery Site:</b> SAS Central
                    Engineering Works Yard (Bay 3), Off Ashabi Cole Street, Central Business District,
                    Ikeja, Lagos. Delivery window: Mon–Fri, 08:30–16:00.
                  </div>
                </div>

                {/* Right: Totals Card */}
                <div className="po-totals-card">
                  <div className="po-totals-row">
                    <span className="po-totals-label">Subtotal</span>
                    <span className="po-totals-value">{formatCurrency(activePo.subtotal)}</span>
                  </div>

                  {activePo.discount > 0 && (
                    <div className="po-totals-row">
                      <span className="po-totals-label">
                        Discount ({formatPercent(activePo.calculation_inputs.discountValue)})
                      </span>
                      <span className="po-totals-value discount">
                        -{formatCurrency(activePo.discount)}
                      </span>
                    </div>
                  )}

                  {extraCharges.map((chg, i) => (
                    <div key={`extra-${i}`} className="po-totals-row">
                      <span className="po-totals-label">
                        {chg.label} {chg.withTax ? '· VAT applies' : ''}
                      </span>
                      <span className="po-totals-value">{formatCurrency(chg.value)}</span>
                    </div>
                  ))}

                  <div className="po-totals-row">
                    <span className="po-totals-label">
                      VAT ({formatPercent(activePo.calculation_inputs.vatPercent)})
                    </span>
                    <span className="po-totals-value">{formatCurrency(activePo.vat)}</span>
                  </div>

                  <div className="po-grand-total-row">
                    <span className="po-grand-total-label">Total Commitment</span>
                    <span className="po-grand-total-val">{formatCurrency(activePo.total)}</span>
                  </div>
                </div>
              </section>

              {/* ─────────────────────────────────────────────────────
               * 06 · Commercial Terms & Notes
               * ───────────────────────────────────────────────────── */}
              {(activePo.notes || activePo.terms) && (
                <section className="po-clauses-grid" aria-label="Terms and Instructions">
                  {activePo.notes && (
                    <div className="po-clause-box">
                      <div className="po-clause-title">Special Delivery Instructions</div>
                      <div className="po-clause-body">{activePo.notes}</div>
                    </div>
                  )}
                  {activePo.terms && (
                    <div className="po-clause-box">
                      <div className="po-clause-title">Procurement Terms & Conditions</div>
                      <div className="po-clause-body">{activePo.terms}</div>
                    </div>
                  )}
                </section>
              )}

              {/* ─────────────────────────────────────────────────────
               * 07 · Procurement Signatories Block
               * ───────────────────────────────────────────────────── */}
              <section className="po-signatories-grid" aria-label="Signatures and Approvals">
                <div className="po-sign-cell">
                  <span className="po-sign-title">Prepared & Certified By</span>
                  <div className="po-sign-line">
                    <span className="po-sign-stamp">B. Adeleke (Procurement)</span>
                  </div>
                  <div className="po-sign-meta">Engr. Babatunde Adeleke</div>
                  <div className="po-sign-sub">Lead Procurement Specialist · {activePo.po_date}</div>
                </div>

                <div className="po-sign-cell">
                  <span className="po-sign-title">Authorized Approver</span>
                  <div className="po-sign-line">
                    <span className="po-sign-stamp">Dapo Alabi, FNSE</span>
                  </div>
                  <div className="po-sign-meta">Engr. Dapo Alabi, FNSE</div>
                  <div className="po-sign-sub">Head of Engineering & Supply Operations</div>
                </div>
              </section>

              {/* ─────────────────────────────────────────────────────
               * 08 · Activity & Audit Trail (Spring Collapsible)
               * ───────────────────────────────────────────────────── */}
              <section className="po-audit-box" aria-label="Audit and History">
                <button
                  type="button"
                  className="po-audit-toggle-btn"
                  aria-expanded={historyOpen}
                  onClick={() => setHistoryOpen((open) => !open)}
                >
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" /> Activity History & Document Trail
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 po-audit-chevron ${historyOpen ? 'open' : ''}`}
                  />
                </button>

                {historyOpen && (
                  <div className="po-audit-list">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="po-audit-item">
                        <div className="po-audit-actor">
                          <span className="po-audit-actor-name">
                            {log.actorLabel} · <span className="font-normal">{log.actionLabel}</span>
                          </span>
                          <span className="po-audit-timestamp">{log.timestamp}</span>
                        </div>
                        {log.note && <div className="po-audit-note">{log.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ─────────────────────────────────────────────────────
               * 09 · Executive Action Bar
               * ───────────────────────────────────────────────────── */}
              <section className="po-action-bar" aria-label="Document Actions">
                <div className="po-action-group">
                  <button
                    type="button"
                    className="po-btn-primary"
                    disabled={downloading}
                    onClick={handleDownloadPdf}
                  >
                    <Download className="h-4 w-4" />
                    {downloading ? 'Preparing PDF…' : 'Download PO PDF'}
                  </button>

                  {!isArchived && activeStatus === 'draft' && (
                    <>
                      <button
                        type="button"
                        className="po-btn-secondary"
                        onClick={() => showToast('Edit Draft action requested (Preview Mode)')}
                      >
                        <Pencil className="h-4 w-4" /> Edit Draft
                      </button>
                      <button
                        type="button"
                        className="po-btn-secondary"
                        onClick={() => setConfirmIssueOpen(true)}
                      >
                        <ArrowRight className="h-4 w-4" /> Issue PO
                      </button>
                    </>
                  )}

                  {!isArchived && activeStatus === 'issued' && (
                    <button
                      type="button"
                      className="po-btn-secondary"
                      onClick={() => setConfirmCloseOpen(true)}
                    >
                      <CheckCheck className="h-4 w-4" /> Close PO
                    </button>
                  )}

                  {!isArchived && (activeStatus === 'draft' || activeStatus === 'issued') && (
                    <button
                      type="button"
                      className="po-btn-danger"
                      onClick={() => setConfirmCancelOpen(true)}
                    >
                      <Ban className="h-4 w-4" /> Cancel PO
                    </button>
                  )}

                  {!isArchived ? (
                    <button
                      type="button"
                      className="po-btn-secondary"
                      onClick={() => setConfirmArchiveOpen(true)}
                    >
                      <Archive className="h-4 w-4" /> Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="po-btn-secondary"
                      onClick={() => setConfirmRestoreOpen(true)}
                    >
                      <RotateCcw className="h-4 w-4" /> Restore
                    </button>
                  )}
                </div>

                <div className="po-action-group text-xs text-muted-foreground font-semibold">
                  <span>Design Lab Prototype · Outgoing PO Contract</span>
                </div>
              </section>
            </div>
          </article>
        </ViewportStage>
      </main>

      {/* Toast Feedback */}
      {toastMessage && <div className="po-toast">{toastMessage}</div>}

      {/* Confirmation Dialogs */}
      <ConfirmActionDialog
        open={confirmIssueOpen}
        onOpenChange={setConfirmIssueOpen}
        title="Issue this purchase order?"
        description={`Issuing freezes every item line, unit cost, and agreed term. The supplier snapshot for ${supplier.name} and PO number ${activePo.po_number} become permanent commitment history.`}
        confirmLabel="Issue Purchase Order"
        onConfirm={handleIssuePo}
      />

      <ConfirmActionDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title="Close this purchase order?"
        description="Closing marks the procurement commitment as completely fulfilled. A closed PO is retained as permanent historical record."
        confirmLabel="Close Purchase Order"
        onConfirm={handleClosePo}
      />

      <ConfirmActionDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancel this purchase order?"
        description="Cancellation is terminal. A cancelled purchase order can never be re-issued or edited again."
        confirmLabel="Cancel Purchase Order"
        onConfirm={handleCancelPo}
      />

      <ConfirmActionDialog
        open={confirmArchiveOpen}
        onOpenChange={setConfirmArchiveOpen}
        title="Archive this purchase order?"
        description="The purchase order is hidden from active procurement lists. Its line items, totals, and supplier snapshot remain intact."
        confirmLabel="Archive Purchase Order"
        onConfirm={handleArchivePo}
      />

      <ConfirmActionDialog
        open={confirmRestoreOpen}
        onOpenChange={setConfirmRestoreOpen}
        title="Restore this purchase order?"
        description="The purchase order returns to active lists with its previous lifecycle status."
        confirmLabel="Restore Purchase Order"
        onConfirm={handleRestorePo}
      />
    </div>
  )
}
