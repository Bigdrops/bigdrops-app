/**
 * POC TEMPLATE (BIGDROPS-OWNED) — Industry Invoice on native Forme primitives.
 *
 * Structural reference: src/components/pdf/presentation/industry/IndustryTemplate.tsx
 * (read-only reference; that file was NOT modified). Section order, meta-row
 * labels, party cards, group header/footer rows, bank + totals closing,
 * notes/terms, attachments, additional fields, signature, and fixed footer
 * all mirror production. No pdfcn demo block is used anywhere here.
 *
 * The template renders PREPARED values only (see fixture-industry.ts).
 * Compact mode mirrors compactCommercialDocument spacing (paddings/margins
 * only — production compact does not shrink fonts either).
 */
import { Document, Page, View, Text, Image, Fixed, Table, Row, Cell } from "@formepdf/react";
import type { IndustryPocModel, IndustryRowModel } from "./fixture-industry.ts";

export interface IndustryDesign {
  accentColor: string | null;
  useCustomColors: boolean;
  compact: boolean;
}

export const DEFAULT_DESIGN: IndustryDesign = { accentColor: null, useCustomColors: false, compact: false };
export const ACCENT_COMPACT_DESIGN: IndustryDesign = { accentColor: "#14532d", useCustomColors: true, compact: true };

export let LOGO_DATA_URI = "";
export function setIndustryLogoDataUri(uri: string): void {
  LOGO_DATA_URI = uri;
}

const F = "Inter";
const INK = "#333333";
const MUTED = "#6b7280";
const RULE = "#e5e7eb";
const HEADER_BG = "#7d8a88";

function spacing(design: IndustryDesign) {
  return {
    pageTop: design.compact ? 12 : 14,
    pageBottom: 64,
    pageSide: design.compact ? 20 : 24,
    headerMb: design.compact ? 4 : 6,
    metaMb: design.compact ? 3 : 4,
    partyMb: design.compact ? 3 : 6,
    partyPad: design.compact ? 6 : 16,
    cellPv: design.compact ? 2.5 : 4,
    sectionMb: design.compact ? 6 : 8,
  };
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 4 }}>
      <Text style={{ width: 96, color: "#666666", fontSize: 10, fontWeight: 700, fontFamily: F }}>{label}</Text>
      <Text style={{ flex: 1, color: INK, fontSize: 10, lineHeight: 1.3, fontFamily: F }}>{value}</Text>
    </View>
  );
}

function PartyCard({ title, name, lines, accent }: { title: string; name: string; lines: string[]; accent: string | null }) {
  return (
    <View style={{ flex: 1, backgroundColor: accent ? "#eef4ef" : "#e8e8e8", borderWidth: 1, borderColor: accent ? "#14532d" : "#d4d4d4", paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, marginRight: 14, borderRadius: 3 }}>
      <Text style={{ fontSize: 14, color: "#7d8a88", marginBottom: 10, fontWeight: 700, fontFamily: F }}>{title}</Text>
      <Text style={{ fontSize: 12.5, marginBottom: 5, fontWeight: 700, color: "#1f2937", fontFamily: F }}>{name}</Text>
      {lines.map((line) => (
        <Text key={line} style={{ fontSize: 10, color: "#374151", marginBottom: 2, lineHeight: 1.35, fontFamily: F }}>{line}</Text>
      ))}
    </View>
  );
}

