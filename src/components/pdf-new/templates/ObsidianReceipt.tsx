import React from 'react';
import { Page, Text, View, Image, Link } from '@react-pdf/renderer';
import { styles, resolveAlignment } from './ObsidianReceiptStyles';
import type { IndustryTemplateData } from '../industryAdapter';
import { PdfCurrencyText } from '../pdfCurrency';
import { safeString } from './safeValue';

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
    poNumber = null,
    poNumberLabel = '',
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
    attachments = [],
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
  const rawCustomHeaderFields = Array.isArray(customHeaderFields) 
    ? customHeaderFields.filter(f => f && f.label && f.value && !String(f.label).toLowerCase().includes('.md')) 
    : [];
  
  const safeCustomHeaderFields = [...rawCustomHeaderFields];
  if (poNumber) {
    safeCustomHeaderFields.unshift({ label: poNumberLabel || 'PO Number', value: poNumber });
  }
    
  const companyLogoUrl = typeof company?.companyLogoUrl === 'string' && company.companyLogoUrl.trim()
    ? company.companyLogoUrl
    : undefined;
  const signatureImageUrl = typeof signature?.imageUrl === 'string' && signature.imageUrl.trim()
    ? signature.imageUrl
    : undefined;

  const compactStyles = (...styleList: any[]) => styleList.filter(Boolean) as any;
  const asLineBreakText = (...values: Array<unknown>) => values.map(safeString).filter(Boolean).join('\n');

  // Header Elements
  const headerLeftChildren = [];
  if (companyLogoUrl) {
    headerLeftChildren.push(
      <Image
        key="company-logo"
        src={companyLogoUrl}
        style={{ width: 160, height: 60, objectFit: 'contain', marginBottom: 12 }}
      />,
    );
  }
  headerLeftChildren.push(
    <Text key="company-name" style={compactStyles(styles.companyName, { color: text })}>
      {safeString(company?.name || 'Company Name')}
    </Text>,
  );
  if (showTagline && company?.tagline) {
    headerLeftChildren.push(
      <Text key="company-tagline" style={compactStyles(styles.tagline, { color: muted })}>
        {safeString(company.tagline)}
      </Text>,
    );
  }

  const headerRightChildren = [
    <Text key="title" style={compactStyles(styles.invoiceTitle, { color: accent })}>
      {safeString(title)}
    </Text>,
  ];
  if (customTitle) {
    headerRightChildren.push(
      <Text key="custom-title" style={{ fontSize: 10, color: muted, marginTop: 4 }}>
        {safeString(customTitle)}
      </Text>,
    );
  }
  headerRightChildren.push(
    <View key="document-number" style={compactStyles(styles.documentNumberBadge, { backgroundColor: surface, color: text })}>
      <Text>{`${safeString(documentNumberLabel)}: ${safeString(documentNumber)}`}</Text>
    </View>,
  );

  // Parties & Totals Grid
  const metaLeftChildren = [];
  if (company) {
    metaLeftChildren.push(
      <View key="company-party" style={styles.partyBlock}>
        <Text style={compactStyles(styles.partyLabel, { color: muted })}>From</Text>
        <Text style={styles.partyName}>{safeString(company.name)}</Text>
        <Text style={styles.partyDetail}>{asLineBreakText(company.address, company.cityState, company.phone, company.email)}</Text>
      </View>,
    );
  }
  if (client) {
    metaLeftChildren.push(
      <View key="client-party" style={styles.partyBlock}>
        <Text style={compactStyles(styles.partyLabel, { color: muted })}>Bill To</Text>
        <Text style={styles.partyName}>{safeString(client.name)}</Text>
        <Text style={styles.partyDetail}>{asLineBreakText(client.address, client.cityState, client.phone, client.email)}</Text>
      </View>,
    );
  }
  if (safeCustomHeaderFields.length > 0) {
    metaLeftChildren.push(
      <View key="custom-fields" style={styles.customFieldsContainer}>
        {safeCustomHeaderFields.map((field, idx) => (
          <View key={`custom-field-${idx}`} style={styles.customField}>
            <Text>
              <Text style={compactStyles(styles.customFieldLabel, { color: text })}>{safeString(field.label)}</Text>
              <Text style={{ color: muted }}>{'  ─  '}</Text>
              <Text style={compactStyles(styles.customFieldValue, { color: text })}>{safeString(field.value)}</Text>
            </Text>
          </View>
        ))}
      </View>,
    );
  }

  const totalsLines = lines.map((line, idx) => (
    <View key={`total-line-${idx}`} style={styles.totalLine}>
      <Text>{safeString(line.label)}</Text>
      <PdfCurrencyText value={safeString(line.value)} />
    </View>
  ));
  if (mainLine) {
    totalsLines.push(
      <View key="main-total" style={compactStyles(styles.totalLine, styles.dueLine, { borderTopColor: border })}>
        <Text>{safeString(mainLine.label)}</Text>
        <PdfCurrencyText value={safeString(mainLine.value)} />
      </View>,
    );
  }
  if (amountInWords) {
    totalsLines.push(
      <Text key="amount-in-words" style={styles.amountInWords}>
        {safeString(amountInWords)}
      </Text>,
    );
  }
  if (balanceDue) {
    totalsLines.push(
      <View key="balance-due" style={compactStyles(styles.totalLine, { marginTop: 4 })}>
        <Text>{safeString(balanceDue.label)}</Text>
        <PdfCurrencyText value={safeString(balanceDue.value)} />
      </View>,
    );
  }

  const metaRightChildren = [];
  if (issueDate) {
    metaRightChildren.push(
      <View key="issue-date" style={styles.dateRow}>
        <Text style={compactStyles(styles.dateLabel, { color: muted })}>{safeString(issueDateLabel)}</Text>
        <Text style={compactStyles(styles.dateValue, { color: text })}>{safeString(issueDate)}</Text>
      </View>,
    );
  }
  if (dueDateOrValidityDate) {
    metaRightChildren.push(
      <View key="due-date" style={styles.dateRow}>
        <Text style={compactStyles(styles.dateLabel, { color: muted })}>{safeString(dueDateOrValidityDateLabel)}</Text>
        <Text style={compactStyles(styles.dateValue, { color: text })}>{safeString(dueDateOrValidityDate)}</Text>
      </View>,
    );
  }
  if (advanceSummary) {
    metaRightChildren.push(
      <Text key="advance-label" style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: text, marginBottom: 4, marginTop: 10, textTransform: 'uppercase' }}>
        Advance Invoice
      </Text>
    );
  }
  metaRightChildren.push(
    <View key="totals-block" style={compactStyles(styles.totalsBlock, { borderTopColor: text })}>
      {totalsLines}
    </View>,
  );

  // Table Building
  const tableChildren = [];
  if (columns.length > 0) {
    tableChildren.push(
      <View key="table-header" style={compactStyles(styles.tableHeader, { borderBottomColor: text })}>
        {columns.map((col, idx) => {
          const alignStyle = resolveAlignment(col.align);
          const flexStyle = col.flex ? { flex: col.flex } : { flex: 1 };
          return (
            <View key={`column-${idx}`} style={flexStyle}>
              <Text style={compactStyles(styles.columnHeader, { color: muted, ...alignStyle })}>
                {safeString(col.label)}
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
            {safeString(row.groupLabel)}
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
            <PdfCurrencyText value={safeString(row.groupSubtotalValue)} style={compactStyles(styles.groupSubtotalValue, { color: text })} />
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
          const rawValue = cells[col.key];
          const value = safeString(rawValue);
          
          // Extract sub-description carefully from nested objects or fallback props
          let subValueStr = cells[`${col.key}Sub`] || cells.descriptionSub || '';
          if (!subValueStr && rawValue && typeof rawValue === 'object') {
            subValueStr = (rawValue as any).sub || '';
          }
          const subValue = safeString(subValueStr);
          
          const alignStyle = resolveAlignment(col.align);
          const flexStyle = col.flex ? { flex: col.flex } : { flex: 1 };
          const rowImageUrl = typeof row.imageUrl === 'string' && row.imageUrl.trim() ? row.imageUrl : undefined;
          const isDescriptionCol = col.key === 'description' || col.key === 'item';

          return (
            <View key={`cell-${rowIdx}-${colIdx}`} style={compactStyles(flexStyle, styles.tableCell)}>
              <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <View style={{ width: '100%' }}>
                  <PdfCurrencyText value={value} style={alignStyle} />
                  {isDescriptionCol && subValue ? (
                    <Text style={compactStyles(styles.itemDescriptionSub, alignStyle)}>
                      {subValue}
                    </Text>
                  ) : null}
                </View>
                {isDescriptionCol && rowImageUrl && (
                  <>
                    <Image src={rowImageUrl} style={styles.itemImage} />
                    <Link src={rowImageUrl} style={compactStyles(styles.imageLink, { color: accent })}>Open image</Link>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </View>,
    );
  });

  // Footer & Final Layout
  return (
    <Page size="A4" style={[styles.page, { color: text }]}>
      <View fixed style={styles.footerFixed}>
        <Text style={styles.footerLeft}>{safeString(footer?.documentNumber)}</Text>
        <Text
          style={styles.footerCenter}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
        <Text style={styles.footerRight}>{safeString(footer?.companyName)}</Text>
      </View>

      <View style={[styles.header, { borderBottomColor: accent }]}>
        <View style={styles.headerLeft}>{headerLeftChildren}</View>
        <View style={styles.headerRight}>{headerRightChildren}</View>
      </View>

      <View style={[styles.metaGrid, { borderBottomColor: border }]}>
        <View style={[styles.metaLeft, { borderRightColor: border }]}>{metaLeftChildren}</View>
        <View style={[styles.metaRight, { backgroundColor: surface }]}>{metaRightChildren}</View>
      </View>

      <View style={styles.items}>{tableChildren}</View>

      {/* Advance Summary Section (Visually Prominent) */}
      {advanceSummary && (
        <View style={[styles.advanceSummaryContainer, { borderColor: border, backgroundColor: surface }]}>
          <View style={styles.advanceSummaryRow}>
            <Text style={styles.advanceSummaryLabel}>{safeString(advanceSummary.primaryLabel)}</Text>
            <PdfCurrencyText value={safeString(advanceSummary.advanceAmount)} style={[styles.advanceSummaryValue, { color: accent }]} />
          </View>
          {advanceSummary.secondaryLabel && advanceSummary.balanceRemaining && (
            <View style={[styles.advanceSummaryRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: border }]}>
              <Text style={styles.advanceSummaryLabel}>{safeString(advanceSummary.secondaryLabel)}</Text>
              <PdfCurrencyText value={safeString(advanceSummary.balanceRemaining)} style={styles.advanceSummaryValue} />
            </View>
          )}
        </View>
      )}

      {notes && (
        <View style={styles.notesBlock}>
          <Text style={compactStyles(styles.notesTitle, { color: text })}>{safeString(notes.title)}</Text>
          <Text style={compactStyles(styles.notesContent, { color: muted })}>{safeString(notes.content)}</Text>
        </View>
      )}

      {showBankDetails && paymentDetails && (
        <View style={compactStyles(styles.notesBlock, { marginTop: 4 })}>
          <Text style={compactStyles(styles.notesTitle, { color: text })}>Bank Details</Text>
          <View style={styles.bankDetailsRow}>
            <Text>{`Bank: ${safeString(paymentDetails.bankName)}`}</Text>
            <Text>{`Account: ${safeString(paymentDetails.accountName)}`}</Text>
            <Text>{`No: ${safeString(paymentDetails.accountNumber)}`}</Text>
          </View>
        </View>
      )}

      {terms && (
        <View style={compactStyles(styles.termsBlock, { borderTopColor: border, marginTop: notes || showBankDetails ? 10 : 20 })}>
          <Text style={compactStyles(styles.termsTitle, { color: text })}>{safeString(terms.title)}</Text>
          <Text style={compactStyles(styles.termsContent, { color: muted })}>{safeString(terms.content)}</Text>
        </View>
      )}

      {attachments && attachments.length > 0 ? (
        <View style={compactStyles(styles.termsBlock, { borderTopColor: border, marginTop: 10 })}>
          <Text style={compactStyles(styles.termsTitle, { color: text })}>Attachments</Text>
          <View style={styles.attachmentsWrap}>
            {attachments.map((item, idx) => {
              if (typeof item === 'string') return <Text key={`attach-${idx}`} style={styles.attachmentItem}>- {safeString(item)}</Text>;
              if (item?.url && item?.label) return <Link key={`attach-${idx}`} src={item.url} style={compactStyles(styles.attachmentLink, { color: accent })}>{safeString(item.label)}</Link>;
              if (item?.label) return <Text key={`attach-${idx}`} style={styles.attachmentItem}>- {safeString(item.label)}</Text>;
              if (item?.url) return <Link key={`attach-${idx}`} src={item.url} style={compactStyles(styles.attachmentLink, { color: accent })}>{safeString(item.url)}</Link>;
              return null;
            })}
          </View>
        </View>
      ) : null}

      {signature && (signatureImageUrl || signature.name || signature.role) && (
        <View style={styles.signatureBlock}>
          {signatureImageUrl && <Image src={signatureImageUrl} style={styles.signatureImage} />}
          <View style={styles.signatureLine} />
          {signature.name ? <Text style={compactStyles(styles.signerName, { color: text })}>{safeString(signature.name)}</Text> : null}
          {signature.role ? <Text style={styles.signerRole}>{safeString(signature.role)}</Text> : null}
        </View>
      )}
    </Page>
  );
}
