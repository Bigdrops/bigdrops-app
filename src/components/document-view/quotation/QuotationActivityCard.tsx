import React, { useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import styles from "../invoice/InvoiceWorkspace.module.css";
import useAuditTrail from "@/hooks/useAuditTrail";
import type { AuditTrailEntry } from "@/domain/audit/auditTypes";

interface QuotationActivityCardProps {
  documentId: string;
}

export const QuotationActivityCard: React.FC<QuotationActivityCardProps> = ({
  documentId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { entries, loading, error } = useAuditTrail({
    entityType: "quotation",
    entityId: documentId,
    enabled: isOpen,
  });

  const toggleEntry = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className={styles.card}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        className={styles.sectionHeader}
        onClick={() => setIsOpen((o) => !o)}
      >
        <div className={styles.sectionHeaderLeft}>
          <Activity size={16} />
          <span>Activity &amp; History</span>
        </div>
        <div
          className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ""}`}
        >
          <ChevronDown size={14} />
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className={styles.itemList}>
          {/* Loading */}
          {loading && (
            <div className={styles.itemRow}>
              <span style={{ fontSize: 13, color: "var(--slate)" }}>
                Loading history…
              </span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className={styles.itemRow}>
              <span style={{ fontSize: 13, color: "#c0392b" }}>{error}</span>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && entries.length === 0 && (
            <div className={styles.activityRow}>
              <span style={{ fontSize: 13, color: "var(--slate)" }}>
                No history recorded yet.
              </span>
            </div>
          )}

          {/* Entries */}
          {!loading &&
            !error &&
            entries.map((entry: AuditTrailEntry) => {
              const hasChanges = entry.changes && entry.changes.length > 0;
              const isExpanded = expandedId === entry.id;

              return (
                <React.Fragment key={entry.id}>
                  <div
                    className={styles.activityRow}
                    style={{ borderBottom: "1px solid var(--steel-gray)" }}
                    onClick={() => hasChanges && toggleEntry(entry.id)}
                  >
                    <span className={styles.activityLabel}>
                      {entry.actorLabel}&nbsp;{entry.actionLabel}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--slate)",
                        flexShrink: 0,
                        marginLeft: 12,
                      }}
                    >
                      {entry.timestamp}
                    </span>
                  </div>

                  {/* Change detail rows */}
                  {hasChanges &&
                    isExpanded &&
                    entry.changes.map((change) => (
                      <div
                        key={change.field}
                        style={{
                          fontSize: 11,
                          color: "var(--slate)",
                          padding: "4px 18px",
                          background: "var(--fog-gray)",
                          borderBottom: "1px solid var(--steel-gray)",
                        }}
                      >
                        <strong style={{ color: "var(--ink-blue)" }}>
                          {change.label}
                        </strong>
                        {": "}
                        {change.oldValue || "—"}
                        {" → "}
                        {change.newValue || "—"}
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
