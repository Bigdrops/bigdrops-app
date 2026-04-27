import { Page, Text, View, Image, Link } from '@react-pdf/renderer';
import { styles, resolveAlignment } from './Naijabizstyles';
import type { IndustryTemplateData } from '../industryAdapter';
import { isTightTokenColumn, keepPdfWordUnbroken, resolveTemplateTableColumnStyle } from '../templateTableLayout';

export default function Template({ data }: { data: IndustryTemplateData }) {
  const accentColor = data.design?.accentColor || '#0f172a';
  const textColor = data.design?.textColor || '#334155';
  const mutedColor = data.design?.mutedColor || '#64748b';
  const borderColor = data.design?.borderColor || '#e2e8f0';
  const surfaceColor = data.design?.surfaceColor || '#f8fafc';

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brand}>
          {data.company?.companyLogoUrl && (
            <Image src={data.company.companyLogoUrl} style={{ width: 120, height: 40, objectFit: 'contain', marginBottom: 8 }} />
          )}
          <Text style={[styles.brandName, { color: textColor }]}>
            {data.company?.name || 'Company Name'}
          </Text>
          {data.company?.tagline && data.showTagline && (
            <Text style={[styles.brandMeta, { color: mutedColor }]}>{data.company.tagline}</Text>
          )}
          {data.company?.customInfo?.map((info, idx) => (
            <Text key={idx} style={[styles.brandMeta, { color: mutedColor }]}>
              {info.label}: {info.value}
            </Text>
          ))}
        </View>
        <View style={styles.invoiceMeta}>
          <Text style={[styles.metaLabel, { color: mutedColor }]}>{data.documentNumberLabel}</Text>
          <Text style={[styles.metaValue, { color: textColor }]}>{data.documentNumber}</Text>
          {data.issueDate && (
            <>
              <Text style={[styles.metaLabel, { color: mutedColor }]}>{data.issueDateLabel}</Text>
              <Text style={[styles.metaValue, { color: textColor }]}>{data.issueDate}</Text>
            </>
          )}
          {data.dueDateOrValidityDate && (
            <>
              <Text style={[styles.metaLabel, { color: mutedColor }]}>{data.dueDateOrValidityDateLabel}</Text>
              <Text style={[styles.metaValue, { color: textColor }]}>{data.dueDateOrValidityDate}</Text>
            </>
          )}
          {data.poNumber && (
            <>
              <Text style={[styles.metaLabel, { color: mutedColor }]}>{data.poNumberLabel}</Text>
              <Text style={[styles.metaValue, { color: textColor }]}>{data.poNumber}</Text>            </>
          )}
          {data.customHeaderFields?.map((field, idx) => (
            <View key={idx} style={{ marginBottom: 6 }}>
              <Text style={[styles.metaLabel, { color: mutedColor }]}>{field.label}</Text>
              <Text style={[styles.metaValue, { color: textColor }]}>{field.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Addresses */}
      <View style={styles.addresses}>
        {data.client && (
          <View style={styles.addressBox}>
            <Text style={[styles.addressLabel, { color: mutedColor }]}>Bill To</Text>
            <View style={styles.addressText}>
              <Text style={{ fontWeight: 'bold', color: textColor }}>{data.client.name}</Text>
              {data.client.address && <Text>{data.client.address}</Text>}
              {data.client.cityState && <Text>{data.client.cityState}</Text>}
              {data.client.phone && <Text>{data.client.phone}</Text>}
              {data.client.email && <Text>{data.client.email}</Text>}
            </View>
          </View>
        )}
        {data.company && (
          <View style={[styles.addressBox, styles.textRight]}>
            <Text style={[styles.addressLabel, { color: mutedColor }]}>From</Text>
            <View style={[styles.addressText, styles.textRight]}>
              <Text style={{ fontWeight: 'bold', color: textColor }}>{data.company.name}</Text>
              {data.company.address && <Text>{data.company.address}</Text>}
              {data.company.cityState && <Text>{data.company.cityState}</Text>}
              {data.company.phone && <Text>{data.company.phone}</Text>}
              {data.company.email && <Text>{data.company.email}</Text>}
            </View>
          </View>
        )}
      </View>

      {/* Table */}
      <View style={styles.table}>
        {/* Header Row */}
        <View style={[styles.tableHeader, { backgroundColor: accentColor }]}>
          {data.table.columns.map((col) => (
            <View
              key={col.key}
              style={{
                ...resolveTemplateTableColumnStyle(col),
                paddingHorizontal: 4,              }}
            >
              <Text style={[styles.tableHeaderCell, resolveAlignment(col.align)]}>{col.label}</Text>
            </View>
          ))}
        </View>

        {/* Body Rows */}
        {data.table.rows.map((row, rowIndex) => {
          if (row.isGroupHeader) {
            return (
              <View key={`gh-${rowIndex}`} style={styles.groupHeader}>
                <Text style={styles.groupHeaderLabel}>{row.groupLabel}</Text>
              </View>
            );
          }

          if (row.isGroupFooter && row.showSubtotal) {
            return (
              <View key={`gf-${rowIndex}`} style={styles.groupFooter}>
                <Text style={styles.groupSubtotalLabel}>Subtotal</Text>
                <Text style={styles.groupSubtotalValue}>{row.groupSubtotalValue}</Text>
              </View>
            );
          }

          return (
            <View
              key={`row-${rowIndex}`}
              style={[
                styles.tableRow,
                rowIndex === data.table.rows.length - 1 && styles.tableRowLast,
                row.isInGroup && ({ borderLeftWidth: 2, borderLeftColor: surfaceColor, paddingLeft: 12 } as any),
              ] as any}
            >
              {data.table.columns.map((col) => {
                const cellValue = row.cells?.[col.key];
                const isDescription = col.key === 'description' || col.key === 'item';
                const isTightToken = isTightTokenColumn(col.key);
                return (
                  <View
                    key={col.key}
                    style={{
                      ...resolveTemplateTableColumnStyle(col),
                      paddingHorizontal: 4,
                    }}
                  >
                    {isDescription && row.imageUrl && (
                      <Image src={row.imageUrl} style={styles.tableCellImage} />                    )}
                    <Text
                      style={[styles.tableCell, resolveAlignment(col.align), { color: textColor }]}
                      wrap={isTightToken ? false : undefined}
                      hyphenationCallback={isTightToken ? keepPdfWordUnbroken : undefined}
                    >
                      {cellValue as any}
                    </Text>
                    {isDescription && row.cells?.descriptionSub && (
                      <Text style={[styles.tableCellSub, { color: mutedColor }]}>{row.cells.descriptionSub as any}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsBox}>
          {data.totals.lines.map((line, idx) => (
            <View key={idx} style={styles.totalRow}>
              <Text style={{ color: textColor }}>{line.label}</Text>
              <Text style={{ color: textColor }}>{line.value}</Text>
            </View>
          ))}
          {data.totals.mainLine && (
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={{ color: accentColor }}>{data.totals.mainLine.label}</Text>
              <Text style={{ color: accentColor }}>{data.totals.mainLine.value}</Text>
            </View>
          )}
          {data.totals.amountInWords && (
            <Text style={[styles.totalRow, { fontSize: 9, color: mutedColor, marginTop: 8 }]}>
              {data.totals.amountInWords}
            </Text>
          )}
          {data.totals.balanceDue && (
            <View style={[styles.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: borderColor }]}>
              <Text style={{ fontWeight: 'bold', color: textColor }}>{data.totals.balanceDue.label}</Text>
              <Text style={{ fontWeight: 'bold', color: textColor }}>{data.totals.balanceDue.value}</Text>
            </View>
          )}

          {/* Advance Summary - renders AFTER normal totals if present */}
          {data.advanceSummary && (
            <View style={styles.advanceSummary}>
              {data.advanceSummary.primaryLabel && data.advanceSummary.advanceAmount && (
                <View style={[styles.advanceRow, styles.justifyBetween]}>
                  <Text style={styles.advanceLabel}>{data.advanceSummary.primaryLabel}</Text>
                  <Text style={styles.advanceValue}>{data.advanceSummary.advanceAmount}</Text>
                </View>              )}
              {data.advanceSummary.secondaryLabel && data.advanceSummary.balanceRemaining && (
                <View style={[styles.advanceRow, styles.advanceRowLast, styles.justifyBetween]}>
                  <Text style={styles.advanceLabel}>{data.advanceSummary.secondaryLabel}</Text>
                  <Text style={styles.advanceValue}>{data.advanceSummary.balanceRemaining}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Bank Details */}
      {data.showBankDetails && data.paymentDetails && (
        <View style={styles.bankSection}>
          <Text style={styles.bankTitle}>Bank Transfer Details</Text>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Bank</Text>
            <Text style={styles.bankValue}>{data.paymentDetails.bankName}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Name</Text>
            <Text style={styles.bankValue}>{data.paymentDetails.accountName}</Text>
          </View>
          <View style={styles.bankRow}>
            <Text style={styles.bankLabel}>Account Number</Text>
            <Text style={styles.bankValue}>{data.paymentDetails.accountNumber}</Text>
          </View>
          {data.paymentDetails.sortCode && (
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Sort Code</Text>
              <Text style={styles.bankValue}>{data.paymentDetails.sortCode}</Text>
            </View>
          )}
        </View>
      )}

      {/* Notes */}
      {data.notes?.content && (
        <View style={styles.notesSection}>
          <Text style={[styles.notesTitle, { color: textColor }]}>{data.notes.title || 'Notes'}</Text>
          <Text style={[styles.notesContent, { color: mutedColor }]}>{data.notes.content}</Text>
        </View>
      )}

      {/* Terms */}
      {data.terms?.content && (
        <View style={styles.notesSection}>
          <Text style={[styles.notesTitle, { color: textColor }]}>{data.terms.title || 'Terms'}</Text>
          <Text style={[styles.notesContent, { color: mutedColor }]}>{data.terms.content}</Text>        </View>
      )}

      {/* Signature */}
      {data.signature && (data.signature.imageUrl || data.signature.name) && (
        <View style={styles.signatureSection}>
          {data.signature.imageUrl && <Image src={data.signature.imageUrl} style={styles.signatureImage} />}
          {data.signature.name && <Text style={styles.signatureName}>{data.signature.name}</Text>}
          {data.signature.role && <Text style={styles.signatureRole}>{data.signature.role}</Text>}
        </View>
      )}

      {/* Attachments */}
      {data.attachments?.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={[styles.notesTitle, { color: textColor }]}>Attachments</Text>
          {data.attachments.map((att, idx) => (
            <Text key={idx} style={{ fontSize: 9, color: mutedColor, marginBottom: 4 }}>
              {att.url ? <Link src={att.url}>{att.label}</Link> : att.label}
            </Text>
          ))}
        </View>
      )}

      {/* Additional Fields */}
      {data.additionalFields?.map((field, idx) => (
        <View key={idx} style={{ marginBottom: 6 }}>
          <Text style={{ fontSize: 9, color: mutedColor }}>{field.label}: <Text style={{ color: textColor, fontWeight: 'bold' }}>{field.value}</Text></Text>
        </View>
      ))}

      {/* Fixed Footer */}
      <View fixed style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text>{data.footer.documentNumber}</Text>
        </View>
        <View style={styles.footerRight}>
          <Text>{data.footer.companyName}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          {data.footer.extraText && <Text>{data.footer.extraText}</Text>}
        </View>
      </View>
    </Page>
  );
}
