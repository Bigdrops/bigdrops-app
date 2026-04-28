import React from 'react';
import { Page, Text, View, Image, Link } from '@react-pdf/renderer';
import type { IndustryTemplateData } from '../industryAdapter';
import { styles, resolveAlign } from './NaijabizStyles';

// ---- Safe text helper ----
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

// ---- Design palette defaults (Olive & Stone) ----
const defaultAccent = '#7d8c6d';
const defaultInk = '#2d2d2d';
const defaultMuted = '#8c857b';
const defaultBorder = '#c5bfb0';

export default function Margin({ data }: { data: IndustryTemplateData }) {
  if (!data) return null;

  const {
    title,
    customTitle,
    documentNumber,
    documentNumberLabel: _documentNumberLabel,
    issueDate,
    issueDateLabel: _issueDateLabel,
    dueDateOrValidityDate,
    dueDateOrValidityDateLabel: _dueDateOrValidityDateLabel,
    poNumber,
    poNumberLabel: _poNumberLabel,
    customHeaderFields,
    showBankDetails,
    company,
    client,
    table,
    paymentDetails,
    totals,
    advanceSummary,
    notes,
    terms,
    attachments,
    additionalFields,
    signature,
    footer,
    design,
  } = data;

  const accent = design?.accentColor || defaultAccent;
  const ink = design?.textColor || defaultInk;
  const muted = design?.mutedColor || defaultMuted;
  const border = design?.borderColor || defaultBorder;

  const columns = table?.columns || [];
  const rows = table?.rows || [];

  // Guard totals
  const totalLines = totals?.lines || [];
  const mainLine = totals?.mainLine || null;
  const amountInWords = totals?.amountInWords || '';
  const balanceDue = totals?.balanceDue || null;

  // ---- Sidebar content helpers ----
  const hasCompany = company !== null;
  const hasClient = client !== null;
  const hasCustomFields = customHeaderFields && customHeaderFields.length > 0;
  const hasBank = showBankDetails && paymentDetails !== null;
  const hasSignature = signature !== null && (signature.name || signature.imageUrl);
  const hasAdvance = advanceSummary !== null;

  return (
    <Page size="A4" style={[styles.page, { color: ink }]}>
      {/* ---- FIXED FOOTER ---- */}
      <View fixed style={styles.footer}>
        <Text style={styles.footerLeft}>{footer?.documentNumber || documentNumber}</Text>
        <Text
          style={styles.footerCenter}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
        />
        <Text style={styles.footerRight}>{footer?.companyName || company?.name || ''}</Text>
      </View>

      {/* ======================================== */}
      {/* SIDEBAR                                    */}
      {/* ======================================== */}
      <View style={styles.sidebar}>
        {/* Company */}
        {hasCompany && (
          <View>
            <Text style={styles.sbLogo}>{company.name}</Text>
            <Text style={styles.sbCompanyDetail}>
              {company.address ? `${company.address}\n` : ''}
              {company.cityState ? `${company.cityState}\n` : ''}
              {company.phone ? `${company.phone}\n` : ''}
              {company.email || ''}
            </Text>
          </View>
        )}

        {hasCompany && <View style={styles.sbDivider} />}

        {/* Client */}
        {hasClient && (
          <View style={styles.sbSection}>
            <Text style={styles.sbLabel}>Bill To</Text>
            <Text style={styles.sbValue}>{client.name}</Text>
            {client.address ? <Text style={styles.sbValueSm}>{client.address}</Text> : null}
            {client.cityState ? <Text style={styles.sbValueSm}>{client.cityState}</Text> : null}
            {client.phone ? <Text style={styles.sbValueSm}>{client.phone}</Text> : null}
            {client.email ? <Text style={styles.sbValueSm}>{client.email}</Text> : null}
          </View>
        )}

        {/* Custom header fields */}
        {hasCustomFields &&
          customHeaderFields.map((field, idx) => (
            <View style={styles.sbSection} key={`cf-${idx}`}>
              <Text style={styles.sbLabel}>{field.label}</Text>
              <Text style={styles.sbValueSm}>{field.value}</Text>
            </View>
          ))}

        {/* PO Number (from direct prop, if not in custom fields) */}
        {poNumber && (
          <View style={styles.sbSection}>
            <Text style={styles.sbLabel}>{_poNumberLabel || 'PO Number'}</Text>
            <Text style={styles.sbValueSm}>{poNumber}</Text>
          </View>
        )}

        <View style={styles.sbDivider} />

        {/* Totals */}
        <View style={styles.sbTotals}>
          {totalLines.map((line, idx) => (
            <View style={styles.sbTotalLine} key={`t-${idx}`}>
              <Text>{line.label}</Text>
              <Text>{line.value}</Text>
            </View>
          ))}
          {mainLine && (
            <View style={styles.sbTotalLineGrand}>
              <Text>{mainLine.label}</Text>
              <Text>{mainLine.value}</Text>
            </View>
          )}
          {amountInWords ? (
            <Text style={styles.sbAmountWords}>{amountInWords}</Text>
          ) : null}
          {balanceDue && (
            <View style={[styles.sbTotalLine, { marginTop: 4 }]}>
              <Text>{balanceDue.label}</Text>
              <Text>{balanceDue.value}</Text>
            </View>
          )}
        </View>

        {/* Advance summary */}
        {hasAdvance && (
          <View style={styles.sbAdvance}>
            {advanceSummary.primaryLabel && advanceSummary.advanceAmount && (
              <View style={styles.sbAdvanceLine}>
                <Text>{advanceSummary.primaryLabel}</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  {advanceSummary.advanceAmount}
                </Text>
              </View>
            )}
            {advanceSummary.secondaryLabel && advanceSummary.balanceRemaining && (
              <View style={styles.sbAdvanceLineLast}>
                <Text>{advanceSummary.secondaryLabel}</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                  {advanceSummary.balanceRemaining}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.sbDivider} />

        {/* Bank details */}
        {hasBank && (
          <View style={styles.sbBank}>
            <Text style={[styles.sbLabel, { marginBottom: 2 }]}>Payment Info</Text>
            <Text>
              Bank: <Text style={styles.sbBankStrong}>{paymentDetails.bankName}</Text>
            </Text>
            <Text>
              Account:{' '}
              <Text style={styles.sbBankStrong}>{paymentDetails.accountName}</Text>
            </Text>
            <Text>
              No: <Text style={styles.sbBankStrong}>{paymentDetails.accountNumber}</Text>
            </Text>
            {paymentDetails.sortCode ? (
              <Text>
                Sort: <Text style={styles.sbBankStrong}>{paymentDetails.sortCode}</Text>
              </Text>
            ) : null}
          </View>
        )}

        {/* Signature */}
        {hasSignature && (
          <View style={styles.sbSignature}>
            {signature.imageUrl ? (
              <Image
                src={signature.imageUrl}
                style={{ width: 100, height: 30, marginBottom: 4 }}
              />
            ) : signature.name ? (
              <Text style={styles.sbSigScribble}>{signature.name}</Text>
            ) : null}
            {signature.name && (
              <Text style={styles.sbSigName}>{signature.name}</Text>
            )}
            {signature.role && (
              <Text style={styles.sbSigRole}>{signature.role}</Text>
            )}
          </View>
        )}
      </View>

      {/* ======================================== */}
      {/* MAIN AREA                                 */}
      {/* ======================================== */}
      <View style={styles.mainArea}>
        {/* Document title */}
        <Text style={styles.mainTitle}>
          {customTitle || title || 'Invoice'}
        </Text>
        <Text style={styles.mainMeta}>
          {documentNumber}
          {issueDate ? ` · ${issueDate}` : ''}
        </Text>

        {/* ---- TABLE ---- */}
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colNum]}>#</Text>
            {columns.map((col, ci) => {
              const align = resolveAlign(col.align);
              const widthStyle = col.width
                ? { width: col.width }
                : col.flex
                  ? { flex: col.flex }
                  : {};
              return (
                <Text
                  key={ci}
                  style={[
                    styles.th,
                    widthStyle as any,
                    { ...align },
                  ]}
                >
                  {col.label}
                </Text>
              );
            })}
          </View>

          {/* Rows */}
          {rows.map((row, rowIdx) => {
            // Group header
            if (row.isGroupHeader) {
              return (
                <View key={`gh-${rowIdx}`} style={styles.groupHeaderRow}>
                  <Text style={styles.groupHeaderText}>
                    {row.groupLabel || ''}
                  </Text>
                </View>
              );
            }

            // Group footer (subtotal)
            if (row.isGroupFooter && row.showSubtotal) {
              return (
                <View key={`gf-${rowIdx}`} style={styles.groupSubtotalRow}>
                  {/* Empty cells up to the subtotal */}
                  {columns.map((_col, ci) => {
                    if (ci < columns.length - 2) {
                      return <View key={ci} style={{ flex: 1 }} />;
                    }
                    if (ci === columns.length - 2) {
                      return (
                        <Text
                          key={ci}
                          style={[
                            styles.groupSubtotalLabel,
                            { width: 50, marginRight: 4 },
                          ]}
                        >
                          Subtotal
                        </Text>
                      );
                    }
                    return (
                      <Text
                        key={ci}
                        style={[styles.groupSubtotalValue, { width: 54 }]}
                      >
                        {row.groupSubtotalValue || ''}
                      </Text>
                    );
                  })}
                </View>
              );
            }

            // Normal row
            const cells = row.cells || {};
            const imageUrl = row.imageUrl || null;
            const isInGroup = row.isInGroup || false;

            return (
              <View
                key={`r-${rowIdx}`}
                style={styles.tableRow}
                wrap={false}
              >
                {/* Row number */}
                <Text style={[styles.td, styles.tdNum, styles.colNum]}>
                  {rowIdx + 1}
                </Text>

                {/* Data columns */}
                {columns.map((col, ci) => {
                  const value = cells[col.key];
                  const display = safeText(value);
                  const align = resolveAlign(col.align);
                  const widthStyle = col.width
                    ? { width: col.width }
                    : col.flex
                      ? { flex: col.flex }
                      : { flex: 1 };
                  const isFirstDataCol = ci === 0;

                  return (
                    <View
                      key={ci}
                      style={[
                        styles.td,
                        widthStyle as any,
                        isInGroup && isFirstDataCol
                          ? styles.groupItemIndent
                          : {},
                      ]}
                    >
                      {/* Description column: title + sub + optional thumbnail */}
                      {isFirstDataCol ? (
                        <View style={{ position: 'relative' }}>
                          {isInGroup && (
                            <Text style={styles.groupItemPrefix}>└</Text>
                          )}
                          <Text style={styles.itemTitle}>{display}</Text>
                          {/* Sub-description from second column if available */}
                          {columns.length > 1 &&
                          columns[1] &&
                          cells[columns[1].key] ? (
                            <Text style={styles.itemSub}>
                              {safeText(cells[columns[1].key])}
                            </Text>
                          ) : null}
                          {/* Thumbnail */}
                          {imageUrl ? (
                            <View style={styles.thumbnailRow}>
                              <Image src={imageUrl} style={styles.thumbnailImg} />
                              <Link
                                src={imageUrl}
                                style={styles.openImageLink}
                              >
                                Open image
                              </Link>
                            </View>
                          ) : null}
                        </View>
                      ) : ci === 1 ? (
                        /* Skip — already rendered as sub-description above */
                        <Text />
                      ) : (
                        <Text style={[{ ...align }]}>{display}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* ---- BOTTOM NOTES (after table) ---- */}
        {(notes || terms || additionalFields?.length > 0 || attachments?.length > 0) && (
          <View style={styles.bottomNotes}>
            {notes && (
              <View>
                <Text style={styles.sectionTitle}>{notes.title}</Text>
                <Text style={styles.textBlock}>{notes.content}</Text>
              </View>
            )}
            {terms && (
              <View>
                <Text style={styles.sectionTitle}>{terms.title}</Text>
                <Text style={styles.textBlock}>{terms.content}</Text>
              </View>
            )}
            {additionalFields && additionalFields.length > 0 && (
              <View style={styles.extraFieldsRow}>
                {additionalFields.map((field, idx) => (
                  <View key={`af-${idx}`} style={styles.extraFieldItem}>
                    <Text style={styles.sectionTitle}>{field.label}</Text>
                    <Text style={{ fontSize: 6.5 }}>{field.value}</Text>
                  </View>
                ))}
              </View>
            )}
            {attachments && attachments.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={styles.sectionTitle}>Attachments</Text>
                {attachments.map((att, idx) =>
                  att.url ? (
                    <Link
                      key={`att-${idx}`}
                      src={att.url}
                      style={{
                        fontSize: 6.5,
                        color: '#2b4a3b',
                        textDecoration: 'none',
                        marginBottom: 2,
                      }}
                    >
                      {att.label}
                    </Link>
                  ) : (
                    <Text key={`att-${idx}`} style={{ fontSize: 6.5, marginBottom: 2 }}>
                      {att.label}
                    </Text>
                  )
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Page>
  );
}