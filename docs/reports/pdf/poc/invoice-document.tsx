/**
 * POC ADAPTER — prepared BIGDROPS presentation model → Takumi/pdfcn JSX.
 *
 * The adapter performs NO financial math. Every displayed value arrives
 * pre-rendered in PocPreparedModel (see fixture.ts, sourced from
 * production computeDocument() + formatNaira()).
 */
import { PdfcnThemeProvider } from "./vendor/theme-provider.tsx";
import { professionalTheme } from "./vendor/professional.ts";
import type { PdfcnTheme } from "./vendor/pdf-theme-types.ts";
import { Document, Page, View, Text as PrimitiveText, Image as PdfImage } from "./vendor/pdf-primitives.tsx";
import { Text } from "./vendor/text.tsx";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "./vendor/table.tsx";
import type { PocPreparedModel } from "./fixture.ts";

/** Image key matched by the Takumi `images` option in render-poc.ts. */
export const LOGO_SRC = "poc-logo.png";

/**
 * pdfcn professional theme retargeted at Takumi-registered fonts.
 * Upstream defaults reference PDF-standard names (Helvetica, Times-Roman)
 * which Takumi cannot resolve without explicit registration, so the POC
 * maps both slots to the registered Inter family. Verbatim theme tokens
 * are preserved in vendor/professional.ts.
 */
export const pocTheme: PdfcnTheme = {
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
    <View style={{ breakInside: "avoid", alignItems: "flex-end", marginTop: 8 }}>
      {model.totals.map((row) => (
        <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", width: 280 }}>
          <PrimitiveText style={{ fontFamily: "Inter", fontSize: 11, color: "#18181b", fontWeight: row.emphasis ? 700 : 400 }}>
            {row.label}
          </PrimitiveText>
          <PrimitiveText style={{ fontFamily: "Inter", fontSize: 11, color: "#18181b", fontWeight: row.emphasis ? 700 : 400 }}>
            {row.display}
          </PrimitiveText>
        </View>
      ))}
    </View>
  );
}

export function PocInvoiceDocument({ model }: { model: PocPreparedModel }) {
  return (
    <PdfcnThemeProvider theme={pocTheme}>
      <Document title={model.number}>
        <Page size="A4">
          {/* Header: logo + issuer (left), document identity (right). */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <PdfImage src={LOGO_SRC} style={{ width: 120 }} />
              <View>
                <Text variant="lg" weight="bold" noMargin>{model.issuerName}</Text>
                {model.issuerLines.map((line) => (
                  <Text key={line} variant="xs" color="mutedForeground" noMargin>{line}</Text>
                ))}
                <Text variant="xs" color="mutedForeground" noMargin>{model.issuerPhone}</Text>
                <Text variant="xs" color="mutedForeground" noMargin>{model.issuerEmail}</Text>
                <Text variant="xs" color="mutedForeground" noMargin>{model.issuerTaxId}</Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text variant="2xl" weight="bold" align="right" noMargin>{model.title}</Text>
              <Text variant="sm" weight="semibold" align="right" noMargin>{model.number}</Text>
              <Text variant="xs" color="mutedForeground" align="right" noMargin>Issue: {model.issueDate}</Text>
              <Text variant="xs" color="mutedForeground" align="right" noMargin>Due: {model.dueDate}</Text>
            </View>
          </View>

          <View style={{ ...rule, marginTop: 12, marginBottom: 12 }} />

          {/* Bill-to + meta. */}
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text variant="xs" weight="semibold" transform="uppercase" color="mutedForeground" noMargin>Bill To</Text>
              <Text variant="base" weight="semibold" noMargin>{model.recipientName}</Text>
              <Text variant="xs" color="mutedForeground" noMargin>{model.recipientAttention}</Text>
              {model.recipientLines.map((line) => (
                <Text key={line} variant="xs" color="mutedForeground" noMargin>{line}</Text>
              ))}
              <Text variant="xs" color="mutedForeground" noMargin>{model.recipientPhone}</Text>
              <Text variant="xs" color="mutedForeground" noMargin>{model.recipientEmail}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text variant="xs" color="mutedForeground" noMargin>Currency: {model.currency}</Text>
              <Text variant="xs" color="mutedForeground" noMargin>{model.tagline}</Text>
            </View>
          </View>

          {/* Line items: vendored pdfcn Takumi Table (flexbox rows). */}
          <View style={{ marginTop: 16 }}>
            <Table variant="line">
              <TableHeader>
                <TableRow header>
                  <TableCell>Description</TableCell>
                  <TableCell align="right" width={52}>Qty</TableCell>
                  <TableCell width={64}>Unit</TableCell>
                  <TableCell align="right" width={104}>Unit Price</TableCell>
                  <TableCell align="right" width={116}>Amount</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {model.rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.description}</TableCell>
                    <TableCell align="right">{row.qty}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell align="right">{row.unitPrice}</TableCell>
                    <TableCell align="right">{row.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </View>

          <TotalsBlock model={model} />

          {/* Notes / terms. */}
          <View style={{ marginTop: 16 }}>
            <Text variant="sm" weight="semibold" noMargin>{model.notesTitle}</Text>
            <Text variant="xs" color="mutedForeground">{model.notes}</Text>
            <Text variant="sm" weight="semibold" noMargin>{model.termsTitle}</Text>
            <Text variant="xs" color="mutedForeground">{model.terms}</Text>
          </View>

          {/* Signature. */}
          <View style={{ marginTop: 24, flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ width: 220 }}>
              <View style={{ ...rule, marginBottom: 4 }} />
              <Text variant="xs" color="mutedForeground" noMargin>Authorised Signature</Text>
            </View>
            <Text variant="xs" color="mutedForeground" noMargin>{model.footerText}</Text>
          </View>
        </Page>
      </Document>
    </PdfcnThemeProvider>
  );
}

/**
 * Native-HTML variant: same prepared rows through a real <table> with
 * <thead>, to test Takumi's documented repeated-header mechanism.
 * This is a control, not a pdfcn component path.
 */
export function PocNativeTableDocument({ model }: { model: PocPreparedModel }) {
  const cell: React.CSSProperties = { fontFamily: "Inter", fontSize: 11, color: "#18181b", padding: 6, textAlign: "left" };
  const head: React.CSSProperties = { ...cell, fontWeight: 700, backgroundColor: "#f4f4f5" };
  const num: React.CSSProperties = { ...cell, textAlign: "right" };
  return (
    <PdfcnThemeProvider theme={pocTheme}>
      <Document title={`${model.number}-native`}>
        <Page size="A4">
          <Text variant="lg" weight="bold" noMargin>{model.title} {model.number} (native table control)</Text>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead>
              <tr>
                <th style={head}>Description</th>
                <th style={{ ...head, textAlign: "right" }}>Qty</th>
                <th style={head}>Unit</th>
                <th style={{ ...head, textAlign: "right" }}>Unit Price</th>
                <th style={{ ...head, textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.key}>
                  <td style={cell}>{row.description}</td>
                  <td style={num}>{row.qty}</td>
                  <td style={cell}>{row.unit}</td>
                  <td style={num}>{row.unitPrice}</td>
                  <td style={num}>{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <TotalsBlock model={model} />
        </Page>
      </Document>
    </PdfcnThemeProvider>
  );
}
