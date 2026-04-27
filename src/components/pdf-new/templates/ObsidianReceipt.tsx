import React from 'react';
import { Page, Text, View, Image } from '@react-pdf/renderer';
import { styles, resolveAlignment } from './ObsidianReceiptStyles';
import type { IndustryTemplateData } from '../industryAdapter';

export default function ObsidianReceipt({ data }: { data: IndustryTemplateData }) {
  const safeData = data ?? ({} as IndustryTemplateData);
  const {
    title = '',
    customTitle = null,
    documentNumber = '',
    documentNumberLabel = '',
    issueDate = null,
    issueDateLabel = '',
    dueDateOrValidityDate = null,
    dueDateOrValidityDateLabel = '',
    customHeaderFields = [],
    showTagline = false,
    showBankDetails = false,
    company = null,
    client = null,
    table = { columns: [], rows: [] },
    paymentDetails = null,
    totals = { lines: [], mainLine: null, amountInWords: '', balanceDue: null },
    advanceSummary = null,
    notes = null,
    terms = null,
    signature = null,
    footer = { documentNumber: '', companyName: '', extraText: '' },
    design = {},
  } = safeData;

  const safeDesign = (design || {}) as NonNullable<IndustryTemplateData['design']>;
  const accent = safeDesign.accentColor || '#2f7f7c';
  const text = safeDesign.textColor || '#1a1a1a';
  const muted = safeDesign.mutedColor || '#8c8279';
  const border = safeDesign.borderColor || '#cbc5bd';
  const surface = safeDesign.surfaceColor || '#f6f3ef';

  const lines = Array.isArray(totals?.lines) ? totals.lines.filter(Boolean) : [];
  const mainLine = totals?.mainLine || null;
  const amountInWords = totals?.amountInWords || '';
  const balanceDue = totals?.balanceDue || null;

  const columns = Array.isArray(table?.columns) ? table.columns.filter(Boolean) : [];
  const rows = Array.isArray(table?.rows) ? table.rows.filter(Boolean) : [];
  const safeCustomHeaderFields = Array.isArray(customHeaderFields) ? customHeaderFields.filter(Boolean) : [];
  const companyLogoUrl = typeof company?.companyLogoUrl === 'string' && company.companyLogoUrl.trim()
    ? company.companyLogoUrl
    : undefined;
  const signatureImageUrl = typeof signature?.imageUrl === 'string' && signature.imageUrl.trim()
    ? signature.imageUrl
    : undefined;
  const compactStyles = (...styleList: any[]) => styleList.filter(Boolean) as any;
  const asText = (value: unknown) => (value === null || value === undefined ? '' : String(value));
  const asLineBreakText = (...values: Array<unknown>) => values.map(asText).filter(Boolean).join('\n');

  const headerLeftChildren = [];
  if (companyLogoUrl) {
    headerLeftChildren.push(
      <Image
        key="company-logo"
        src={companyLogoUrl}
        style={{ width: 60, height: 24, marginBottom: 4 }}
      />,
    );
  }
  headerLeftChildren.push(
    <Text key="company-name" style={compactStyles(styles.companyName, { color: text })}>
      {asText(company?.name || 'Company Name')}
    </Text>,
  );
  if (showTagline && company?.tagline) {
    headerLeftChildren.push(
      <Text key="company-tagline" style={compactStyles(styles.tagline, { color: muted })}>
        {asText(company.tagline)}
      </Text>,
    );
  }

  const headerRightChildren = [
    <Text key="title" style={compactStyles(styles.invoiceTitle, { color: accent })}>
      {asText(title)}
    </Text>,
  ];
  if (customTitle) {
    headerRightChildren.push(
      <Text key="custom-title" style={{ fontSize: 8, color: muted, marginTop: 1 }}>
        {asText(customTitle)}
      </Text>,
    );
  }
  headerRightChildren.push(
    <View key="document-number" style={compactStyles(styles.documentNumberBadge, { backgroundColor: surface, color: text })}>
      <Text>{`${asText(documentNumberLabel)}: ${asText(documentNumber)}`}</Text>
    </View>,
  );

  const metaLeftChildren = [];
  if (company) {
    metaLeftChildren.push(
      <View key="company-party" style={styles.partyBlock}>
        <Text style={compactStyles(styles.partyLabel, { color: muted })}>From</Text>
        <Text style={styles.partyName}>{asText(company.name)}</Text>
        <Text style={styles.partyDetail}>{asLineBreakText(company.address, company.cityState, company.phone, company.email)}</Text>
      </View>,
    );
  }
  if (client) {
    metaLeftChildren.push(
      <View key="client-party" style={styles.partyBlock}>
        <Text style={compactStyles(styles.partyLabel, { color: muted })}>Bill To</Text>
        <Text style={styles.partyName}>{asText(client.name)}</Text>
        <Text style={styles.partyDetail}>{asLineBreakText(client.address, client.cityState, client.phone, client.email)}</Text>
      </View>,
    );
  }
  if (safeCustomHeaderFields.length > 0) {
    metaLeftChildren.push(
      <View key="custom-fields" style={styles.customFieldsContainer}>
        {safeCustomHeaderFields.map((field, idx) => (
          <View key={`custom-field-${idx}`} style={styles.customField}>
            <Text style={compactStyles(styles.customFieldLabel, { color: muted })}>{asText(field.label)}</Text>
            <Text style={compactStyles(styles.customFieldValue, { color: text })}>{asText(field.value)}</Text>
          </View>
        ))}
      </View>,
    );
  }

  const totalsChildren = lines.map((line, idx) => (
    <View key={`total-line-${idx}`} style={styles.totalLine}>
      <Text>{asText(line.label)}</Text>
      <Text>{asText(line.value)}</Text>
    </View>
  ));
  if (mainLine) {
    totalsChildren.push(
      <View key="main-total" style={compactStyles(styles.totalLine, styles.dueLine, { borderTopColor: border })}>
        <Text>{asText(mainLine.label)}</Text>
        <Text>{asText(mainLine.value)}</Text>
      </View>,
    );
  }
  if (amountInWords) {
    totalsChildren.push(
      <Text key="amount-in-words" style={styles.amountInWords}>
        {asText(amountInWords)}
      </Text>,
    );
  }
  if (balanceDue) {
    totalsChildren.push(
      <View key="balance-due" style={compactStyles(styles.totalLine, { marginTop: 4 })}>
        <Text>{asText(balanceDue.label)}</Text>
        <Text>{asText(balanceDue.value)}</Text>
      </View>,
    );
  }

  const metaRightChildren = [];
  if (issueDate) {
    metaRightChildren.push(
      <View key="issue-date" style={styles.dateRow}>
        <Text style={compactStyles(styles.dateLabel, { color: muted })}>{asText(issueDateLabel)}</Text>
        <Text style={compactStyles(styles.dateValue, { color: text })}>{asText(issueDate)}</Text>
      </View>,
    );
  }
  if (dueDateOrValidityDate) {
    metaRightChildren.push(
      <View key="due-date" style={styles.dateRow}>
        <Text style={compactStyles(styles.dateLabel, { color: muted })}>{asText(dueDateOrValidityDateLabel)}</Text>
        <Text style={compactStyles(styles.dateValue, { color: text })}>{asText(dueDateOrValidityDate)}</Text>
      </View>,
    );
  }
  metaRightChildren.push(
    <View key="totals-block" style={compactStyles(styles.totalsBlock, { borderTopColor: text })}>
      {totalsChildren}
    </View>,
  );
  if (advanceSummary) {
    const advanceChildren = [];
    if (advanceSummary.primaryLabel && advanceSummary.advanceAmount) {
      advanceChildren.push(
        <View key="advance-primary" style={styles.totalLine}>
          <Text>{asText(advanceSummary.primaryLabel)}</Text>
          <Text>{asText(advanceSummary.advanceAmount)}</Text>
        </View>,
      );
    }
    if (advanceSummary.secondaryLabel && advanceSummary.balanceRemaining) {
      advanceChildren.push(
        <View key="advance-secondary" style={styles.totalLine}>
          <Text>{asText(advanceSummary.secondaryLabel)}</Text>
          <Text>{asText(advanceSummary.balanceRemaining)}</Text>
        </View>,
      );
    }
    if (advanceChildren.length > 0) {
      metaRightChildren.push(
        <View key="advance-summary" style={{ marginTop: 8 }}>
          {advanceChildren}
        </View>,
      );
    }
  }

  const tableChildren = [];
  if (columns.length > 0) {
    tableChildren.push(
      <View key="table-header" style={compactStyles(styles.tableHeader, { borderBottomColor: text })}>
        {columns.map((col, idx) => {
          const alignStyle = resolveAlignment(col.align);
          const widthStyle = col.width ? { width: col.width } : undefined;
          const flexStyle = col.flex ? { flex: col.flex } : { flex: 1 };
          return (
            <View key={`column-${idx}`} style={compactStyles(widthStyle, flexStyle)}>
              <Text style={compactStyles(styles.columnHeader, { color: muted, ...alignStyle })}>
                {asText(col.label)}
              </Text>
            </View>
          );
        })}
      </View>,
    );
  }
  rows.forEach((row, rowIdx) => {
    if (row.isGroupHeader) {
      tableChildren.push(
        <View key={`group-header-${rowIdx}`} style={compactStyles(styles.groupHeaderRow, { backgroundColor: surface })}>
          <Text style={compactStyles(styles.groupHeaderText, { color: text })}>
            {asText(row.groupLabel)}
          </Text>
        </View>,
      );
      return;
    }
    if (row.isGroupFooter) {
      if (row.showSubtotal) {
        tableChildren.push(
          <View key={`group-footer-${rowIdx}`} style={styles.groupFooterRow}>
            <Text style={compactStyles(styles.groupSubtotalLabel, { color: muted })}>Subtotal</Text>
            <Text style={compactStyles(styles.groupSubtotalValue, { color: text })}>
              {asText(row.groupSubtotalValue)}
            </Text>
          </View>,
        );
      }
      return;
    }

    const cells = row.cells || {};
    tableChildren.push(
      <View
        key={`table-row-${rowIdx}`}
        style={compactStyles(
          styles.tableRow,
          { borderBottomColor: border },
          row.isInGroup ? { marginLeft: 12 } : undefined,
        )}
      >
        {columns.map((col, colIdx) => {
          const value = cells[col.key] ?? '';
          const alignStyle = resolveAlignment(col.align);
          const widthStyle = col.width ? { width: col.width } : undefined;
          const flexStyle = col.flex ? { flex: col.flex } : { flex: 1 };
          const rowImageUrl = typeof row.imageUrl === 'string' && row.imageUrl.trim() ? row.imageUrl : undefined;
          const isFirst = colIdx === 0;
          return (
            <View key={`cell-${rowIdx}-${colIdx}`} style={compactStyles(widthStyle, flexStyle, styles.tableCell)}>
              {isFirst && rowImageUrl ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image src={rowImageUrl} style={styles.itemImage} />
                  <Text style={alignStyle}>{asText(value)}</Text>
                </View>
              ) : (
                <Text style={alignStyle}>{asText(value)}</Text>
              )}
            </View>
          );
        })}
      </View>,
    );
  });

  const notesSection = notes ? (
    <View style={styles.notesBlock}>
      <Text style={compactStyles(styles.notesTitle, { color: text })}>{asText(notes.title)}</Text>
      <Text style={compactStyles(styles.notesContent, { color: muted })}>{asText(notes.content)}</Text>
    </View>
  ) : undefined;

  const bankDetailsSection = showBankDetails && paymentDetails ? (
    <View style={compactStyles(styles.notesBlock, { marginTop: 4 })}>
      <Text style={compactStyles(styles.notesTitle, { color: text })}>Bank Details</Text>
      <View style={styles.bankDetailsRow}>
        <Text>{`Bank: ${asText(paymentDetails.bankName)}`}</Text>
        <Text>{`Account: ${asText(paymentDetails.accountName)}`}</Text>
        <Text>{`No: ${asText(paymentDetails.accountNumber)}`}</Text>
      </View>
    </View>
  ) : undefined;

  const termsSection = terms ? (
    <View
      style={compactStyles(
        styles.termsBlock,
        { borderTopColor: border },
        !notes && !showBankDetails ? { marginTop: 20 } : undefined,
      )}
    >
      <Text style={compactStyles(styles.termsTitle, { color: text })}>{asText(terms.title)}</Text>
      <Text style={compactStyles(styles.termsContent, { color: muted })}>{asText(terms.content)}</Text>
    </View>
  ) : undefined;

  const signatureSection = signature && (signatureImageUrl || signature.name || signature.role) ? (
    <View style={styles.signatureBlock}>
      {signatureImageUrl ? <Image src={signatureImageUrl} style={styles.signatureImage} /> : undefined}
      <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 4 }}>{asText(signature.name)}</Text>
      <Text style={{ fontSize: 8, color: muted }}>{asText(signature.role)}</Text>
    </View>
  ) : undefined;

  return (
    <Page size="A4" style={[styles.page, { color: text }]}>
      {/* Fixed footer */}
      <View fixed style={styles.footerFixed}>
        <Text style={styles.footerLeft}>{footer?.documentNumber || ''}</Text>
        <Text
          style={styles.footerCenter}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
        <Text style={styles.footerRight}>{footer?.companyName || ''}</Text>
      </View>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: accent }]}>
        <View style={styles.headerLeft}>{headerLeftChildren}</View>
        <View style={styles.headerRight}>{headerRightChildren}</View>
      </View>

      {/* Meta grid */}
      <View style={[styles.metaGrid, { borderBottomColor: border }]}>
        <View style={[styles.metaLeft, { borderRightColor: border }]}>{metaLeftChildren}</View>

        <View style={[styles.metaRight, { backgroundColor: surface }]}>{metaRightChildren}</View>
      </View>

      {/* Table */}
      <View style={styles.items}>{tableChildren}</View>

      {/* Notes */}
      {notesSection}

      {/* Bank details */}
      {bankDetailsSection}

      {/* Terms */}
      {termsSection}

      {/* Signature */}
      {signatureSection}
    </Page>
  );
}
