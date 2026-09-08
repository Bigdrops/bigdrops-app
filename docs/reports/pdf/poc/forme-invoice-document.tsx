/**
 * POC ADAPTER (FORME) — prepared BIGDROPS presentation model → Forme JSX.
 *
 * Same contract as the Takumi POC adapter: NO financial math. Every
 * displayed value arrives pre-rendered in PocPreparedModel (see fixture.ts,
 * sourced from production computeDocument() + formatNaira()).
 *
 * Two documents:
 * 1. FormePdfcnInvoiceDocument — vendored pdfcn Forme components
 *    (variant="bordered") plus a row-enumeration (S/N) column, which the
 *    Takumi POC lacked.
 * 2. FormeNativeTableDocument — native Forme Table/Row/Cell with an
 *    auto-repeating header row, a colSpan group-header row, and zebra
 *    striping. Control for engine-vs-abstraction header behavior.
 */
import { Document, Page, View, Text as FormeText, Image, Fixed, Table as NativeTable, Row as NativeRow, Cell as NativeCell } from "@formepdf/react";
import { PdfcnThemeProvider } from "./vendor-forme/theme-provider.tsx";
import { professionalTheme } from "./vendor/professional.ts";
import type { PdfcnTheme } from "./vendor/pdf-theme-types.ts";
import { View as PdfView, Text as PrimitiveText } from "./vendor-forme/pdf-primitives.tsx";
import { Text } from "./vendor-forme/text.tsx";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "./vendor-forme/table.tsx";
import type { PocPreparedModel } from "./fixture.ts";

/** Logo as a data URI (built by the runner from poc/assets/poc-logo.png). */
export let LOGO_DATA_URI = "";
export function setLogoDataUri(uri: string): void {
  LOGO_DATA_URI = uri;
}

/**
 * pdfcn professional theme retargeted at registered fonts.
 * Upstream defaults reference Helvetica/Times-Roman. Forme ships those as
 * non-embedded standard fonts; the POC maps both slots to Inter (registered
 * from local woff bytes) so embedding and weights are actually tested.
 */
export const formePocTheme: PdfcnTheme = {
  ...professionalTheme,
  typography: {
    ...professionalTheme.typography,
    body: { ...professionalTheme.typography.body, fontFamily: "Inter" },
    heading: { ...professionalTheme.typography.heading, fontFamily: "Inter" },
  },
};

const rule = { borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "#e4e4e7" };

function TotalsBlock({ model }: { model: PocPreparedModel }) {
  return (
    <PdfView style={{ breakInside: "avoid", alignItems: "flex-end", marginTop: 8 }}>
      {model.totals.map((row) => (
        <PdfView key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", width: 280 }}>
          <PrimitiveText style={{ fontFamily: "Inter", fontSize: 11, color: "#18181b", fontWeight: row.emphasis ? 700 : 400 }}>
            {row.label}
          </PrimitiveText>
          <PrimitiveText style={{ fontFamily: "Inter", fontSize: 11, color: "#18181b", fontWeight: row.emphasis ? 700 : 400 }}>
            {row.display}
          </PrimitiveText>
        </PdfView>
      ))}
    </PdfView>
  );
}

function DocFooter({ companyName }: { companyName: string }) {
  return (
    <Fixed position="footer">
      <PdfView style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <PrimitiveText style={{ fontFamily: "Inter", fontSize: 9, color: "#71717a" }}>{companyName}</PrimitiveText>
        <PrimitiveText style={{ fontFamily: "Inter", fontSize: 9, color: "#71717a" }}>
          Page {"{{pageNumber}}"} of {"{{totalPages}}"}
        </PrimitiveText>
      </PdfView>
    </Fixed>
  );
}