export function IndustryInvoiceDocument({ model, design }: { model: IndustryPocModel; design: IndustryDesign }) {
  const sp = spacing(design);
  const accent = design.useCustomColors ? design.accentColor : null;
  const headerBg = accent || HEADER_BG;
  let sn = 0;

  const renderRow = (row: IndustryRowModel, index: number) => {
    if (row.kind === "group_header") {
      return (
        <Row key={`g-${index}`}>
          <Cell colSpan={6} style={{ paddingVertical: 7, paddingHorizontal: 6, borderWidth: { top: 1, right: 0, bottom: 1, left: 0 }, borderColor: RULE, backgroundColor: "#ffffff" }}>
            <Text style={{ fontSize: 10.75, fontWeight: 700, color: "#1f2937", fontFamily: F }}>{row.label}</Text>
          </Cell>
        </Row>
      );
    }
    if (row.kind === "group_footer") {
      return (
        <Row key={`gf-${index}`}>
          <Cell colSpan={6} style={{ paddingVertical: 4, paddingHorizontal: 6, backgroundColor: "#ffffff" }}>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#1f2937", marginRight: 8, fontFamily: F }}>Subtotal</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#1f2937", fontFamily: F }}>{row.subtotal}</Text>
            </View>
          </Cell>
        </Row>
      );
    }
    sn += 1;
    const stripe = sn % 2 === 0 ? { backgroundColor: "#f8fafc" } : undefined;
    return (
      <Row key={`r-${index}`} style={stripe}>
        <Cell style={{ paddingVertical: sp.cellPv, paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 10, color: INK, textAlign: "center", fontFamily: F }}>{`${sn}`}</Text>
        </Cell>
        <Cell style={{ paddingVertical: sp.cellPv, paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 10.2, color: "#1f2937", fontWeight: 700, fontFamily: F }}>{row.description}</Text>
          <Text style={{ marginTop: 3, fontSize: 8.8, color: MUTED, fontFamily: F }}>{row.sub}</Text>
        </Cell>
        <Cell style={{ paddingVertical: sp.cellPv, paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 10, color: INK, textAlign: "right", fontFamily: F }}>{row.qty}</Text>
        </Cell>
        <Cell style={{ paddingVertical: sp.cellPv, paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 10, color: INK, fontFamily: F }}>{row.unit}</Text>
        </Cell>
        <Cell style={{ paddingVertical: sp.cellPv, paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 10, color: INK, textAlign: "right", fontFamily: F }}>{row.unitPrice}</Text>
        </Cell>
        <Cell style={{ paddingVertical: sp.cellPv, paddingHorizontal: 6 }}>
          <Text style={{ fontSize: 10, color: INK, textAlign: "right", fontFamily: F }}>{row.amount}</Text>
        </Cell>
      </Row>
    );
  };

  return (
    <Document title={model.number}>
      <Page size="A4" margin={{ top: sp.pageTop, right: sp.pageSide, bottom: sp.pageBottom, left: sp.pageSide }}>
        <Fixed position="footer">
          <View>
            <Text style={{ fontSize: 8, color: MUTED, fontFamily: F }}>{model.footerExtra}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderWidth: { top: 1, right: 0, bottom: 0, left: 0 }, borderColor: accent || "#cbd5e1", marginTop: 4, paddingTop: 4 }}>
              <Text style={{ fontSize: 8, color: MUTED, fontFamily: F }}>Page {"{{pageNumber}}"} of {"{{totalPages}}"}</Text>
              <Text style={{ fontSize: 8, color: MUTED, fontFamily: F }}>{model.number}</Text>
              <Text style={{ fontSize: 8, color: MUTED, fontFamily: F }}>{model.companyName}</Text>
            </View>
          </View>
        </Fixed>

        {/* Header: title + meta (left), logo (right). */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "stretch", marginBottom: sp.headerMb }}>
          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 18 }}>
            <Text style={{ fontSize: 27, color: "#1f2937", marginBottom: 2, letterSpacing: 1.2, fontWeight: 700, fontFamily: F }}>{model.title}</Text>
            <MetaRow label={model.numberLabel} value={model.number} />
            <MetaRow label="Issue Date" value={model.issueDate} />
            <MetaRow label="Due Date" value={model.dueDate} />
            <MetaRow label="PO Number" value={model.poNumber} />
            {model.customHeaderFields.map((field) => (
              <MetaRow key={field.label} label={field.label} value={field.value} />
            ))}
          </View>
          <View style={{ width: 96, alignItems: "flex-end", justifyContent: "flex-start" }}>
            <Image src={LOGO_DATA_URI} width={86} />
          </View>
        </View>

        {/* Party cards. */}
        <View style={{ flexDirection: "row", marginBottom: sp.partyMb }}>
          <PartyCard title="From" name={model.companyName} accent={accent} lines={[...model.companyLines, model.companyPhone, model.companyEmail, model.companyTaxId]} />
          <View style={{ flex: 1, backgroundColor: accent ? "#eef4ef" : "#e8e8e8", borderWidth: 1, borderColor: accent ? "#14532d" : "#d4d4d4", paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, borderRadius: 3 }}>
            <Text style={{ fontSize: 14, color: "#7d8a88", marginBottom: 10, fontWeight: 700, fontFamily: F }}>To</Text>
            <Text style={{ fontSize: 12.5, marginBottom: 5, fontWeight: 700, color: "#1f2937", fontFamily: F }}>{model.recipientName}</Text>
            <Text style={{ fontSize: 10, color: "#374151", marginBottom: 2, fontFamily: F }}>{model.recipientAttention}</Text>
            {model.recipientLines.map((line) => (
              <Text key={line} style={{ fontSize: 10, color: "#374151", marginBottom: 2, fontFamily: F }}>{line}</Text>
            ))}
            <Text style={{ fontSize: 10, color: "#374151", marginBottom: 2, fontFamily: F }}>{model.recipientPhone}</Text>
            <Text style={{ fontSize: 10, color: "#374151", marginBottom: 2, fontFamily: F }}>{model.recipientEmail}</Text>
          </View>
        </View>

        {/* Native invoice table. */}
        <Table columns={[
          { width: { fixed: 30 } },
          { width: { fraction: 0.41 } },
          { width: { fixed: 52 } },
          { width: { fixed: 52 } },
          { width: { fixed: 90 } },
          { width: { fixed: 98 } },
        ]}>
          <Row header style={{ backgroundColor: headerBg }}>
            {["S/N", "Description", "Qty", "Unit", "Unit Price", "Amount"].map((label) => (
              <Cell key={label} style={{ paddingVertical: 5, paddingHorizontal: 6 }}>
                <Text style={{ color: "#ffffff", fontSize: 9.5, fontWeight: 700, fontFamily: F }}>{label}</Text>
              </Cell>
            ))}
          </Row>
          {model.rows.map((row, index) => renderRow(row, index))}
        </Table>

        {/* Closing: bank + totals (kept together). */}
        <View wrap={false} style={{ flexDirection: "row", marginTop: 8 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: accent || "#d4d4d4", backgroundColor: accent ? "#eef4ef" : "#ffffff", paddingTop: 8, paddingBottom: 8, paddingHorizontal: 10, marginRight: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: accent || "#1f2937", marginBottom: 6, fontFamily: F }}>Bank Details</Text>
            <Text style={{ fontSize: 9.5, color: INK, fontFamily: F }}>Bank: {model.bank.bankName}</Text>
            <Text style={{ fontSize: 9.5, color: INK, fontFamily: F }}>Account Name: {model.bank.accountName}</Text>
            <Text style={{ fontSize: 9.5, color: INK, fontFamily: F }}>Account Number: {model.bank.accountNumber}</Text>
            <Text style={{ fontSize: 9.5, color: INK, fontFamily: F }}>Sort Code: {model.bank.sortCode}</Text>
          </View>
          <View style={{ width: 250, borderWidth: 1, borderColor: accent || "#d4d4d4", backgroundColor: accent ? "#eef4ef" : "#ffffff", paddingTop: 6, paddingBottom: 6, paddingHorizontal: 8 }}>
            {model.totalLines.map((line) => (
              <View key={line.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ fontSize: 10, color: MUTED, fontFamily: F }}>{line.label}</Text>
                <Text style={{ fontSize: 10, color: INK, fontFamily: F }}>{line.display}</Text>
              </View>
            ))}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderWidth: { top: 1, right: 0, bottom: 0, left: 0 }, borderColor: accent || "#1f2937" }}>
              <Text style={{ fontSize: 12, fontWeight: 700, color: INK, fontFamily: F }}>{model.mainTotal.label}</Text>
              <Text style={{ fontSize: 12, fontWeight: 700, color: INK, fontFamily: F }}>{model.mainTotal.display}</Text>
            </View>
            <Text style={{ fontSize: 8.5, color: MUTED, marginTop: 4, fontFamily: F }}>{model.amountInWords}</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: accent || "#1f2937" }}>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#ffffff", fontFamily: F }}>{model.balanceDue.label}</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#ffffff", fontFamily: F }}>{model.balanceDue.display}</Text>
            </View>
          </View>
        </View>

        {/* Notes / terms. */}
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: accent || "#1f2937", marginBottom: 4, fontFamily: F }}>{model.notesTitle}</Text>
          <Text style={{ fontSize: 9.5, color: INK, lineHeight: 1.4, fontFamily: F }}>{model.notes}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: accent || "#1f2937", marginBottom: 4, fontFamily: F }}>{model.termsTitle}</Text>
          <Text style={{ fontSize: 9.5, color: INK, lineHeight: 1.4, fontFamily: F }}>{model.terms}</Text>
        </View>

        {/* Attachments + additional fields. */}
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: accent || "#1f2937", marginBottom: 4, fontFamily: F }}>Attachments</Text>
          {model.attachments.map((entry) => (
            <Text key={entry.label} style={{ fontSize: 9.5, color: "#2563eb", fontFamily: F }}>{entry.label}</Text>
          ))}
        </View>
        <View style={{ marginTop: 8, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: RULE, padding: 8 }}>
          {model.additionalFields.map((field) => (
            <View key={field.label} style={{ flexDirection: "row" }}>
              <Text style={{ fontSize: 9.5, color: MUTED, width: 120, fontFamily: F }}>{field.label}</Text>
              <Text style={{ fontSize: 9.5, color: INK, fontFamily: F }}>{field.value}</Text>
            </View>
          ))}
        </View>

        {/* Signature. */}
        <View wrap={false} style={{ marginTop: 16 }}>
          <View style={{ width: 220, borderWidth: { top: 1, right: 0, bottom: 0, left: 0 }, borderColor: INK, paddingTop: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: INK, fontFamily: F }}>{model.signatureName}</Text>
            <Text style={{ fontSize: 9, color: MUTED, fontFamily: F }}>{model.signatureRole}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
