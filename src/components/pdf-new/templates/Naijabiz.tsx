// Bolt.tsx
import React from 'react';
import { Page, Text, View, Image, Link } from '@react-pdf/renderer';
import type { IndustryTemplateData } from '../industryAdapter';
import { PdfCurrencyText } from '../pdfCurrency';
import { styles } from './Naijabizstyles';

// ---- safe text ----
function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return safeText(obj.label ?? obj.name ?? obj.text ?? obj.main ?? obj.value ?? '');
  }
  return '';
}

// accent token default
const DEFAULT_ACCENT = '#1a56db';

export default function Bolt({ data }: { data: IndustryTemplateData }) {
  if (!data) return null;

  const {
    title,
    customTitle,
    documentNumber,
    documentNumberLabel: _docNumberLabel,
    issueDate,
    issueDateLabel: _issueDateLabel,
    dueDateOrValidityDate,
    dueDateOrValidityDateLabel: _dueLabel,
    poNumber,
    poNumberLabel: _poLabel,
    customHeaderFields = [],
    showBankDetails,
    company,
    client,
    table = { columns: [], rows: [] },
    paymentDetails = null,
    totals = { lines: [], mainLine: null, amountInWords: '', balanceDue: null },
    advanceSummary = null,
    notes = null,
    terms = null,
    attachments = [],
    additionalFields = [],
    signature = null,
    footer = { documentNumber: '', companyName: '', extraText: '' },
    design = {},
  } = data;

  // colors from design, fallback to defaults
  const accent = design.accentColor || DEFAULT_ACCENT;
  const ink = design.textColor || '#0f172a';
  const muted = design.mutedColor || '#64748b';
  const surface = design.surfaceColor || '#f8fafc';

  // dynamic color helpers for inline styles
  const headerBg = { backgroundColor: accent };
  const accentText = { color: accent };
  const accentBorder = { borderColor: accent };
  const accentBackground = { backgroundColor: accent };
  const surfaceBg = { backgroundColor: surface };

  // Show advance invoice label if advanceSummary exists
  const isAdvance = advanceSummary !== null;
  const docLabel = isAdvance ? 'Advance Invoice' : (customTitle || title || 'Invoice');
  const docTitle = title || 'INVOICE';

  // totals
  const totalLines = totals.lines || [];
  const mainLine = totals.mainLine || null;
  const amountInWords = totals.amountInWords || '';
  const balanceDue = totals.balanceDue || null;

  // table
  const columns = table.columns || [];
  const rows = table.rows || [];

  return (
    <Page size="A4" style={styles.page}>

      {/* ====== FIXED FOOTER ====== */}
      <View fixed style={styles.footer}>
        <Text style={styles.footerLeft}>{footer.documentNumber || documentNumber}</Text>
        <Text
          style={styles.footerCenter}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
        />
        <Text style={styles.footerRight}>{footer.companyName || company?.name || ''}</Text>
      </View>

      {/* ====== HEADER BANNER ====== */}
      <View style={[styles.headerBanner, headerBg]}>
        {/* subtle bottom line */}
        <View style={styles.headerBannerBottomLine} />
        <View style={styles.headerLeft}>
          {/* Logo placeholder or real logo */}
          {company?.companyLogoUrl ? (
            <Image src={company.companyLogoUrl} style={{ width: 48, height: 48, marginBottom: 6 }} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: '#FFFFFF' }]}>
              <Text style={[styles.logoText, { color: accent }]}>
                {company?.name ? company.name.charAt(0) + (company.name.split(' ')[1]?.charAt(0) || '') : 'S&S'}
              </Text>
            </View>
          )}
          <Text style={styles.companyName}>
            {company?.name || 'Company Name'}
          </Text>
          <Text style={styles.companyContact}>
            {company?.address ? `${company.address}` : ''}
            {company?.cityState ? `\n${company.cityState}` : ''}
            {(company?.phone || company?.email) ? `\n` : ''}
            {company?.phone || ''}
            {company?.phone && company?.email ? ' · ' : ''}
            {company?.email || ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.documentLabel}>{docLabel}</Text>
          <Text style={styles.documentTitle}>{docTitle}</Text>
          <View style={styles.metaLine}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Text style={styles.metaLabel}>Invoice Number</Text>
              <Text style={styles.metaValue}>{documentNumber}</Text>
            </View>
            {issueDate && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                <Text style={styles.metaLabel}>Issue Date</Text>
                <Text style={styles.metaValue}>{issueDate}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ====== ADDRESS ROW ====== */}
      <View style={styles.addressRow}>
        {client ? (
          <View style={styles.addressColumn}>
            <Text style={styles.addressLabel}>Bill To</Text>
            <Text style={styles.addressName}>{client.name}</Text>
            <Text style={styles.addressDetail}>
              {client.address ? `${client.address}\n` : ''}
              {client.cityState ? `${client.cityState}\n` : ''}
              {client.phone || ''}
              {client.phone && client.email ? ' · ' : ''}
              {client.email || ''}
            </Text>
          </View>
        ) : (
          <View style={styles.addressColumn} />
        )}
        <View style={styles.addressColumnLast}>
          <Text style={styles.addressLabel}>Our Reference</Text>
          {company && (
            <Text style={styles.addressName}>{company.name}</Text>
          )}
          <Text style={styles.addressDetail}>
            {company?.customInfo && company.customInfo.length > 0
              ? company.customInfo.map((ci, i) => (
                  `${ci.label}: ${ci.value}${i < company.customInfo.length - 1 ? ' · ' : ''}`
                )).join('')
              : 'VAT: NG-48291 · CAC: RC-729304'}
          </Text>
        </View>
      </View>

      {/* ====== CUSTOM HEADER FIELDS ====== */}
      {customHeaderFields.length > 0 && (
        <View style={[styles.customStrip, surfaceBg]}>
          {customHeaderFields.map((field, idx) => (
            <View key={`cf-${idx}`} style={styles.customFieldItem}>
              <Text style={styles.customFieldKey}>{field.label}</Text>
              <Text style={styles.customFieldValue}>{field.value}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ====== TABLE ====== */}
      <View style={styles.tableSection}>
        {/* Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
          {columns.map((col, ci) => {
            const align = col.align === 'right' ? { textAlign: 'right' as const } : col.align === 'center' ? { textAlign: 'center' as const } : {};
            const width = col.width ? { width: col.width } : col.flex ? { flex: col.flex } : {};
            return (
              <Text
                key={ci}
                style={[styles.tableHeaderCell, width as any, align]}
              >
                {col.label}
              </Text>
            );
          })}
        </View>

        {/* Rows */}
        {rows.map((row, rowIdx) => {
          // group header
          if (row.isGroupHeader) {
            return (
              <View key={`gh-${rowIdx}`} style={[styles.groupHeaderRow, { backgroundColor: '#eff6ff', borderBottomColor: '#dbeafe' }]}>
                <Text style={[styles.groupHeaderText, { color: accent }]}>{row.groupLabel || ''}</Text>
              </View>
            );
          }
          // group subtotal
          if (row.isGroupFooter && row.showSubtotal) {
            return (
              <View key={`gf-${rowIdx}`} style={styles.groupSubtotalRow}>
                {/* empty cells before subtotal */}
                {columns.map((_col, ci) => {
                  if (ci < columns.length - 2) {
                    return <View key={ci} style={{ flex: 1 }} />;
                  }
                  if (ci === columns.length - 2) {
                    return (
                      <Text key={ci} style={[styles.groupSubtotalLabel, { marginRight: 4 }]}>
                        Subtotal
                      </Text>
                    );
                  }
                  return (
                    <PdfCurrencyText key={ci} value={row.groupSubtotalValue || ''} style={[styles.groupSubtotalValue, { color: ink }]} />
                  );
                })}
              </View>
            );
          }

          // normal row
          const cells = row.cells || {};
          const imageUrl = row.imageUrl || null;
          const isGroupItem = row.isInGroup || false;

          return (
            <View key={`r-${rowIdx}`} style={styles.tableRow} wrap={false}>
              {/* row number */}
              <Text style={[styles.tableCellBase, styles.colNum, { textAlign: 'center' }]}>
                {rowIdx + 1}
              </Text>

              {columns.map((col, ci) => {
                const value = cells[col.key];
                const display = safeText(value);
                const align = col.align === 'right' ? { textAlign: 'right' as const } : col.align === 'center' ? { textAlign: 'center' as const } : {};
                const width = col.width ? { width: col.width } : col.flex ? { flex: col.flex } : { flex: 1 };
                const isFirstCol = ci === 0;

                return (
                  <View
                    key={ci}
                    style={[
                      styles.tableCellBase,
                      width as any,
                      isGroupItem && isFirstCol ? styles.groupItemIndent : {},
                    ]}
                  >
                    {isFirstCol ? (
                      /* Description cell: title + sub + optional thumbnail */
                      <View style={{ position: 'relative' }}>
                        {isGroupItem && (
                          <Text style={[styles.groupItemPrefix, { color: accent }]}>└</Text>
                        )}
                        <Text style={styles.itemTitle}>{display}</Text>
                        {/* sub-description from second column */}
                        {columns.length > 1 && cells[columns[1].key] && (
                          <Text style={styles.itemSub}>{safeText(cells[columns[1].key])}</Text>
                        )}
                        {imageUrl && (
                          <View style={styles.thumbnailRow}>
                            <Image src={imageUrl} style={styles.thumbnailImg} />
                            <Link src={imageUrl} style={[styles.openImageLink, { color: accent, backgroundColor: '#eff6ff' }]}>
                              Open image
                            </Link>
                          </View>
                        )}
                      </View>
                    ) : ci === 1 ? (
                      /* second column already rendered as sub, skip */
                      <Text></Text>
                    ) : (
                      <PdfCurrencyText value={display} style={[{ ...align }, col.key === 'make' ? styles.makeCell : null, col.key === 'model' ? styles.modelCell : null, col.key === 'qty' ? styles.qtyCell : null, col.key === 'unitPrice' ? styles.priceCell : null, col.key === 'amount' ? styles.amountCell : null]} />
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* ====== BOTTOM PANEL (3 columns) ====== */}
      <View style={styles.bottomPanel}>
        {/* Payment info */}
        {showBankDetails && paymentDetails ? (
          <View style={styles.bottomColumn}>
            <Text style={[styles.sectionTitle, { color: accent }]}>Payment</Text>
            <View style={styles.bankLine}>
              <Text style={styles.bankLabel}>Bank</Text>
              <Text style={styles.bankValue}>{paymentDetails.bankName}</Text>
            </View>
            <View style={styles.bankLine}>
              <Text style={styles.bankLabel}>Account</Text>
              <Text style={styles.bankValue}>{paymentDetails.accountName}</Text>
            </View>
            <View style={styles.bankLine}>
              <Text style={styles.bankLabel}>No.</Text>
              <Text style={styles.bankValue}>{paymentDetails.accountNumber}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.bottomColumn} />
        )}

        {/* Notes & Terms */}
        <View style={styles.bottomColumn}>
          {notes && (
            <>
              <Text style={[styles.sectionTitle, { color: accent }]}>Notes</Text>
              <Text style={styles.textBlock}>{notes.content}</Text>
            </>
          )}
          {terms && (
            <>
              <Text style={[styles.sectionTitle, { color: accent, marginTop: notes ? 8 : 0 }]}>Terms</Text>
              <Text style={styles.textBlock}>{terms.content}</Text>
            </>
          )}
        </View>

        {/* Attachments */}
        <View style={styles.bottomColumnLast}>
          {attachments.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: accent }]}>Attachments</Text>
              {attachments.map((att, idx) =>
                att.url ? (
                  <Link key={`att-${idx}`} src={att.url} style={[styles.attachmentLink, { color: accent }]}>
                    {att.label}
                  </Link>
                ) : (
                  <Text key={`att-${idx}`} style={{ fontSize: 8 }}>{att.label}</Text>
                )
              )}
            </>
          )}
        </View>
      </View>

      {/* ====== TOTALS + SIGNATURE ROW ====== */}
      <View style={styles.totalsSignatureRow}>
        {/* Left: totals */}
        <View style={styles.leftSection}>
          <View style={styles.totalsGrid}>
            {totalLines.map((line, idx) => (
              <View key={`tl-${idx}`} style={styles.totalsLine}>
                <Text style={styles.totalsLabel}>{line.label}</Text>
                <PdfCurrencyText value={line.value} style={styles.totalsValue} />
              </View>
            ))}
            {mainLine && (
              <View style={styles.totalsGrandLine}>
                <Text style={styles.totalsGrandLabel}>{mainLine.label}</Text>
                <PdfCurrencyText value={mainLine.value} style={styles.totalsGrandValue} />
              </View>
            )}
            {amountInWords ? (
              <Text style={styles.amountWords}>{amountInWords}</Text>
            ) : null}
            {balanceDue && (
              <View style={[styles.totalsLine, { marginTop: 8 }]}>
                <Text style={styles.totalsLabel}>{balanceDue.label}</Text>
                <PdfCurrencyText value={balanceDue.value} style={styles.totalsValue} />
              </View>
            )}
          </View>

          {/* Advance block */}
          {isAdvance && advanceSummary && (
            <View style={[styles.advanceBlock, { borderLeftColor: accent }]}>
              <View style={styles.advanceColumn}>
                <Text style={styles.advanceLabel}>{advanceSummary.primaryLabel || 'Advance'}</Text>
                <PdfCurrencyText value={advanceSummary.advanceAmount} style={[styles.advanceValue, { color: accent }]} />
              </View>
              {advanceSummary.secondaryLabel && advanceSummary.balanceRemaining && (
                <>
                  <View style={styles.advanceDivider} />
                  <View style={styles.advanceColumn}>
                    <Text style={styles.advanceLabel}>{advanceSummary.secondaryLabel}</Text>
                    <PdfCurrencyText value={advanceSummary.balanceRemaining} style={[styles.advanceValue, { color: accent }]} />
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* Right: extra fields + signature */}
        <View style={styles.rightSection}>
          {additionalFields.length > 0 && (
            <View style={styles.extraFieldsVertical}>
              {additionalFields.map((field, idx) => (
                <View key={`ef-${idx}`} style={styles.extraFieldItem}>
                  <Text style={styles.extraFieldKey}>{field.label}</Text>
                  <Text style={styles.extraFieldValue}>{field.value}</Text>
                </View>
              ))}
            </View>
          )}
          {signature && (signature.name || signature.imageUrl) && (
            <View style={styles.signatureBox}>
              {signature.imageUrl ? (
                <Image src={signature.imageUrl} style={{ width: 130, height: 40, marginBottom: 4 }} />
              ) : (
                <Text style={styles.signatureScribble}>{signature.name || ''}</Text>
              )}
              {signature.name && (
                <Text style={styles.signatureName}>{signature.name}</Text>
              )}
              {signature.role && (
                <Text style={styles.signatureRole}>{signature.role}</Text>
              )}
            </View>
          )}
        </View>
      </View>

    </Page>
  );
}