export function FormePdfcnInvoiceDocument({ model, landscape = false }: { model: PocPreparedModel; landscape?: boolean }) {
  return (
    <PdfcnThemeProvider theme={formePocTheme}>
      <Document title={model.number}>
        <Page size={landscape ? { width: 841.89, height: 595.28 } : "A4"} margin={{ top: 56, right: 48, bottom: 56, left: 48 }}>
          <DocFooter companyName={model.companyName} />
          <PdfView style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <PdfView style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Image src={LOGO_DATA_URI} width={90} />
              <PdfView>
                <Text variant="lg" weight="bold" noMargin>{model.issuerName}</Text>
                {model.issuerLines.map((line) => (
                  <Text key={line} variant="xs" color="mutedForeground" noMargin>{line}</Text>
                ))}
                <Text variant="xs" color="mutedForeground" noMargin>{model.issuerPhone}</Text>
                <Text variant="xs" color="mutedForeground" noMargin>{model.issuerEmail}</Text>
                <Text variant="xs" color="mutedForeground" noMargin>{model.issuerTaxId}</Text>
              </PdfView>
            </PdfView>
            <PdfView style={{ alignItems: "flex-end" }}>
              <Text variant="2xl" weight="bold" align="right" noMargin>{model.title}</Text>
              <Text variant="sm" weight="semibold" align="right" noMargin>{model.number}</Text>
              <Text variant="xs" color="mutedForeground" align="right" noMargin>Issue: {model.issueDate}</Text>
              <Text variant="xs" color="mutedForeground" align="right" noMargin>Due: {model.dueDate}</Text>
            </PdfView>
          </PdfView>

          <PdfView style={{ ...rule, marginTop: 12, marginBottom: 12 }} />

          <PdfView style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <PdfView>
              <Text variant="xs" weight="semibold" transform="uppercase" color="mutedForeground" noMargin>Bill To</Text>
              <Text variant="base" weight="semibold" noMargin>{model.recipientName}</Text>
              <Text variant="xs" color="mutedForeground" noMargin>{model.recipientAttention}</Text>
              {model.recipientLines.map((line) => (
                <Text key={line} variant="xs" color="mutedForeground" noMargin>{line}</Text>
              ))}
              <Text variant="xs" color="mutedForeground" noMargin>{model.recipientPhone}</Text>
              <Text variant="xs" color="mutedForeground" noMargin>{model.recipientEmail}</Text>
            </PdfView>
            <PdfView style={{ alignItems: "flex-end" }}>
              <Text variant="xs" color="mutedForeground" noMargin>Currency: {model.currency}</Text>
              <Text variant="xs" color="mutedForeground" noMargin>{model.tagline}</Text>
            </PdfView>
          </PdfView>

          <PdfView style={{ marginTop: 16 }}>
            <Table variant="bordered">
              <TableHeader>
                <TableRow header>
                  <TableCell align="center" width={36}>S/N</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right" width={44}>Qty</TableCell>
                  <TableCell width={56}>Unit</TableCell>
                  <TableCell align="right" width={92}>Unit Price</TableCell>
                  <TableCell align="right" width={100}>Amount</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {model.rows.map((row, index) => (
                  <TableRow key={row.key}>
                    <TableCell align="center">{`${index + 1}`}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell align="right">{row.qty}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell align="right">{row.unitPrice}</TableCell>
                    <TableCell align="right">{row.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PdfView>

          <TotalsBlock model={model} />

          <PdfView style={{ marginTop: 16 }}>
            <Text variant="sm" weight="semibold" noMargin>{model.notesTitle}</Text>
            <Text variant="xs" color="mutedForeground">{model.notes}</Text>
            <Text variant="sm" weight="semibold" noMargin>{model.termsTitle}</Text>
            <Text variant="xs" color="mutedForeground">{model.terms}</Text>
          </PdfView>

          <PdfView style={{ marginTop: 24, flexDirection: "row", justifyContent: "space-between" }}>
            <PdfView style={{ width: 220 }}>
              <PdfView style={{ ...rule, marginBottom: 4 }} />
              <Text variant="xs" color="mutedForeground" noMargin>Authorised Signature</Text>
            </PdfView>
            <Text variant="xs" color="mutedForeground" noMargin>{model.footerText}</Text>
          </PdfView>
        </Page>
      </Document>
    </PdfcnThemeProvider>
  );
}

const nativeHead: any = { fontFamily: "Inter", fontSize: 10, fontWeight: 700, color: "#ffffff" };
const nativeCell: any = { fontFamily: "Inter", fontSize: 10, color: "#18181b" };
const nativeNum: any = { ...nativeCell, textAlign: "right" };
const nativePad: any = { padding: 6 };

export function FormeNativeTableDocument({ model }: { model: PocPreparedModel }) {
  const mid = Math.floor(model.rows.length / 2);
  const head: Array<{ label: string; align: "left" | "center" | "right" }> = [
    { label: "S/N", align: "center" },
    { label: "Description", align: "left" },
    { label: "Qty", align: "right" },
    { label: "Unit", align: "left" },
    { label: "Unit Price", align: "right" },
    { label: "Amount", align: "right" },
  ];
  return (
    <Document title={`${model.number}-native`}>
      <Page size="A4" margin={{ top: 56, right: 48, bottom: 56, left: 48 }}>
        <Fixed position="footer">
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: "Inter", fontSize: 9, color: "#71717a" }}>{model.companyName}</Text>
            <Text style={{ fontFamily: "Inter", fontSize: 9, color: "#71717a" }}>
              Page {"{{pageNumber}}"} of {"{{totalPages}}"}
            </Text>
          </View>
        </Fixed>
        <View>
          <Text style={{ fontFamily: "Inter", fontSize: 18, fontWeight: 700 }}>
            {model.title} {model.number} (native table)
          </Text>
        </View>
        <NativeTable
          columns={[
            { width: { fixed: 32 } },
            { width: { fraction: 0.35 } },
            { width: { fixed: 48 } },
            { width: { fixed: 56 } },
            { width: { fixed: 88 } },
            { width: { fixed: 96 } },
          ]}
        >
          <NativeRow header style={{ backgroundColor: "#18181b" }}>
            {head.map((h) => (
              <NativeCell key={h.label} style={nativePad}>
                <FormeText style={{ ...nativeHead, textAlign: h.align }}>{h.label}</FormeText>
              </NativeCell>
            ))}
          </NativeRow>
          {model.rows.slice(0, mid).map((row, index) => (
            <NativeRow key={row.key} style={index % 2 === 1 ? { backgroundColor: "#f4f4f5" } : undefined}>
              <NativeCell style={nativePad}><FormeText style={{ ...nativeCell, textAlign: "center" }}>{`${index + 1}`}</FormeText></NativeCell>
              <NativeCell style={nativePad}><FormeText style={nativeCell}>{row.description}</FormeText></NativeCell>
              <NativeCell style={nativePad}><FormeText style={nativeNum}>{row.qty}</FormeText></NativeCell>
              <NativeCell style={nativePad}><FormeText style={nativeCell}>{row.unit}</FormeText></NativeCell>
              <NativeCell style={nativePad}><FormeText style={nativeNum}>{row.unitPrice}</FormeText></NativeCell>
              <NativeCell style={nativePad}><FormeText style={nativeNum}>{row.amount}</FormeText></NativeCell>
            </NativeRow>
          ))}
          <NativeRow>
            <NativeCell colSpan={6} style={{ ...nativePad, backgroundColor: "#f4f4f5" }}>
              <FormeText style={{ ...nativeCell, fontWeight: 700 }}>GROUP: General Goods — continued</FormeText>
            </NativeCell>
          </NativeRow>
          {model.rows.slice(mid).map((row, rel) => {
            const index = mid + rel;
            return (
              <NativeRow key={row.key} style={index % 2 === 1 ? { backgroundColor: "#f4f4f5" } : undefined}>
                <NativeCell style={nativePad}><FormeText style={{ ...nativeCell, textAlign: "center" }}>{`${index + 1}`}</FormeText></NativeCell>
                <NativeCell style={nativePad}><FormeText style={nativeCell}>{row.description}</FormeText></NativeCell>
                <NativeCell style={nativePad}><FormeText style={nativeNum}>{row.qty}</FormeText></NativeCell>
                <NativeCell style={nativePad}><FormeText style={nativeCell}>{row.unit}</FormeText></NativeCell>
                <NativeCell style={nativePad}><FormeText style={nativeNum}>{row.unitPrice}</FormeText></NativeCell>
                <NativeCell style={nativePad}><FormeText style={nativeNum}>{row.amount}</FormeText></NativeCell>
              </NativeRow>
            );
          })}
        </NativeTable>
        <View wrap={false} style={{ alignItems: "flex-end", marginTop: 8 }}>
          {model.totals.map((row) => (
            <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", width: 280 }}>
              <Text style={{ fontFamily: "Inter", fontSize: 11, fontWeight: row.emphasis ? 700 : 400 }}>{row.label}</Text>
              <Text style={{ fontFamily: "Inter", fontSize: 11, fontWeight: row.emphasis ? 700 : 400 }}>{row.display}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
