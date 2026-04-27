import React from 'react';
import { Page, Text, View, Image } from '@react-pdf/renderer';
import { styles, resolveAlignment } from './ObsidianReceiptStyles';
import type { IndustryTemplateData } from './types'; // import your actual type

export default function EngineeringInvoice({ data }: { data: IndustryTemplateData }) {
  const {
    title,
    customTitle,
    documentNumber,
    documentNumberLabel,
    issueDate,
    issueDateLabel,
    dueDateOrValidityDate,
    dueDateOrValidityDateLabel,
    poNumber: _poNumber, // we'll render via customHeaderFields if needed
    poNumberLabel: _poNumberLabel,
    customHeaderFields,
    showTagline,
    showBankDetails,
    company,
    client,
    table,
    paymentDetails,
    totals,
    advanceSummary,
    notes,
    terms,
    attachments: _attachments, // not used in this layout, can be ignored
    additionalFields: _additionalFields,
    signature,
    footer,
    design,
  } = data;

  // Fallback design colors
  const accent = design.accentColor || '#2f7f7c';
  const text = design.textColor || '#1a1a1a';
  const muted = design.mutedColor || '#8c8279';
  const border = design.borderColor || '#cbc5bd';
  const surface = design.surfaceColor || '#f6f3ef';

  // Dynamic colors for header border and invoice title
  const headerBorderColor = accent;
  const titleColor = accent;

  const hasCompany = company !== null;
  const hasClient = client !== null;

  return (
    <Page size="A4" style={[styles.page, { color: text }]}>
      {/* ---------- FIXED FOOTER ---------- */}
      <View fixed style={styles.footerFixed}>
        <Text style={styles.footerLeft}>{footer.documentNumber}</Text>
        <Text
          style={styles.footerCenter}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
        <Text style={styles.footerRight}>{footer.companyName}</Text>
      </View>

      {/* ---------- HEADER ---------- */}
      <View style={[styles.header, { borderBottomColor: headerBorderColor }]}>
        <View style={styles.headerLeft}>
          {hasCompany && company.companyLogoUrl && (
            <Image src={company.companyLogoUrl} style={{ width: 60, height: 24, marginBottom: 4 }} />
          )}
          <Text style={[styles.companyName, { color: text }]}>
            {company?.name || 'Company Name'}
          </Text>
          {showTagline && company?.tagline && (
            <Text style={[styles.tagline, { color: muted }]}>{company.tagline}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.invoiceTitle, { color: titleColor }]}>{title}</Text>
          {customTitle && (
            <Text style={{ fontSize: 8, color: muted, marginTop: 1 }}>{customTitle}</Text>
          )}
          <View style={[styles.documentNumberBadge, { backgroundColor: surface, color: text }]}>
            <Text>{documentNumberLabel}: {documentNumber}</Text>
          </View>
        </View>
      </View>

      {/* ---------- META GRID (addresses + dates + totals) ---------- */}
      <View style={[styles.metaGrid, { borderBottomColor: border }]}>
        {/* Left column: From, Bill To, custom fields */}
        <View style={[styles.metaLeft, { borderRightColor: border }]}>
          {hasCompany && (
            <View style={styles.partyBlock}>
              <Text style={[styles.partyLabel, { color: muted }]}>From</Text>
              <Text style={styles.partyName}>{company.name}</Text>
              <Text style={styles.partyDetail}>
                {company.address}{'\n'}
                {company.cityState}{'\n'}
                {company.phone}{'\n'}
                {company.email}
              </Text>
            </View>
          )}
          {hasClient && (
            <View style={styles.partyBlock}>
              <Text style={[styles.partyLabel, { color: muted }]}>Bill To</Text>
              <Text style={styles.partyName}>{client.name}</Text>
              <Text style={styles.partyDetail}>
                {client.address}{'\n'}
                {client.cityState}{'\n'}
                {client.phone}{'\n'}
                {client.email}
              </Text>
            </View>
          )}
          {/* Custom header fields (like P.O. Number) */}
          {customHeaderFields.length > 0 && (
            <View style={styles.customFieldsContainer}>
              {customHeaderFields.map((field, idx) => (
                <View key={idx} style={styles.customField}>
                  <Text style={[styles.customFieldLabel, { color: muted }]}>{field.label}</Text>
                  <Text style={[styles.customFieldValue, { color: text }]}>{field.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Right column: dates + totals */}
        <View style={[styles.metaRight, { backgroundColor: surface }]}>
          {issueDate && (
            <View style={styles.dateRow}>
              <Text style={[styles.dateLabel, { color: muted }]}>{issueDateLabel}</Text>
              <Text style={[styles.dateValue, { color: text }]}>{issueDate}</Text>
            </View>
          )}
          {dueDateOrValidityDate && (
            <View style={styles.dateRow}>
              <Text style={[styles.dateLabel, { color: muted }]}>{dueDateOrValidityDateLabel}</Text>
              <Text style={[styles.dateValue, { color: text }]}>{dueDateOrValidityDate}</Text>
            </View>
          )}
          {/* Totals section */}
          <View style={[styles.totalsBlock, { borderTopColor: text }]}>
            {totals.lines.map((line, idx) => (
              <View key={idx} style={styles.totalLine}>
                <Text>{line.label}</Text>
                <Text>{line.value}</Text>
              </View>
            ))}
            {totals.mainLine && (
              <View style={[styles.totalLine, styles.dueLine, { borderTopColor: border }]}>
                <Text>{totals.mainLine.label}</Text>
                <Text>{totals.mainLine.value}</Text>
              </View>
            )}
            {totals.amountInWords ? (
              <Text style={styles.amountInWords}>{totals.amountInWords}</Text>
            ) : null}
            {totals.balanceDue && (
              <View style={[styles.totalLine, { marginTop: 4 }]}>
                <Text>{totals.balanceDue.label}</Text>
                <Text>{totals.balanceDue.value}</Text>
              </View>
            )}
          </View>
          {/* Advance invoice summary block (if present) */}
          {advanceSummary && (
            <View style={{ marginTop: 8 }}>
              {advanceSummary.primaryLabel && advanceSummary.advanceAmount && (
                <View style={styles.totalLine}>
                  <Text>{advanceSummary.primaryLabel}</Text>
                  <Text>{advanceSummary.advanceAmount}</Text>
                </View>
              )}
              {advanceSummary.secondaryLabel && advanceSummary.balanceRemaining && (
                <View style={styles.totalLine}>
                  <Text>{advanceSummary.secondaryLabel}</Text>
                  <Text>{advanceSummary.balanceRemaining}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* ---------- TABLE ---------- */}
      <View style={styles.items}>
        {/* Column headers */}
        <View style={[styles.tableHeader, { borderBottomColor: text }]}>
          {table.columns.map((col, idx) => {
            const alignStyle = resolveAlignment(col.align);
            const widthStyle = col.width ? { width: col.width } : {};
            const flexStyle = col.flex ? { flex: col.flex } : { flex: 1 };
            return (
              <View key={idx} style={[widthStyle, flexStyle]}>
                <Text style={[styles.columnHeader, { color: muted, ...alignStyle }]}>
                  {col.label}
                </Text>
              </View>
            );
          })}
        </View>
        {/* Rows */}
        {table.rows.map((row, rowIdx) => {
          if (row.isGroupHeader) {
            return (
              <View key={rowIdx} style={[styles.groupHeaderRow, { backgroundColor: surface }]}>
                <Text style={[styles.groupHeaderText, { color: text }]}>
                  {row.groupLabel}
                </Text>
              </View>
            );
          }
          if (row.isGroupFooter && row.showSubtotal) {
            return (
              <View key={rowIdx} style={styles.groupFooterRow}>
                <Text style={[styles.groupSubtotalLabel, { color: muted }]}>Subtotal</Text>
                <Text style={[styles.groupSubtotalValue, { color: text }]}>
                  {row.groupSubtotalValue}
                </Text>
              </View>
            );
          }

          const cells = row.cells || {};
          return (
            <View
              key={rowIdx}
              style={[
                styles.tableRow,
                { borderBottomColor: border },
                row.isInGroup ? { marginLeft: 12 } : {},
              ]}
            >
              {table.columns.map((col, colIdx) => {
                const value = cells[col.key] ?? '';
                const alignStyle = resolveAlignment(col.align);
                const widthStyle = col.width ? { width: col.width } : {};
                const flexStyle = col.flex ? { flex: col.flex } : { flex: 1 };
                const isFirst = colIdx === 0;
                return (
                  <View key={colIdx} style={[widthStyle, flexStyle, styles.tableCell]}>
                    {isFirst && row.imageUrl ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image src={row.imageUrl} style={styles.itemImage} />
                        <Text style={[{ ...alignStyle }]}>{value}</Text>
                      </View>
                    ) : (
                      <Text style={[{ ...alignStyle }]}>{value}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* ---------- NOTES (optional) ---------- */}
      {notes && (
        <View style={styles.notesBlock}>
          <Text style={[styles.notesTitle, { color: text }]}>{notes.title}</Text>
          <Text style={[styles.notesContent, { color: muted }]}>{notes.content}</Text>
        </View>
      )}

      {/* ---------- BANK DETAILS (optional) ---------- */}
      {showBankDetails && paymentDetails && (
        <View style={[styles.notesBlock, { marginTop: 4 }]}>
          <Text style={[styles.notesTitle, { color: text }]}>Bank Details</Text>
          <View style={styles.bankDetailsRow}>
            <Text>Bank: {paymentDetails.bankName}</Text>
            <Text>Account: {paymentDetails.accountName}</Text>
            <Text>No: {paymentDetails.accountNumber}</Text>
          </View>
        </View>
      )}

      {/* ---------- TERMS & CONDITIONS (optional) ---------- */}
      {terms && (
        <View style={[
          styles.termsBlock,
          { borderTopColor: border },
          !notes && !showBankDetails ? { marginTop: 20 } : {},
        ]}>
          <Text style={[styles.termsTitle, { color: text }]}>{terms.title}</Text>
          <Text style={[styles.termsContent, { color: muted }]}>{terms.content}</Text>
        </View>
      )}

      {/* ---------- SIGNATURE (optional) ---------- */}
      {signature && (
        <View style={styles.signatureBlock}>
          {signature.imageUrl && <Image src={signature.imageUrl} style={styles.signatureImage} />}
          <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 4 }}>
            {signature.name || ''}
          </Text>
          <Text style={{ fontSize: 8, color: muted }}>{signature.role || ''}</Text>
        </View>
      )}
    </Page>
  );
}