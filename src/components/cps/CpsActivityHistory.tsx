import { useState } from 'react'
import { ChevronDown, FileOutput, History, Image as ImageIcon, RefreshCw } from 'lucide-react'

import useAuditTrail from '@/hooks/useAuditTrail'
import type {
  AuditRelatedDocument,
  AuditTrailChange,
  AuditTrailChangeGroup,
  AuditTrailEntry,
} from '@/domain/audit/auditTypes'

import './cps-activity-history.css'

const AUTO_EXPAND_LIMIT = 3

function relatedLabel(document: AuditRelatedDocument): string {
  const kind =
    document.type === 'quotation' ? 'Quotation' : document.type === 'invoice' ? 'Invoice' : 'CPS'
  return `${kind} ${document.number}`
}

function ImageChange({ change }: { change: AuditTrailChange }) {
  const hasReferences = Boolean(change.oldImageUrl || change.newImageUrl)
  return (
    <>
      <span className="cps-ah-imgbadge">
        <ImageIcon size={12} aria-hidden="true" /> Image changed
      </span>
      {hasReferences ? (
        <details className="cps-ah-imgrefs">
          <summary>Image references</summary>
          <div className="cps-ah-imglist">
            {change.oldImageUrl ? (
              <a href={change.oldImageUrl} target="_blank" rel="noopener noreferrer">
                Previous image
              </a>
            ) : (
              <span>No previous image</span>
            )}
            {change.newImageUrl ? (
              <a href={change.newImageUrl} target="_blank" rel="noopener noreferrer">
                New image
              </a>
            ) : (
              <span>Image removed</span>
            )}
          </div>
        </details>
      ) : null}
    </>
  )
}

function ChangeRow({ change }: { change: AuditTrailChange }) {
  return (
    <div className="cps-ah-change">
      <span className="cps-ah-field">{change.label}</span>
      {change.kind === 'image' ? (
        <ImageChange change={change} />
      ) : change.oldValue == null ? (
        <span className="cps-ah-new">{change.newValue ?? '—'}</span>
      ) : (
        <>
          <span className="cps-ah-old">{change.oldValue ?? '—'}</span>
          <span className="cps-ah-arrow" aria-hidden="true">
            →
          </span>
          <span className="cps-ah-new">{change.newValue ?? '—'}</span>
        </>
      )}
    </div>
  )
}

function ChangeGroups({ groups }: { groups: AuditTrailChangeGroup[] }) {
  return (
    <div className="cps-ah-groups">
      {groups.map((group) => (
        <div className="cps-ah-group" key={group.key}>
          {group.scope === 'row' ? <div className="cps-ah-group-label">{group.label}</div> : null}
          {group.changes.map((change) => (
            <ChangeRow key={`${group.key}:${change.field}`} change={change} />
          ))}
        </div>
      ))}
    </div>
  )
}

function ActivityEvent({ entry }: { entry: AuditTrailEntry }) {
  const groups = entry.changeGroups || []
  const changeCount = groups.reduce((total, group) => total + group.changes.length, 0)
  const canExpand = changeCount > AUTO_EXPAND_LIMIT
  const [expanded, setExpanded] = useState(!canExpand)

  return (
    <li className="cps-ah-item">
      <div className="cps-ah-title">{entry.actionLabel}</div>
      {entry.detail ? <div className="cps-ah-detail">{entry.detail}</div> : null}
      <div className="cps-ah-meta">
        <span className="cps-ah-actor" data-actor={entry.actorType || 'user'}>
          {entry.actorLabel}
        </span>
        <span className="cps-ah-time">{entry.timestamp}</span>
      </div>
      {entry.relatedDocument ? (
        <div className="cps-ah-context">
          <FileOutput size={12} aria-hidden="true" />
          <span className="num">{relatedLabel(entry.relatedDocument)}</span>
        </div>
      ) : null}
      {/* The chain id identifies which conversion this event belongs to when a
          CPS has been converted more than once, and the parent event id links
          an automatic CPS update to the downstream edit that caused it.
          Technical detail only: it stays behind a disclosure and is never
          primary content. */}
      {entry.chainId || entry.parentEventId ? (
        <details className="cps-ah-chain">
          <summary>Conversion chain</summary>
          {entry.chainId ? (
            <span className="cps-ah-chain-id">{entry.chainId}</span>
          ) : null}
          {entry.parentEventId ? (
            <span className="cps-ah-chain-id">
              <span className="cps-ah-chain-label">Triggered by event</span>
              {entry.parentEventId}
            </span>
          ) : null}
        </details>
      ) : null}
      {groups.length > 0 && canExpand ? (
        <button
          type="button"
          className="cps-ah-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          <ChevronDown
            size={14}
            aria-hidden="true"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }}
          />
          {expanded ? 'Hide changes' : `Show ${changeCount} changes`}
        </button>
      ) : null}
      {groups.length > 0 && expanded ? <ChangeGroups groups={groups} /> : null}
    </li>
  )
}

function LoadingSkeleton() {
  return (
    <div className="cps-ah-skel" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="cps-ah-skel-row" key={index}>
          <div className="cps-ah-skel-line" />
          <div className="cps-ah-skel-line short" />
        </div>
      ))}
    </div>
  )
}

export function CpsActivityHistory({ documentId }: { documentId?: string | null }) {
  const [open, setOpen] = useState(false)
  const canLoad = open && Boolean(documentId)

  const { entries, loading, error, refetch } = useAuditTrail({
    entityType: 'cps_sheets',
    entityId: documentId ?? null,
    enabled: canLoad,
  })

  return (
    <section className="cps-ah" aria-label="Activity and history">
      <button
        type="button"
        className="cps-ah-head"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="cps-ah-head-main">
          <History size={16} aria-hidden="true" /> Activity &amp; History
        </span>
        <ChevronDown size={16} className={`cps-ah-chevron${open ? ' open' : ''}`} aria-hidden="true" />
      </button>

      {open ? (
        <div className="cps-ah-body">
          {loading ? <LoadingSkeleton /> : null}

          {!loading && error ? (
            <div className="cps-ah-error" role="alert">
              <span className="cps-ah-error-msg">{error}</span>
              <button type="button" className="cps-ah-retry" onClick={() => void refetch()}>
                <RefreshCw size={13} aria-hidden="true" /> Retry
              </button>
            </div>
          ) : null}

          {!loading && !error && entries.length === 0 ? (
            <div className="cps-ah-empty">No activity recorded yet.</div>
          ) : null}

          {!loading && !error && entries.length > 0 ? (
            <ul className="cps-ah-timeline">
              {entries.map((entry) => (
                <ActivityEvent key={entry.id} entry={entry} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default CpsActivityHistory
