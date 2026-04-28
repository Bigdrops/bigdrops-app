import React from 'react';
import { Page, Text, View, Image, Link } from '@react-pdf/renderer';
import type { IndustryTemplateData } from '../industryAdapter';
import { styles } from './Civicslatestyles';

function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    return safeText(
      objectValue.label ??
        objectValue.name ??
        objectValue.text ??
        objectValue.main ??
        objectValue.value ??
        ''
    );
  }
  return '';
}

// React-PDF will silently drop Links that do not explicitly start with http/https
function formatValidUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export default function Civicslate({ data }: { data: IndustryTemplateData }) {
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
        const widthStyle = col.width ? { width: `${col.width}%` } : { flex: col.flex || 1 };
        return (
          <Text key={col.key || idx} style={[styles.tableHeaderCell, alignStyle, widthStyle]}>
            {safeText(col.label)}
          </Text>
        );
      })}
    </View>
  );

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.invoiceContainer}>
        {/* 1. HEADER */}
        <View style={styles.header}>
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
              {safeText(data.customTitle || (isAdvanceInvoice ? 'Advance Invoice' : data.title))}
            </Text>
            <Text style={styles.docMeta}>
              {safeText(data.documentNumber)} • {safeText(data.issueDate)}
            </Text>
          </View>
        </View>

        {/* 2. ADDRESS & METADATA */}
        <View style={styles.metaSection}>
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
              {data.dueDateOrValidityDate && (
                <View style={styles.customItem}>
                  <Text style={styles.customKey}>{safeText(data.dueDateOrValidityDateLabel)}</Text>
                  <Text style={styles.customVal}>{safeText(data.dueDateOrValidityDate)}</Text>
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
                  <Text style={styles.groupSubtotalVal}>{safeText(row.groupSubtotalValue)}</Text>
                </View>
              );
            }

            const rowStyles = [styles.tableRow, row.isInGroup && styles.groupItemRow].filter(Boolean);
            
            return (
              <View key={rIndex} style={rowStyles} wrap={false}>
                {table.columns.map((col, cIndex) => {
                  const alignStyle = col.align === 'right' ? styles.textRight : col.align === 'center' ? styles.textCenter : styles.textLeft;
                  const widthStyle = col.width ? { width: `${col.width}%` } : { flex: col.flex || 1 };
                  
                  const rawVal = row.cells?.[col.key];
                  const isDescriptionCol = cIndex === 1 || col.key === 'description';

                  return (
                    <View key={cIndex} style={[widthStyle, alignStyle]}>
                      {isDescriptionCol ? (
                        <>
                          <Text style={styles.itemDesc}>
                            {row.isInGroup ? '└ ' : ''}{safeText(rawVal)}
                          </Text>
                          {row.cells?.subDescription && (
                            <Text style={styles.itemSub}>{safeText(row.cells.subDescription)}</Text>
                          )}
                          
                          {row.imageUrl && (
                            <View style={styles.thumbnailContainer} wrap={false}>
                              <Image src={row.imageUrl} style={styles.itemThumbnail} />
                              <Link src={formatValidUrl(row.imageUrl)} style={styles.openImageLink}>
                                Open image
                              </Link>
                            </View>
                          )}
                        </>
                      ) : (
                        <Text style={styles.tableCell}>{safeText(rawVal)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>

        {/* 4. BOTTOM SECTION */}
        <View style={styles.bottomSection} wrap={false}>
          <View style={styles.bottomGrid}>
            <View style={styles.leftCol}>
              {payment && data.showBankDetails && (
                <View>
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

            <View style={styles.rightCol}>
              <View style={styles.totalsPanel}>
                {totals.lines.map((line, idx) => (
                  <View key={idx} style={styles.totalLine}>
                    <Text style={styles.totalLabel}>{safeText(line.label)}</Text>
                    <Text style={styles.totalVal}>{safeText(line.value)}</Text>
                  </View>
                ))}
                
                {totals.mainLine && (
                  <View style={styles.totalLineGrand}>
                    <Text style={styles.totalLabelGrand}>{safeText(totals.mainLine.label)}</Text>
                    <Text style={styles.totalValGrand}>{safeText(totals.mainLine.value)}</Text>
                  </View>
                )}

                {!isAdvanceInvoice && totals.balanceDue && (
                  <View style={styles.totalLineGrand}>
                    <Text style={styles.totalLabelGrand}>{safeText(totals.balanceDue.label)}</Text>
                    <Text style={styles.totalValGrand}>{safeText(totals.balanceDue.value)}</Text>
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
                    <Text style={styles.advanceDueVal}>{safeText(advance.advanceAmount)}</Text>
                  </View>
                  <View style={styles.advanceBal}>
                    <Text style={styles.advanceBalText}>{safeText(advance.secondaryLabel)}</Text>
                    <Text style={styles.advanceBalText}>{safeText(advance.balanceRemaining)}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {data.additionalFields && data.additionalFields.length > 0 && (
            <View style={styles.additionalFieldsBar}>
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
