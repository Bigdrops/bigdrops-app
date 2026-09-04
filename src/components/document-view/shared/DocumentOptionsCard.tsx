import React, { useState } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import styles from "../invoice/InvoiceWorkspace.module.css";
import type { PdfOutputSettingsValue } from "@/components/PdfOutputSettings";
import { Switch } from "@/components/ui/switch";

interface DocumentOptionsCardProps {
  pdfOutput?: Partial<PdfOutputSettingsValue>;
  onOutputChange?: (next: PdfOutputSettingsValue) => void;
  onToggleMergeQtyUnit?: () => void;
  mergeQtyUnit?: boolean;
  onCustomize?: () => void;
  /** Hide mergeQtyUnit row (quotation doesn't use it) */
  hideMergeQty?: boolean;
  /** Hide balance-due row (quotation PDFs have no balance-due concept) */
  hideBalanceDue?: boolean;
}

function defaults(v?: Partial<PdfOutputSettingsValue>): PdfOutputSettingsValue {
  return {
    showBankDetails: v?.showBankDetails ?? true,
    bankAccountId: v?.bankAccountId ?? null,
    showFooter: v?.showFooter ?? true,
    showTagline: v?.showTagline ?? true,
    showBalanceDue: v?.showBalanceDue ?? false,
    showAmountInWords: v?.showAmountInWords ?? true,
    compact: v?.compact ?? false,
  };
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, checked, onToggle }: ToggleRowProps) {
  return (
    <div className={styles.optRow}>
      <span className={styles.optLabel}>{label}</span>
      <Switch
        size="sm"
        checked={checked}
        onCheckedChange={onToggle}
      />
    </div>
  );
}

export const DocumentOptionsCard: React.FC<DocumentOptionsCardProps> = ({
  pdfOutput,
  onOutputChange,
  onToggleMergeQtyUnit,
  mergeQtyUnit,
  onCustomize,
  hideMergeQty = false,
  hideBalanceDue = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const state = defaults(pdfOutput);

  function patch(key: keyof PdfOutputSettingsValue, value: boolean) {
    onOutputChange?.({ ...state, [key]: value });
  }

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
          <span>Document Options</span>
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
          <ToggleRow
            label="Show Bank Details"
            checked={state.showBankDetails}
            onToggle={() => patch("showBankDetails", !state.showBankDetails)}
          />
          <ToggleRow
            label="Show Tagline"
            checked={state.showTagline}
            onToggle={() => patch("showTagline", !state.showTagline)}
          />
          <ToggleRow
            label="Show Footer"
            checked={state.showFooter}
            onToggle={() => patch("showFooter", !state.showFooter)}
          />
          {!hideBalanceDue && (
            <ToggleRow
              label="Show Balance Due"
              checked={state.showBalanceDue}
              onToggle={() => patch("showBalanceDue", !state.showBalanceDue)}
            />
          )}
          <ToggleRow
            label="Show Amount in Words"
            checked={state.showAmountInWords}
            onToggle={() => patch("showAmountInWords", !state.showAmountInWords)}
          />
          {!hideMergeQty && onToggleMergeQtyUnit && (
            <ToggleRow
              label="Merge Qty &amp; Unit in PDF Table"
              checked={!!mergeQtyUnit}
              onToggle={onToggleMergeQtyUnit}
            />
          )}
          {onCustomize && (
            <button className={styles.optCustomizeBtn} type="button" onClick={onCustomize}>
              <Settings2 size={13} />
              Customize Template &amp; Colors
            </button>
          )}
        </div>
      )}
    </div>
  );
};
