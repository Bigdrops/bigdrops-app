import React from 'react';
import { Page, Text, View, Image, Link } from '@react-pdf/renderer';
import type { CommercialDocumentData } from '../industryAdapter';
import { PdfCurrencyText } from '../pdfCurrency';
import { styles } from './LedgerStyles';
import { renderPdfRichText } from '../core/pdfRichText';
import { safeText } from '../core/safeText';
import { getDescriptionMain, getDescriptionSub } from '../core/description';
import {
  buildPartyLines,
  buildAttachmentItems,
  resolveColumnLayout,
  resolveTextAlignment,
  isGroupHeader,
  isGroupFooter,
  getGroupLabel,
  getGroupSubtotal,
  shouldShowGroupSubtotal,
  buildTotalsLines,
  getMainTotal,
  getBalanceDue,
  getAmountInWords,
  buildAdvanceSummary,
} from '../engine';
import { resolveDesignTokens } from '../designTokens';

function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function Ledger({ data }: { data: CommercialDocumentData }) {
  const company = data.company;
  const client = data.client;
  const table = data.table;
  const totals = data.totals;
  const companyLines = company ? buildPartyLines(company) : [];
  const clientLines = client ? buildPartyLines(client) : [];
  const companyLineMap = new Map<string, string>(companyLines.map((line) => [line.type, line.value] as const));
  const clientLineMap = new Map<string, string>(clientLines.map((line) => [line.type, line.value] as const));
  const attachmentItems = buildAttachmentItems(data.attachments);
  const totalsLines = buildTotalsLines(totals);
  const mainTotal = getMainTotal(totals);
  const balanceDue = getBalanceDue(totals);
  const amountInWords = getAmountInWords(totals);
  const advance = buildAdvanceSummary(data.advanceSummary);
  const payment = data.paymentDetails;
  const notes = data.notes;
  const terms = data.terms;
  const footer = data.footer;
  const isAdvanceInvoice = !!advance;

  const tokens = resolveDesignTokens(data.design)
  const c = {
    text: tokens.textColor ? { color: tokens.textColor } : null,
    accent: tokens.accentColor ? { color: tokens.accentColor } : null,
    muted: tokens.mutedColor ? { color: tokens.mutedColor } : null,
    border: tokens.borderColor ? { borderColor: tokens.borderColor } : null,
    surface: tokens.surfaceColor ? { backgroundColor: tokens.surfaceColor } : null,
    headerFont: tokens.headerFont ? { fontFamily: tokens.headerFont } : null,
    bodyFont: tokens.bodyFont ? { fontFamily: tokens.bodyFont } : null,
  }

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow} fixed>
      {table.columns.map((col, idx) => {
        const alignStyle = resolveTextAlignment(col.align) || styles.textLeft;
        const layout = resolveColumnLayout(col);
        const widthStyle = layout.width
          ? { width: layout.width, flexGrow: 0, flexShrink: 0 }
          : { flex: layout.flexGrow, flexGrow: layout.flexGrow, flexShrink: layout.flexShrink, flexBasis: layout.flexBasis };
        return (
          <Text key={col.key || idx} style={[styles.tableHeaderCell, c.text, c.bodyFont, alignStyle, widthStyle as any]}>
            {safeText(col.label)}
          </Text>
        );
      })}
    </View>
  );

  return (
    <Page size={data.layout?.size || 'A4'} orientation={data.layout?.orientation || 'portrait'} style={[styles.page, c.surface]}>
      <View style={styles.invoiceContainer}>
        {/* 1. HEADER */}
        <View style={styles.header} wrap={false}>
          <View style={styles.headerLeft}>
            <Text style={[styles.brandName, c.text, c.headerFont]}>{safeText(companyLineMap.get('name') || company?.name)}</Text>
            {companyLineMap.get('address') && (
              <Text style={[styles.brandContact, c.text]}>
                {safeText(companyLineMap.get('address'))}
                {companyLineMap.get('cityState') ? `, ${safeText(companyLineMap.get('cityState'))}` : ''}
              </Text>
            )}
            {(companyLineMap.get('phone') || companyLineMap.get('email')) && (
              <Text style={[styles.brandContact, c.text]}>
                {[safeText(companyLineMap.get('phone')), safeText(companyLineMap.get('email'))].filter(Boolean).join(' | ')}
              </Text>
            )}
          </View>

          <View style={styles.headerCenter}>
            {company?.companyLogoUrl ? (
              <Image src={company.companyLogoUrl} style={styles.logoBox} />
            ) : null}
          </View>

          <View style={styles.headerRight}>
            <Text style={[styles.docTitle, c.text, c.headerFont]}>
              {safeText(data.title)}
            </Text>
            {data.customTitle ? (
              <Text style={[styles.customTitleText, c.muted]}>
                {safeText(data.customTitle)}
              </Text>
            ) : null}
            <View style={styles.docMetaBlock}>
              <Text style={[styles.docMeta, c.muted]}>
                {safeText(data.documentNumberLabel)}: {safeText(data.documentNumber)}
              </Text>
              {data.issueDate ? (
                <Text style={[styles.docMeta, c.muted]}>
                  {safeText(data.issueDateLabel)}: {safeText(data.issueDate)}
                </Text>
              ) : null}
              {data.dueDateOrValidityDate ? (
                <Text style={[styles.docMeta, c.muted]}>
                  {safeText(data.dueDateOrValidityDateLabel)}: {safeText(data.dueDateOrValidityDate)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* 2. ADDRESS & METADATA */}
        <View style={styles.metaSection} wrap={false}>
          <View style={styles.addressPanel}>
            {client && (
              <View style={styles.addressBlock}>
                <Text style={[styles.addressLabel, c.accent, c.headerFont]}>Bill To</Text>
                <Text style={[styles.addressVal, c.text]}>{safeText(clientLineMap.get('name'))}</Text>
                {clientLineMap.get('address') && <Text style={[styles.addressVal, c.text]}>{safeText(clientLineMap.get('address'))}</Text>}
                {clientLineMap.get('cityState') && <Text style={[styles.addressVal, c.text]}>{safeText(clientLineMap.get('cityState'))}</Text>}
                {clientLineMap.get('email') && <Text style={[styles.addressVal, c.text]}>{safeText(clientLineMap.get('email'))}</Text>}
                {clientLineMap.get('phone') && <Text style={[styles.addressVal, c.text]}>{safeText(clientLineMap.get('phone'))}</Text>}
              </View>
            )}
          </View>

          <View style={styles.customHeadersPanel}>
            <View style={styles.customHeadersWrap}>
              {data.poNumber && (
                <View style={styles.customItem}>
                  <Text style={[styles.customKey, c.muted]}>{safeText(data.poNumberLabel)}</Text>
                  <Text style={[styles.customVal, c.text]}>{safeText(data.poNumber)}</Text>
                </View>
              )}
              {data.customHeaderFields?.map((field, idx) => (
                <View key={idx} style={styles.customItem}>
                  <Text style={[styles.customKey, c.muted]}>{safeText(field.label)}</Text>
                  <Text style={[styles.customVal, c.text]}>{safeText(field.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 3. TABLE SECTION */}
        <View style={styles.tableSection}>
          {renderTableHeader()}

          {table.rows.map((row, rIndex) => {
            if (isGroupHeader(row)) {
              return (
                <View key={rIndex} style={styles.groupHeader} wrap={false}>
                  <Text style={[styles.groupHeaderText, c.text, c.headerFont]}>{safeText(toTitleCase(getGroupLabel(row)))}</Text>
                </View>
              );
            }

            if (isGroupFooter(row)) {
              const subtotalValue = getGroupSubtotal(row);
              const showSubtotal = shouldShowGroupSubtotal(row) && subtotalValue !== null && subtotalValue !== undefined && subtotalValue !== '';

              if (!showSubtotal) {
                return <View key={rIndex} style={[styles.groupClosingRule, c.border]} wrap={false} />;
              }

              return (
                <View key={rIndex} wrap={false}>
                  <View style={styles.groupSubtotalRow}>
                    <Text style={[styles.groupSubtotalLabel, c.text]}>Subtotal</Text>
                    <PdfCurrencyText value={safeText(subtotalValue)} style={[styles.groupSubtotalVal, c.text]} />
                  </View>
                  <View style={[styles.groupClosingRule, c.border]} />
                </View>
              );
            }

            const rowStyles = [styles.tableRow].filter(Boolean);
            
            return (
              <View key={rIndex} style={rowStyles} wrap={false}>
                {table.columns.map((col, cIndex) => {
                  const alignStyle = resolveTextAlignment(col.align) || styles.textLeft;
                  const layout = resolveColumnLayout(col);
                  const widthStyle = layout.width
                    ? { width: layout.width, flexGrow: 0, flexShrink: 0 }
                    : { flex: layout.flexGrow, flexGrow: layout.flexGrow, flexShrink: layout.flexShrink, flexBasis: layout.flexBasis };
                  
                  const isDescriptionCol = col.key === 'description';

                  return (
                    <View key={cIndex} style={[widthStyle as any, alignStyle]}>
                      {isDescriptionCol ? (
                        <>
                          <Text style={[styles.itemDesc, c.text]}>
                            {getDescriptionMain(row.cells)}
                          </Text>
                          {getDescriptionSub(row.cells) ? (
                            <Text style={[styles.itemSub, c.muted]}>{getDescriptionSub(row.cells)}</Text>
                          ) : null}
                          
                          {row.imageUrl ? (
                            <View style={styles.thumbnailContainer} wrap={false}>
                              <Image src={row.imageUrl} style={styles.itemThumbnail} />
                              <Link src={row.imageUrl.startsWith('http://') || row.imageUrl.startsWith('https://') ? row.imageUrl : `https://${row.imageUrl}`} style={styles.openImageLink}>
                                Open image
                              </Link>
                            </View>
                          ) : null}
                        </>
                      ) : (
                    <PdfCurrencyText value={safeText(row.cells?.[col.key])} style={[styles.tableCell, c.text]} />
                  )}
                </View>
              );
            })}
              </View>
            );
          })}
        </View>

        {/* 4. BOTTOM SECTION */}
        <View style={styles.bottomSection}>
          <View style={styles.bottomPrimaryRow} wrap={false}>
            <View style={styles.paymentCol}>
              {payment && data.showBankDetails && (
                <View wrap={false}>
                  <Text style={[styles.sectionTitle, c.accent, c.headerFont]}>Payment Information</Text>
                  <View style={styles.bankDetails}>
                    {payment.bankName && (
                      <View style={styles.bankRow}>
                        <Text style={[styles.bankLabel, c.muted]}>Bank:</Text>
                        <Text style={[styles.bankVal, c.text]}>{safeText(payment.bankName)}</Text>
                      </View>
                    )}
                    {payment.accountName && (
                      <View style={styles.bankRow}>
                        <Text style={[styles.bankLabel, c.muted]}>Account Name:</Text>
                        <Text style={[styles.bankVal, c.text]}>{safeText(payment.accountName)}</Text>
                      </View>
                    )}
                    {payment.accountNumber && (
                      <View style={styles.bankRow}>
                        <Text style={[styles.bankLabel, c.muted]}>Account No:</Text>
                        <Text style={[styles.bankVal, c.text]}>{safeText(payment.accountNumber)}</Text>
                      </View>
                    )}
                    {payment.sortCode && (
                      <View style={styles.bankRow}>
                        <Text style={[styles.bankLabel, c.muted]}>Sort Code:</Text>
                        <Text style={[styles.bankVal, c.text]}>{safeText(payment.sortCode)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

            </View>

            <View style={styles.totalsWrap} wrap={false}>
              <View style={styles.rightCol}>
                <View style={styles.totalsPanel}>
                  {totalsLines.map((line, idx) => (
                    <View key={idx} style={styles.totalLine}>
                      <Text style={[styles.totalLabel, c.muted]}>{safeText(line.label)}</Text>
                      <PdfCurrencyText value={safeText(line.value)} style={[styles.totalVal, c.text]} />
                    </View>
                  ))}
                  
                  {mainTotal && (
                    <View style={styles.totalLineGrand}>
                      <Text style={[styles.totalLabelGrand, c.text, c.headerFont]}>{safeText(mainTotal.label)}</Text>
                      <PdfCurrencyText value={safeText(mainTotal.value)} style={[styles.totalValGrand, c.text, c.headerFont]} />
                    </View>
                  )}

                  {!isAdvanceInvoice && balanceDue && (
                    <View style={styles.totalLineGrand}>
                      <Text style={[styles.totalLabelGrand, c.text, c.headerFont]}>{safeText(balanceDue.label)}</Text>
                      <PdfCurrencyText value={safeText(balanceDue.value)} style={[styles.totalValGrand, c.text, c.headerFont]} />
                    </View>
                  )}
                  
                  {amountInWords && (
                    <Text style={[styles.amountWords, c.muted]}>{safeText(amountInWords)}</Text>
                  )}
                </View>

                {isAdvanceInvoice && advance && (
                  <View style={styles.advanceBlock}>
                    <View style={styles.advanceDue}>
                      <Text style={[styles.advanceDueLbl, c.accent, c.headerFont]}>{safeText(advance.primaryLabel)}</Text>
                      <PdfCurrencyText value={safeText(advance.advanceAmount)} style={[styles.advanceDueVal, c.accent, c.headerFont]} />
                    </View>
                    <View style={styles.advanceBal}>
                      <Text style={[styles.advanceBalText, c.muted]}>{safeText(advance.secondaryLabel)}</Text>
                      <PdfCurrencyText value={safeText(advance.balanceRemaining)} style={[styles.advanceBalTextVal, c.text]} />
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          {(notes?.content || terms?.content) && (
            <View style={styles.leftFlowCol}>
              {notes?.content && (
                <View>
                  <Text style={[styles.sectionTitle, c.accent, c.headerFont]}>{safeText(notes.title)}</Text>
                  {renderPdfRichText(notes.content, {
                    containerStyle: styles.notesRichText,
                    paragraphStyle: styles.notesParagraph,
                    listStyle: styles.notesList,
                    listItemRowStyle: styles.notesListItemRow,
                    listMarkerStyle: styles.notesListMarker,
                    listItemTextStyle: styles.notesListItemText,
                    fallbackTextStyle: styles.textBlock,
                  }) || <Text style={styles.textBlock}>{notes.plainText || ''}</Text>}
                </View>
              )}

              {terms?.content && (
                <View>
                  <Text style={[styles.sectionTitle, c.accent, c.headerFont]}>{safeText(terms.title)}</Text>
                  {renderPdfRichText(terms.content, {
                    containerStyle: styles.notesRichText,
                    paragraphStyle: styles.notesParagraph,
                    listStyle: styles.notesList,
                    listItemRowStyle: styles.notesListItemRow,
                    listMarkerStyle: styles.notesListMarker,
                    listItemTextStyle: styles.notesListItemText,
                    fallbackTextStyle: styles.textBlock,
                  }) || <Text style={styles.textBlock}>{terms.plainText || ''}</Text>}
                </View>
              )}
            </View>
          )}

          {data.additionalFields && data.additionalFields.length > 0 && (
            <View style={styles.additionalFieldsBar} wrap={false}>
              {data.additionalFields.map((field, idx) => (
                <View key={idx} style={styles.customItem}>
                  <Text style={[styles.customKey, c.muted]}>{safeText(field.label)}</Text>
                  <Text style={[styles.customVal, c.text]}>{safeText(field.value)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.footerMetaGrid}>
            <View style={styles.signatureBox}>
              {data.signature ? (
                <>
                  {data.signature.imageUrl ? (
                    <Image src={data.signature.imageUrl} style={styles.signatureImg} />
                  ) : (
                    <View style={[styles.sigLineFallback, c.border]} />
                  )}
                  {data.signature.name && <Text style={[styles.sigName, c.text, c.headerFont]}>{safeText(data.signature.name)}</Text>}
                  {data.signature.role && <Text style={[styles.sigRole, c.muted]}>{safeText(data.signature.role)}</Text>}
                </>
              ) : null}
            </View>

            {attachmentItems.length > 0 && (
              <View style={styles.attachmentsBox}>
                <Text style={[styles.sectionTitle, c.accent, c.headerFont]}>Attachments</Text>
                {attachmentItems.map((att, idx) => (
                  <View key={idx} style={styles.attachmentItem}>
                    {att.formattedUrl ? (
                      <Link src={att.formattedUrl} style={styles.attachmentLink}>
                        {safeText(att.label)}
                      </Link>
                    ) : (
                      <Text style={styles.attachmentLink}>{safeText(att.label)}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 7. FIXED PAGE FOOTER */}
      <View fixed style={[styles.pageFooter, c.surface]}>
        <Text style={[styles.ftLeft, c.muted]}>{safeText(footer?.documentNumber)}</Text>
        <Text style={[styles.ftCenter, c.muted]} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        <Text style={[styles.ftRight, c.muted]}>
          {[safeText(footer?.companyName), safeText(footer?.extraText)].filter(Boolean).join(' • ')}
        </Text>
      </View>
    </Page>
  );
}
