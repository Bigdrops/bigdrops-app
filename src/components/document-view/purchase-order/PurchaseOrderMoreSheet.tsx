/**
 * Purchase Order — More actions sheet (production).
 *
 * Structure promoted from the approved Design Lab redesign: grouped sections,
 * registry-style icon tiles, trailing captions, and a separated destructive
 * zone. Every action here maps to a real production behavior — no local
 * simulation.
 */

import React from 'react'
import {
  Archive,
  ArchiveRestore,
  Ban,
  Copy,
  History,
  Printer,
} from 'lucide-react'

import DocumentSheet from '../shared/DocumentSheet'
import localStyles from './PurchaseOrderView.module.css'

export default function PurchaseOrderMoreSheet({
  open,
  onClose,
  poNumber,
  archived,
  canEdit,
  onPrint,
  onCopyReference,
  onViewActivity,
  onArchiveToggle,
  onCancel,
}: {
  open: boolean
  onClose: () => void
  poNumber: string
  archived: boolean
  canEdit: boolean
  onPrint: () => void
  onCopyReference: () => void
  onViewActivity: () => void
  onArchiveToggle: () => void
  onCancel: () => void
}) {
  return (
    <DocumentSheet open={open} title="More actions" subtitle={poNumber} onClose={onClose}>
      <div className={localStyles.sheetBody}>
        <div className={localStyles.sheetSectionLabel}>Document</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <button type="button" className={localStyles.channelRow} onClick={onPrint}>
            <div className={localStyles.channelTile} style={{ background: 'hsl(var(--bd-surface-muted))' }}>
              <Printer size={17} aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={localStyles.channelLabel}>Print document</div>
              <div className={localStyles.channelCaption}>Opens the print dialog for this order</div>
            </div>
          </button>

          <button type="button" className={localStyles.channelRow} onClick={onCopyReference}>
            <div className={localStyles.channelTile} style={{ background: 'hsl(var(--bd-surface-muted))' }}>
              <Copy size={17} aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={localStyles.channelLabel}>Copy PO reference</div>
              <div className={localStyles.channelCaption}>{poNumber}</div>
            </div>
          </button>

          <button
            type="button"
            className={localStyles.channelRow}
            onClick={() => {
              onClose()
              onViewActivity()
            }}
          >
            <div className={localStyles.channelTile} style={{ background: 'hsl(var(--bd-surface-muted))' }}>
              <History size={17} aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={localStyles.channelLabel}>View activity</div>
              <div className={localStyles.channelCaption}>History and audit trail for this order</div>
            </div>
          </button>

          <button type="button" className={localStyles.channelRow} onClick={onArchiveToggle} disabled={!canEdit}>
            <div className={localStyles.channelTile} style={{ background: 'hsl(var(--bd-surface-muted))' }}>
              {archived ? <ArchiveRestore size={17} aria-hidden="true" /> : <Archive size={17} aria-hidden="true" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={localStyles.channelLabel}>{archived ? 'Restore purchase order' : 'Archive purchase order'}</div>
              <div className={localStyles.channelCaption}>
                {archived ? 'Returns the order to active purchase lists' : 'Hides it from active lists; restores later'}
              </div>
            </div>
          </button>
        </div>

        <div className={localStyles.sheetSectionLabel}>Destructive</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <button
            type="button"
            className={localStyles.channelRow}
            style={{ borderColor: 'hsl(var(--bd-status-danger-border))' }}
            onClick={() => {
              onClose()
              onCancel()
            }}
            disabled={!canEdit}
          >
            <div className={localStyles.channelTile} style={{ background: 'hsl(var(--bd-status-danger-bg))', color: 'hsl(var(--bd-status-danger-text))' }}>
              <Ban size={17} aria-hidden="true" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={localStyles.channelLabel} style={{ color: 'hsl(var(--bd-status-danger-text))' }}>
                Cancel purchase order
              </div>
              <div className={localStyles.channelCaption}>Terminal — cannot be reactivated or edited</div>
            </div>
          </button>
        </div>
      </div>
    </DocumentSheet>
  )
}
