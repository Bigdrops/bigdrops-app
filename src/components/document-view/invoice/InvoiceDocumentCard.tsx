import React from "react";
import { Hash, Calendar, FileText } from "lucide-react";
import styles from "../shared/DocumentPreview.module.css";
import { formatDisplayDate } from "@/lib/formatters/date";
import { formatNaira } from "@/lib/formatters/money";
import { resolveCanonicalLogoUrl } from "@/domain/documentMedia";
import DocumentBrandBlock from "../shared/DocumentBrandBlock";
import DocumentMetaChips from "../shared/DocumentMetaChips";

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
  const companyLines: string[] = Array.isArray(previewModel?.companyPreviewLines) ? previewModel.companyPreviewLines : [];
  const clientLines: string[] = Array.isArray(previewModel?.clientPreviewLines) ? previewModel.clientPreviewLines : [];
  const detailRows: any[] = Array.isArray(previewModel?.previewDetailRows) ? previewModel.previewDetailRows : [];
  const previewItems: any[] = Array.isArray(previewModel?.previewItems) ? previewModel.previewItems : [];
  const poRow = detailRows.find((row: any) => row?.label === 'PO Number');

  return (
    <div className={styles.invCard} data-orientation={previewModel?.pageLayout?.orientation || "portrait"}>
      <div className={styles.invTop}>
        <div className={styles.brandBlock}>
          <DocumentBrandBlock
            logoUrl={resolvedLogoUrl}
            companyName={companyName || ""}
            className={styles.brandLogo}
            imgClassName={styles.brandLogoImg}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {companyName && <div className={styles.brandName}>{companyName}</div>}
            {companySub && <div className={styles.brandSub}>{companySub}</div>}
            {companyLines.length > 0 && companyLines.map((line, i) => (
              <div key={i} style={{ fontSize: 11, color: "hsl(var(--bd-text-muted))", marginTop: i === 0 ? 4 : 0, lineHeight: 1.4 }}>{line}</div>
            ))}
          </div>
        </div>
        <div className={styles.statusPill}>{status}</div>
      </div>

      <div className={styles.invBody}>
        {invoice?.invoice_title && (
          <h1 className={styles.invTitle}>{invoice.invoice_title}</h1>
        )}
        <DocumentMetaChips
          className={styles.metaChips}
          itemClassName={styles.metaChip}
          items={[
            ...(invoice?.invoice_number ? [{ icon: Hash, label: "Invoice Number", value: invoice.invoice_number }] : []),
            ...(invoice?.issue_date ? [{ icon: Calendar, label: "Issue Date", value: `Issued ${formatDisplayDate(invoice.issue_date)}` }] : []),
            ...(poRow?.value ? [{ icon: FileText, label: "PO Number", value: `PO: ${poRow.value}` }] : []),
          ]}
        />
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoCell}>
          <div className={styles.infoLabel}>Client</div>
          <div className={styles.infoValue}>{invoice?.client_name || "—"}</div>
          {clientLines.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: "hsl(var(--bd-text-muted))", lineHeight: 1.5 }}>
              {clientLines.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}
        </div>
        <div className={styles.infoCell}>
          <div className={styles.infoLabel}>Amount Due</div>
          <div className={styles.infoValue}>{previewModel?.previewBalanceDue?.value || formatNaira(viewModel?.balanceDue || 0)}</div>
        </div>
        {detailRows.filter((row: any) => row?.label !== 'PO Number').length > 0 && (
          <div className={styles.infoCell}>
            <div className={styles.infoLabel}>Details</div>
            {detailRows
              .filter((row: any) => row?.label !== 'PO Number')
              .map((row: any, index: number) => (
                <div key={index} style={{ fontSize: 12, color: "hsl(var(--bd-text))", lineHeight: 1.6 }}>
                  <span style={{ color: "hsl(var(--bd-text-muted))" }}>{row.label}:</span>{" "}
                  {String(row?.value || '').trim() || "—"}
                </div>
              ))}
          </div>
        )}
      </div>

      <div className={styles.itemList}>
        {previewItems.map((item, index) => {
          if (item?.type === "group") {
            return (
              <div key={`group-${index}`} className={styles.itemRow}>
                <div className={styles.itemBody}>
                  <div className={styles.itemName}>{item?.label || "Group"}</div>
                </div>
              </div>
            );
          }

          if (item?.type === "group_footer") {
            return (
              <div key={`group-footer-${index}`} className={styles.itemRow}>
                <div className={styles.itemBody} />
                <div className={styles.itemAmount}>{item?.showSubtotal ? item?.value || "" : ""}</div>
              </div>
            );
          }

          return (
            <div key={`line-${index}`} className={styles.itemRow}>
              <div className={styles.itemNum}>{(index + 1).toString().padStart(2, "0")}</div>
              <div className={styles.itemBody}>
                <div className={styles.itemName}>{item?.label || "Item"}</div>
                {item?.detail && <div className={styles.itemSub}>{item.detail}</div>}
                <div className={styles.itemMeta}>
                  {(item?.facts || []).filter(Boolean).map((fact: string, factIndex: number) => (
                    <span key={factIndex} className={styles.itemPill}>{fact}</span>
                  ))}
                </div>
                {item?.imageUrl && (
                  <img
                    className={styles.itemThumb}
                    src={item.imageUrl}
                    alt={item?.label || "Item image"}
                    loading="lazy"
                  />
                )}
              </div>
              <div className={styles.itemAmount}>{item?.value || ""}</div>
            </div>
          );
        })}
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
        <div className={styles.signatoryBlock}>
          {signatory.signatureUrl ? (
            <img src={signatory.signatureUrl} alt="Signature" className={styles.signatoryImage} />
          ) : (
            <div className={styles.signatoryFallback}>Authorized Signature</div>
          )}
          <div>
            <div className={styles.signatoryName}>{signatory.name}</div>
            {signatory.role && <div className={styles.signatoryRole}>{signatory.role}</div>}
          </div>
        </div>
      )}
    </div>
  );
};
