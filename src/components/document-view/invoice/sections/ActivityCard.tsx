import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "../InvoiceWorkspace.module.css";
import useAuditTrail from "@/hooks/useAuditTrail";
import type { AuditTrailEntry } from "@/domain/audit/auditTypes";

interface ActivityCardProps {
  documentId: string;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ documentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { entries, loading, error } = useAuditTrail({
    entityType: "invoice",
    entityId: documentId,
    enabled: isOpen,
  });

  return (
    <div className={styles.card}>
      <div
        role="button"
        tabIndex={0}
        className={styles.sectionHeader}
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setIsOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen((o) => !o)}
        aria-expanded={isOpen}
      >
        <div className={styles.sectionHeaderLeft}>
          <span>Activity &amp; History</span>
        </div>
        <span
          className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}
          aria-hidden="true"
        >
          <ChevronDown size={14} />
        </span>
      </div>

      {isOpen && (
        <div className={styles.itemList}>
          {loading && (
            <div className={styles.activityRow}>
              <span className={styles.activityLabel} style={{ color: "hsl(var(--bd-text-muted))" }}>Loading…</span>
            </div>
          )}
          {!loading && error && (
            <div className={styles.activityRow}>
              <span className={styles.activityLabel} style={{ color: 'hsl(var(--bd-status-danger-text))' }}>{error}</span>
            </div>
          )}
          {!loading && !error && entries.length === 0 && (
            <div className={styles.activityRow}>
              <span className={styles.activityLabel} style={{ color: "hsl(var(--bd-text-muted))" }}>No history recorded yet.</span>
            </div>
          )}
          {!loading && !error && entries.map((entry: AuditTrailEntry) => {
            const hasChanges = entry.changes && entry.changes.length > 0;
            const isExpanded = expandedId === entry.id;
            return (
              <React.Fragment key={entry.id}>
                <div
                  className={styles.activityRow}
                  style={hasChanges ? { cursor: "pointer" } : undefined}
                  onClick={() => hasChanges && setExpandedId((p) => p === entry.id ? null : entry.id)}
                >
                  <span className={styles.activityLabel}>
                    {entry.actorLabel} {entry.actionLabel}
                  </span>
                  <span style={{ fontSize: 11, color: "hsl(var(--bd-text-muted))", flexShrink: 0, fontFamily: '\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                    {entry.timestamp}
                  </span>
                </div>
                {hasChanges && isExpanded && entry.changes.map((change) => (
                  <div
                    key={change.field}
                    style={{
                      fontSize: 11,
                      color: "hsl(var(--bd-text-muted))",
                      padding: "6px 18px 6px 28px",
                      background: "hsl(var(--bd-surface-muted))",
                      borderBottom: "1px solid hsl(var(--bd-border))",
                    }}
                  >
                    <strong style={{ color: "hsl(var(--bd-text))", fontWeight: 600 }}>{change.label}</strong>
                    {": "}{change.oldValue || "—"}{" → "}{change.newValue || "—"}
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
