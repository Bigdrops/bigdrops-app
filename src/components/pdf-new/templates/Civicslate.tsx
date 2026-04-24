import { Page, Text, View, Image, Link } from '@react-pdf/renderer';
import { styles, resolveAlignment } from './Civicslatestyles';
import type { IndustryTemplateData } from '../industryAdapter';

export default function Template({ data }: { data: IndustryTemplateData }) {
  const accent = data.design.accentColor || '#2F3A44';
  const text = data.design.textColor || '#1F2933';
  const muted = data.design.mutedColor || '#7B8794';
  const border = data.design.borderColor || '#E4DFD2';
  const surface = data.design.surfaceColor || '#F3EFE6';

  const metaRows = [
    { label: data.documentNumberLabel, value: data.documentNumber },
    data.issueDate ? { label: data.issueDateLabel, value: data.issueDate } : null,
    data.dueDateOrValidityDate
      ? { label: data.dueDateOrValidityDateLabel, value: data.dueDateOrValidityDate }
      : null,
    data.poNumber ? { label: data.poNumberLabel, value: data.poNumber } : null,
    ...data.customHeaderFields,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const renderAddress = (
    entity:
      | IndustryTemplateData['company']
      | IndustryTemplateData['client']
      | null
  ) => {
    if (!entity) return null;

    return (
      <>
        <Text style={[styles.partyName, { color: text }]}>{entity.name}</Text>
        {!!entity.address && <Text style={[styles.mutedText, { color: muted }]}>{entity.address}</Text>}
        {!!entity.cityState && <Text style={[styles.mutedText, { color: muted }]}>{entity.cityState}</Text>}
        {!!entity.phone && <Text style={[styles.mutedText, { color: muted }]}>{entity.phone}</Text>}
        {!!entity.email && <Text style={[styles.mutedText, { color: muted }]}>{entity.email}</Text>}
      </>
    );
  };

  const renderCellValue = (value: any) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  return (
    <Page size="A4" style={[styles.page, { color: text }]}>
      <View style={styles.hero}>
        <View style={[styles.identity, { backgroundColor: accent }]}>
          {data.company?.companyLogoUrl ? (
            <Image src={data.company.companyLogoUrl} style={styles.logoImage} />
          ) : (
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>
                {data.company?.name ? data.company.name.slice(0, 2).toUpperCase() : 'CO'}
              </Text>
            </View>
          )}

          <Text style={styles.title}>{data.title}</Text>

          {!!data.customTitle && (
            <Text style={styles.customTitle}>{data.customTitle}</Text>
          )}

          {data.advanceSummary && (
            <View style={styles.labelRow}>
              {!!data.advanceSummary.primaryLabel && (
                <Text style={styles.primaryLabel}>{data.advanceSummary.primaryLabel}</Text>
              )}
              {!!data.advanceSummary.secondaryLabel && (
                <Text style={styles.secondaryLabel}>{data.advanceSummary.secondaryLabel}</Text>
              )}
            </View>
          )}

          {data.showTagline && !!data.company?.tagline && (
            <Text style={[styles.customTitle, { marginTop: 12 }]}>
              {data.company.tagline}
            </Text>
          )}
        </View>

        <View style={[styles.metaCard, { borderColor: border }]}>
          {metaRows.map((row, index) => (
            <View
              key={`${row.label}-${index}`}
              style={[
                styles.metaRow,
                { borderBottomColor: border },
                index === metaRows.length - 1 ? { borderBottomWidth: 0 } : null,
              ]}
            >
              <Text style={[styles.metaLabel, { color: muted }]}>{row.label}</Text>
              <Text style={[styles.metaValue, { color: text }]}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.parties}>
        {data.company && (
          <View style={[styles.panel, { borderColor: border }]}>
            <Text style={[styles.panelTitle, { color: muted }]}>Company</Text>
            {renderAddress(data.company)}
            {data.company.customInfo.map((item, index) => (
              <Text key={`${item.label}-${index}`} style={[styles.mutedText, { color: muted }]}>
                {item.label}: {item.value}
              </Text>
            ))}
          </View>
        )}

        {data.client && (
          <View style={[styles.panel, { borderColor: border }]}>
            <Text style={[styles.panelTitle, { color: muted }]}>Client</Text>
            {renderAddress(data.client)}
          </View>
        )}
      </View>

      <View style={[styles.tableWrap, { borderColor: border }]}>
        <View style={[styles.tableHeader, { backgroundColor: surface, borderBottomColor: border }]} fixed>
          {data.table.columns.map((column) => (
            <Text
              key={column.key}
              style={[
                styles.tableHeaderCell,
                { width: column.width, flex: column.flex, color: accent },
                resolveAlignment(column.align),
              ]}
            >
              {column.label}
            </Text>
          ))}
        </View>

        {data.table.rows.map((row, rowIndex) => {
          if (row.isGroupHeader) {
            return (
              <View key={`group-header-${rowIndex}`} style={[styles.groupHeader, { backgroundColor: accent }]}>
                <Text style={styles.groupHeaderText}>{row.groupLabel || ''}</Text>
              </View>
            );
          }

          if (row.isGroupFooter) {
            if (!row.showSubtotal) return null;

            return (
              <View
                key={`group-footer-${rowIndex}`}
                style={[styles.groupFooter, { backgroundColor: surface, borderBottomColor: border }]}
              >
                <Text style={[styles.groupFooterText, { color: accent }]}>
                  {row.groupLabel || 'Subtotal'} {row.groupSubtotalValue || ''}
                </Text>
              </View>
            );
          }

          return (
            <View
              key={`row-${rowIndex}`}
              wrap={false}
              style={[
                styles.tableRow,
                { borderBottomColor: border },
                row.isInGroup ? ([styles.nestedRow, { borderLeftColor: accent }] as any) : null,
              ] as any}
            >
              {data.table.columns.map((column, columnIndex) => {
                const value = renderCellValue(row.cells?.[column.key]);
                const isDescription = columnIndex === 0;

                return (
                  <View
                    key={column.key}
                    style={[
                      styles.tableCell,
                      { width: column.width, flex: column.flex, color: text },
                      resolveAlignment(column.align),
                    ]}
                  >
                    {isDescription && row.imageUrl ? (
                      <View style={styles.descriptionCell}>
                        <Image src={row.imageUrl} style={styles.itemImage} />
                        <Text>{value}</Text>
                      </View>
                    ) : (
                      <Text>{value}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.lower}>
        <View style={styles.stack}>
          {data.notes && (
            <View style={[styles.panel, { borderColor: border }]}>
              <Text style={[styles.panelTitle, { color: muted }]}>{data.notes.title}</Text>
              <Text>{data.notes.content}</Text>
            </View>
          )}

          {data.showBankDetails && data.paymentDetails && (
            <View style={[styles.panel, { borderColor: border }]}>
              <Text style={[styles.panelTitle, { color: muted }]}>Bank Details</Text>
              <Text>Bank: {data.paymentDetails.bankName}</Text>
              <Text>Account Name: {data.paymentDetails.accountName}</Text>
              <Text>Account Number: {data.paymentDetails.accountNumber}</Text>
              {!!data.paymentDetails.sortCode && <Text>Sort Code: {data.paymentDetails.sortCode}</Text>}
            </View>
          )}

          {data.attachments.length > 0 && (
            <View style={[styles.panel, { borderColor: border }]}>
              <Text style={[styles.panelTitle, { color: muted }]}>Attachments</Text>
              {data.attachments.map((item, index) =>
                item.url ? (
                  <Link key={`${item.label}-${index}`} src={item.url}>
                    {item.label}
                  </Link>
                ) : (
                  <Text key={`${item.label}-${index}`}>{item.label}</Text>
                )
              )}
            </View>
          )}

          {data.additionalFields.length > 0 && (
            <View style={[styles.panel, { borderColor: border }]}>
              <Text style={[styles.panelTitle, { color: muted }]}>Additional Information</Text>
              {data.additionalFields.map((field, index) => (
                <Text key={`${field.label}-${index}`}>
                  {field.label}: {field.value}
                </Text>
              ))}
            </View>
          )}

          {data.terms && (
            <View style={[styles.panel, { borderColor: border }]}>
              <Text style={[styles.panelTitle, { color: muted }]}>{data.terms.title}</Text>
              <Text>{data.terms.content}</Text>
            </View>
          )}
        </View>

        <View style={[styles.totals, { backgroundColor: accent }]}>
          {data.totals.lines.map((line, index) => (
            <View key={`${line.label}-${index}`} style={styles.totalRow}>
              <Text style={styles.totalLabel}>{line.label}</Text>
              <Text style={styles.totalValue}>{line.value}</Text>
            </View>
          ))}

          {data.totals.mainLine && (
            <View style={styles.totalRow}>
              <Text style={styles.mainTotalLabel}>{data.totals.mainLine.label}</Text>
              <Text style={styles.mainTotalValue}>{data.totals.mainLine.value}</Text>
            </View>
          )}

          {!!data.totals.amountInWords && (
            <Text style={styles.amountWords}>{data.totals.amountInWords}</Text>
          )}

          {data.totals.balanceDue && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{data.totals.balanceDue.label}</Text>
              <Text style={styles.totalValue}>{data.totals.balanceDue.value}</Text>
            </View>
          )}

          {data.advanceSummary && (
            <>
              {!!data.advanceSummary.primaryLabel && !!data.advanceSummary.advanceAmount && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{data.advanceSummary.primaryLabel}</Text>
                  <Text style={styles.totalValue}>{data.advanceSummary.advanceAmount}</Text>
                </View>
              )}

              {!!data.advanceSummary.secondaryLabel && !!data.advanceSummary.balanceRemaining && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{data.advanceSummary.secondaryLabel}</Text>
                  <Text style={styles.totalValue}>{data.advanceSummary.balanceRemaining}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {data.signature && (
        <View style={styles.signatureBlock}>
          <Text style={[styles.mutedText, { color: muted }]}>
            {data.footer.extraText}
          </Text>

          <View style={styles.signatureLine}>
            {!!data.signature.imageUrl && (
              <Image src={data.signature.imageUrl} style={styles.signatureImage} />
            )}
            {!!data.signature.name && <Text>{data.signature.name}</Text>}
            {!!data.signature.role && (
              <Text style={[styles.mutedText, { color: muted }]}>{data.signature.role}</Text>
            )}
          </View>
        </View>
      )}

      <View style={[styles.footer, { borderTopColor: border, color: muted }]} fixed>
        <Text>{data.footer.companyName}</Text>
        <Text>{data.footer.documentNumber || data.documentNumber}</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </Page>
  );
}