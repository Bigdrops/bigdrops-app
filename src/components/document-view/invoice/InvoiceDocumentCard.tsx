import React from "react";
import { Hash, Calendar, FileText } from "lucide-react";
import styles from "../shared/DocumentPreview.module.css";
import { formatDisplayDate } from "@/lib/formatters/date";
import { formatNaira } from "@/lib/formatters/money";
import { resolveCanonicalItemImageUrl, resolveCanonicalLogoUrl } from "@/domain/documentMedia";

interface InvoiceDocumentCardProps {
  invoice: any;
  items: any[];
  previewModel: any;
  viewModel: any;
  logoUrl?: string | null;
  companyName?: string;
  companySub?: string;
  settings?: any;
}

export const InvoiceDocumentCard: React.FC<InvoiceDocumentCardProps> = ({
  invoice,
  items,
  previewModel,
  viewModel,
  logoUrl,
  companyName,
  companySub,
  settings,
}) => {
  const status = invoice?.status?.toUpperCase() || "UNPAID";
  const totals: any[] = Array.isArray(previewModel?.previewTotals) ? previewModel.previewTotals : [];
  const signatory = previewModel?.signatory || null;
  const resolvedLogoUrl = logoUrl || resolveCanonicalLogoUrl(settings);
  const detailRows: any[] = Array.isArray(previewModel?.previewDetailRows) ? previewModel.previewDetailRows : [];
  const poRow = detailRows.find((row: any) => row?.label === 'PO Number');

  return (
    <div className={styles.invCard}>
      <div className={styles.invTop}>
        <div className={styles.brandBlock}>
          {resolvedLogoUrl && (
            <div className={styles.brandLogo}>
              <img src={resolvedLogoUrl} alt={companyName || "Logo"} className={styles.brandLogoImg} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {companyName && <div className={styles.brandName}>{companyName}</div>}
            {companySub && <div className={styles.brandSub}>{companySub}</div>}
          </div>
        </div>
        <div className={styles.statusPill}>{status}</div>
      </div>

      <div className={styles.invBody}>
        {invoice?.invoice_title && (
          <h1 className={styles.invTitle}>{invoice.invoice_title}</h1>
        )}
        <div className={styles.metaChips}>
          {invoice?.invoice_number && (
            <div className={styles.metaChip}>
              <Hash size={12} />
              <span>{invoice.invoice_number}</span>
            </div>
          )}
          {invoice?.issue_date && (
            <div className={styles.metaChip}>
              <Calendar size={12} />
              <span>Issued {formatDisplayDate(invoice.issue_date)}</span>
            </div>
          )}
          {poRow?.value ? (
            <div className={styles.metaChip}>
              <FileText size={12} />
              <span>PO: {poRow.value}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoCell}>
          <div className={styles.infoLabel}>Client</div>
          <div className={styles.infoValue}>{invoice?.client_name || "—"}</div>
        </div>
        <div className={styles.infoCell}>
          <div className={styles.infoLabel}>Amount Due</div>
          <div className={styles.infoValue}>{previewModel?.previewBalanceDue?.value || formatNaira(viewModel?.balanceDue || 0)}</div>
        </div>
      </div>

      <div className={styles.itemList}>
        {items.map((item, index) => (
          <div key={item.id || index} className={styles.itemRow}>
            <div className={styles.itemNum}>{(index + 1).toString().padStart(2, "0")}</div>
            <div className={styles.itemBody}>
              <div className={styles.itemName}>{item.description}</div>
              {item.sub_description && <div className={styles.itemSub}>{item.sub_description}</div>}
              <div className={styles.itemMeta}>
                {item.quantity != null && (
                  <span className={styles.itemPill}>
                    Qty: <strong>{item.quantity}{item.unit ? ` ${item.unit}` : ""}</strong>
                  </span>
                )}
                {item.unit_price != null && (
                  <span className={styles.itemPill}>
                    Rate: <strong>{formatNaira(item.unit_price)}</strong>
                  </span>
                )}
              </div>
              {resolveCanonicalItemImageUrl(item) && (
                <img
                  className={styles.itemThumb}
                  src={resolveCanonicalItemImageUrl(item)!}
                  alt={item.description || "Item image"}
                  loading="lazy"
                />
              )}
            </div>
            <div className={styles.itemAmount}>{formatNaira(item.amount)}</div>
          </div>
        ))}
      </div>

      <div className={styles.totalsList}>
        {totals.map((row: any, index: number) => {
          if (row?.emphasis) {
            return (
              <React.Fragment key={index}>
                <div className={styles.totalsDivider} />
                <div className={styles.totalsGrand}>
                  <span className={styles.lbl}>{row.label}</span>
                  <span className={styles.val}>{row.value}</span>
                </div>
              </React.Fragment>
            );
          }
          return (
            <div key={index} className={styles.totalsRow}>
              <span className={styles.lbl}>{row.label}</span>
              <span className={styles.val}>{row.value}</span>
            </div>
          );
        })}
        {previewModel?.previewAmountInWords && (
          <div className={styles.amountWords}>{previewModel.previewAmountInWords}</div>
        )}
      </div>

      {signatory && (
        <div style={{ borderTop: "1px solid hsl(var(--bd-border))", padding: "16px 18px", display: "flex", gap: "16px", alignItems: "flex-start" }}>
          {signatory.signatureUrl ? (
            <img src={signatory.signatureUrl} alt="Signature" style={{ maxHeight: 80, width: "auto", display: "block" }} />
          ) : (
            <div style={{ fontStyle: "italic", color: "hsl(var(--bd-text-muted))" }}>Authorized Signature</div>
          )}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--bd-text))" }}>{signatory.name}</div>
            {signatory.role && <div style={{ fontSize: 12, color: "hsl(var(--bd-text-muted))", marginTop: 2 }}>{signatory.role}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
