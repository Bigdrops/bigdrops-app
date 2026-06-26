import React from 'react';
import { Page, Text, View, Image, Link } from '@react-pdf/renderer';
import type { PdfTemplateData } from '../industryAdapter';
import { PdfCurrencyText } from '../pdfCurrency';
import { styles } from './LedgerStyles';
import { safeText } from '../core/safeText';
import { getDescriptionMain, getDescriptionSub } from '../core/description';

function formatValidUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export default function Ledger({ data }: { data: PdfTemplateData }) {
  const company = data.company;
  const client = data.client;
  const table = data.table;
  const totals = data.totals;
  const advance = data.advanceSummary;
  const payment = data.paymentDetails;
  const notes = data.notes;
  const terms = data.terms;
  const footer = data.footer;
  const isAdvanceInvoice = !!advance;

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow} fixed>
      {table.columns.map((col, idx) => {
        const alignStyle = col.align === 'right' ? styles.textRight : col.align === 'center' ? styles.textCenter : styles.textLeft;
        const widthStyle = col.width ? { width: col.width, flexGrow: 0, flexShrink: 0 } : { flex: col.flex || 1, flexBasis: 0 };
        return (
          <Text key={col.key || idx} style={[styles.tableHeaderCell, alignStyle, widthStyle as any]}>
            {safeText(col.label)}
          </Text>
        );
      })}
    </View>
  );

  return (
    <Page size={data.layout?.size || 'A4'} orientation={data.layout?.orientation || 'portrait'} style={styles.page}>
      <View style={styles.invoiceContainer}>
        {/* 1. HEADER */}
        <View style={styles.header} wrap={false}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandName}>{safeText(company?.name)}</Text>
            {company?.address && (
              <Text style={styles.brandContact}>
                {safeText(company.address)}
                {company.cityState ? `, ${safeText(company.cityState)}` : ''}
              </Text>
            )}
            {(company?.phone || company?.email) && (
              <Text style={styles.brandContact}>
                {[safeText(company?.phone), safeText(company?.email)].filter(Boolean).join(' | ')}
              </Text>
            )}
          </View>

          <View style={styles.headerCenter}>
            {company?.companyLogoUrl ? (
              <Image src={company.companyLogoUrl} style={styles.logoBox} />
            ) : null}
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>
              {safeText(data.title)}
            </Text>
            {data.customTitle ? (
              <Text style={styles.customTitleText}>
                {safeText(data.customTitle)}
              </Text>
            ) : null}
            <View style={styles.docMetaBlock}>
              <Text style={styles.docMeta}>
                {safeText(data.documentNumberLabel)}: {safeText(data.documentNumber)}
              </Text>
              {data.issueDate ? (
                <Text style={styles.docMeta}>
                  {safeText(data.issueDateLabel)}: {safeText(data.issueDate)}
                </Text>
              ) : null}
              {data.dueDateOrValidityDate ? (
                <Text style={styles.docMeta}>
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
                <Text style={styles.addressLabel}>Bill To</Text>
                <Text style={styles.addressVal}>{safeText(client.name)}</Text>
                {client.address && <Text style={styles.addressVal}>{safeText(client.address)}</Text>}
                {client.cityState && <Text style={styles.addressVal}>{safeText(client.cityState)}</Text>}
                {client.email && <Text style={styles.addressVal}>{safeText(client.email)}</Text>}
                {client.phone && <Text style={styles.addressVal}>{safeText(client.phone)}</Text>}
              </View>
            )}
          </View>

          <View style={styles.customHeadersPanel}>
            <View style={styles.customHeadersWrap}>
              {data.poNumber && (
                <View style={styles.customItem}>
                  <Text style={styles.customKey}>{safeText(data.poNumberLabel)}</Text>
                  <Text style={styles.customVal}>{safeText(data.poNumber)}</Text>
                </View>
              )}
              {data.customHeaderFields?.map((field, idx) => (
                <View key={idx} style={styles.customItem}>
                  <Text style={styles.customKey}>{safeText(field.label)}</Text>
                  <Text style={styles.customVal}>{safeText(field.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 3. TABLE SECTION */}
        <View style={styles.tableSection}>
          {renderTableHeader()}

          {table.rows.map((row, rIndex) => {
            if (row.rowType === 'group_header') {
              return (
                <View key={rIndex} style={styles.groupHeader} wrap={false}>
                  <Text style={styles.groupHeaderText}>{safeText(row.groupLabel)}</Text>
                </View>
              );
            }

            if (row.rowType === 'group_footer') {
              return (
                <View key={rIndex} style={styles.groupSubtotalRow} wrap={false}>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.groupSubtotalLabel}>Group Total:</Text>
                  <PdfCurrencyText value={safeText(row.groupSubtotalValue)} style={styles.groupSubtotalVal} />
                </View>
              );
            }

            const rowStyles = [styles.tableRow, row.isInGroup && styles.groupItemRow].filter(Boolean);
            
            return (
              <View key={rIndex} style={rowStyles} wrap={false}>
                {table.columns.map((col, cIndex) => {
                  const alignStyle = col.align === 'right' ? styles.textRight : col.align === 'center' ? styles.textCenter : styles.textLeft;
                  const widthStyle = col.width ? { width: col.width, flexGrow: 0, flexShrink: 0 } : { flex: col.flex || 1, flexBasis: 0 };
                  
                  const isDescriptionCol = col.key === 'description';

                  return (
                    <View key={cIndex} style={[widthStyle as any, alignStyle]}>
                      {isDescriptionCol ? (
                        <>
                          <Text style={styles.itemDesc}>
                            {row.isInGroup ? '└ ' : ''}{getDescriptionMain(row.cells)}
                          </Text>
                          {getDescriptionSub(row.cells) ? (
                            <Text style={styles.itemSub}>{getDescriptionSub(row.cells)}</Text>
                          ) : null}
                          
                          {row.imageUrl ? (
                            <View style={styles.thumbnailContainer} wrap={false}>
                              <Image src={row.imageUrl} style={styles.itemThumbnail} />
                              <Link src={formatValidUrl(row.imageUrl)} style={styles.openImageLink}>
                                Open image
                              </Link>
                            </View>
                          ) : null}
                        </>
                      ) : (
                        <PdfCurrencyText value={safeText(row.cells?.[col.key])} style={styles.tableCell} />
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
                  <Text style={styles.sectionTitle}>Payment Information</Text>
                  <View style={styles.bankDetails}>
                    {payment.bankName && (
                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Bank:</Text>
                        <Text style={styles.bankVal}>{safeText(payment.bankName)}</Text>
                      </View>
                    )}
                    {payment.accountName && (
                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Account Name:</Text>
                        <Text style={styles.bankVal}>{safeText(payment.accountName)}</Text>
                      </View>
                    )}
                    {payment.accountNumber && (
                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Account No:</Text>
                        <Text style={styles.bankVal}>{safeText(payment.accountNumber)}</Text>
                      </View>
                    )}
                    {payment.sortCode && (
                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Sort Code:</Text>
                        <Text style={styles.bankVal}>{safeText(payment.sortCode)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

            </View>

            <View style={styles.totalsWrap} wrap={false}>
              <View style={styles.rightCol}>
                <View style={styles.totalsPanel}>
                  {totals.lines.map((line, idx) => (
                    <View key={idx} style={styles.totalLine}>
                      <Text style={styles.totalLabel}>{safeText(line.label)}</Text>
                      <PdfCurrencyText value={safeText(line.value)} style={styles.totalVal} />
                    </View>
                  ))}
                  
                  {totals.mainLine && (
                    <View style={styles.totalLineGrand}>
                      <Text style={styles.totalLabelGrand}>{safeText(totals.mainLine.label)}</Text>
                      <PdfCurrencyText value={safeText(totals.mainLine.value)} style={styles.totalValGrand} />
                    </View>
                  )}

                  {!isAdvanceInvoice && totals.balanceDue && (
                    <View style={styles.totalLineGrand}>
                      <Text style={styles.totalLabelGrand}>{safeText(totals.balanceDue.label)}</Text>
                      <PdfCurrencyText value={safeText(totals.balanceDue.value)} style={styles.totalValGrand} />
                    </View>
                  )}
                  
                  {totals.amountInWords && (
                    <Text style={styles.amountWords}>{safeText(totals.amountInWords)}</Text>
                  )}
                </View>

                {isAdvanceInvoice && advance && (
                  <View style={styles.advanceBlock}>
                    <View style={styles.advanceDue}>
                      <Text style={styles.advanceDueLbl}>{safeText(advance.primaryLabel)}</Text>
                      <PdfCurrencyText value={safeText(advance.advanceAmount)} style={styles.advanceDueVal} />
                    </View>
                    <View style={styles.advanceBal}>
                      <Text style={styles.advanceBalText}>{safeText(advance.secondaryLabel)}</Text>
                      <PdfCurrencyText value={safeText(advance.balanceRemaining)} style={styles.advanceBalTextVal} />
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
                  <Text style={styles.sectionTitle}>{safeText(notes.title)}</Text>
                  <Text style={styles.textBlock}>{safeText(notes.content)}</Text>
                </View>
              )}

              {terms?.content && (
                <View>
                  <Text style={styles.sectionTitle}>{safeText(terms.title)}</Text>
                  <Text style={styles.textBlock}>{safeText(terms.content)}</Text>
                </View>
              )}
            </View>
          )}

          {data.additionalFields && data.additionalFields.length > 0 && (
            <View style={styles.additionalFieldsBar} wrap={false}>
              {data.additionalFields.map((field, idx) => (
                <View key={idx} style={styles.customItem}>
                  <Text style={styles.customKey}>{safeText(field.label)}</Text>
                  <Text style={styles.customVal}>{safeText(field.value)}</Text>
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
                    <View style={styles.sigLineFallback} />
                  )}
                  {data.signature.name && <Text style={styles.sigName}>{safeText(data.signature.name)}</Text>}
                  {data.signature.role && <Text style={styles.sigRole}>{safeText(data.signature.role)}</Text>}
                </>
              ) : null}
            </View>

            {data.attachments && data.attachments.length > 0 && (
              <View style={styles.attachmentsBox}>
                <Text style={styles.sectionTitle}>Attachments</Text>
                {data.attachments.map((att, idx) => (
                  <View key={idx} style={styles.attachmentItem}>
                    {att.url ? (
                      <Link src={formatValidUrl(att.url)} style={styles.attachmentLink}>
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
      <View fixed style={styles.pageFooter}>
        <Text style={styles.ftLeft}>{safeText(footer?.documentNumber)}</Text>
        <Text style={styles.ftCenter} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        <Text style={styles.ftRight}>
          {[safeText(footer?.companyName), safeText(footer?.extraText)].filter(Boolean).join(' • ')}
        </Text>
      </View>
    </Page>
  );
}
