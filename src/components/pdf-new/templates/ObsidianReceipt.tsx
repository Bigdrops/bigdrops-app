import React from 'react';
import { Page, Text, View, Image } from '@react-pdf/renderer';
import { styles, resolveAlignment } from './ObsidianReceiptStyles';
import type { IndustryTemplateData } from './types'; // adjust your actual type path

export default function ObsidianReceipt({ data }: { data: IndustryTemplateData }) {
  // **CRITICAL**: If data is null/undefined for any reason, render nothing.
  if (!data) return null;

  // Safely destructure with fallback empty objects/arrays for everything nullable.
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
  } = data;

  // Ensure design is at least an object
  const safeDesign = design || {};
  const accent = safeDesign.accentColor || '#2f7f7c';
  const text = safeDesign.textColor || '#1a1a1a';
  const muted = safeDesign.mutedColor || '#8c8279';
  const border = safeDesign.borderColor || '#cbc5bd';
  const surface = safeDesign.surfaceColor || '#f6f3ef';

  // Safeguard totals
  const lines = totals?.lines || [];
  const mainLine = totals?.mainLine || null;
  const amountInWords = totals?.amountInWords || '';
  const balanceDue = totals?.balanceDue || null;

  // Safeguard table
  const columns = table?.columns || [];
  const rows = table?.rows || [];

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
        <View style={styles.headerLeft}>
          {company?.companyLogoUrl ? (
            <Image
              src={company.companyLogoUrl}
              style={{ width: 60, height: 24, marginBottom: 4 }}
            />
          ) : null}
          <Text style={[styles.companyName, { color: text }]}>
            {company?.name || 'Company Name'}
          </Text>
          {showTagline && company?.tagline ? (
            <Text style={[styles.tagline, { color: muted }]}>{company.tagline}</Text>
          ) : null}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.invoiceTitle, { color: accent }]}>{title}</Text>
          {customTitle ? (
            <Text style={{ fontSize: 8, color: muted, marginTop: 1 }}>{customTitle}</Text>
          ) : null}
          <View style={[styles.documentNumberBadge, { backgroundColor: surface, color: text }]}>
            <Text>{documentNumberLabel}: {documentNumber}</Text>
          </View>
        </View>
      </View>

      {/* Meta grid */}
      <View style={[styles.metaGrid, { borderBottomColor: border }]}>
        <View style={[styles.metaLeft, { borderRightColor: border }]}>
          {company ? (
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
          ) : null}
          {client ? (
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
          ) : null}
          {customHeaderFields.length > 0 ? (
            <View style={styles.customFieldsContainer}>
              {customHeaderFields.map((field, idx) => (
                <View key={idx} style={styles.customField}>
                  <Text style={[styles.customFieldLabel, { color: muted }]}>{field.label}</Text>
                  <Text style={[styles.customFieldValue, { color: text }]}>{field.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={[styles.metaRight, { backgroundColor: surface }]}>
          {issueDate ? (
            <View style={styles.dateRow}>
              <Text style={[styles.dateLabel, { color: muted }]}>{issueDateLabel}</Text>
              <Text style={[styles.dateValue, { color: text }]}>{issueDate}</Text>
            </View>
          ) : null}
          {dueDateOrValidityDate ? (
            <View style={styles.dateRow}>
              <Text style={[styles.dateLabel, { color: muted }]}>{dueDateOrValidityDateLabel}</Text>
              <Text style={[styles.dateValue, { color: text }]}>{dueDateOrValidityDate}</Text>
            </View>
          ) : null}
          <View style={[styles.totalsBlock, { borderTopColor: text }]}>
            {lines.map((line, idx) => (
              <View key={idx} style={styles.totalLine}>
                <Text>{line.label}</Text>
                <Text>{line.value}</Text>
              </View>
            ))}
            {mainLine ? (
              <View style={[styles.totalLine, styles.dueLine, { borderTopColor: border }]}>
                <Text>{mainLine.label}</Text>
                <Text>{mainLine.value}</Text>
              </View>
            ) : null}
            {amountInWords ? (
              <Text style={styles.amountInWords}>{amountInWords}</Text>
            ) : null}
            {balanceDue ? (
              <View style={[styles.totalLine, { marginTop: 4 }]}>
                <Text>{balanceDue.label}</Text>
                <Text>{balanceDue.value}</Text>
              </View>
            ) : null}
          </View>
          {advanceSummary ? (
            <View style={{ marginTop: 8 }}>
              {advanceSummary.primaryLabel && advanceSummary.advanceAmount ? (
                <View style={styles.totalLine}>
                  <Text>{advanceSummary.primaryLabel}</Text>
                  <Text>{advanceSummary.advanceAmount}</Text>
                </View>
              ) : null}
              {advanceSummary.secondaryLabel && advanceSummary.balanceRemaining ? (
                <View style={styles.totalLine}>
                  <Text>{advanceSummary.secondaryLabel}</Text>
                  <Text>{advanceSummary.balanceRemaining}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {/* Table */}
      <View style={styles.items}>
        {columns.length > 0 ? (
          <View style={[styles.tableHeader, { borderBottomColor: text }]}>
            {columns.map((col, idx) => {
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
        ) : null}
        {rows.map((row, rowIdx) => {
          if (row.isGroupHeader) {
            return (
              <View key={rowIdx} style={[styles.groupHeaderRow, { backgroundColor: surface }]}>
                <Text style={[styles.groupHeaderText, { color: text }]}>
                  {row.groupLabel || ''}
                </Text>
              </View>
            );
          }
          if (row.isGroupFooter && row.showSubtotal) {
            return (
              <View key={rowIdx} style={styles.groupFooterRow}>
                <Text style={[styles.groupSubtotalLabel, { color: muted }]}>Subtotal</Text>
                <Text style={[styles.groupSubtotalValue, { color: text }]}>
                  {row.groupSubtotalValue || ''}
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
              {columns.map((col, colIdx) => {
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

      {/* Notes */}
      {notes ? (
        <View style={styles.notesBlock}>
          <Text style={[styles.notesTitle, { color: text }]}>{notes.title || ''}</Text>
          <Text style={[styles.notesContent, { color: muted }]}>{notes.content || ''}</Text>
        </View>
      ) : null}

      {/* Bank details */}
      {showBankDetails && paymentDetails ? (
        <View style={[styles.notesBlock, { marginTop: 4 }]}>
          <Text style={[styles.notesTitle, { color: text }]}>Bank Details</Text>
          <View style={styles.bankDetailsRow}>
            <Text>Bank: {paymentDetails.bankName}</Text>
            <Text>Account: {paymentDetails.accountName}</Text>
            <Text>No: {paymentDetails.accountNumber}</Text>
          </View>
        </View>
      ) : null}

      {/* Terms */}
      {terms ? (
        <View
          style={[
            styles.termsBlock,
            { borderTopColor: border },
            !notes && !showBankDetails ? { marginTop: 20 } : {},
          ]}
        >
          <Text style={[styles.termsTitle, { color: text }]}>{terms.title || ''}</Text>
          <Text style={[styles.termsContent, { color: muted }]}>{terms.content || ''}</Text>
        </View>
      ) : null}

      {/* Signature */}
      {signature ? (
        <View style={styles.signatureBlock}>
          {signature.imageUrl ? (
            <Image src={signature.imageUrl} style={styles.signatureImage} />
          ) : null}
          <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 4 }}>
            {signature.name || ''}
          </Text>
          <Text style={{ fontSize: 8, color: muted }}>{signature.role || ''}</Text>
        </View>
      ) : null}
    </Page>
  );
}