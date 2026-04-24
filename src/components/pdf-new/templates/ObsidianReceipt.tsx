import { Page, Text, View, Image, Link } from '@react-pdf/renderer';
import type { IndustryTemplateData } from '../industryAdapter';
import { styles, resolveAlignment, palette } from './ObsidianReceiptStyles';
import { getCellText } from './industryStyles';

export default function Template({ data }: { data: IndustryTemplateData }) {
  const design: IndustryTemplateData['design'] = data.design || ({} as any);
  const accentColor = design.accentColor || palette.bronze;
  const textColor = design.textColor || palette.ink;
  const mutedColor = design.mutedColor || palette.muted;
  const borderColor = design.borderColor || palette.line;
  const surfaceColor = design.surfaceColor || palette.paper;

  const companyInitials = data.company?.name
    ? data.company.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
    : '';

  const metaFields = [
    { label: data.documentNumberLabel, value: data.documentNumber },
    data.issueDate ? { label: data.issueDateLabel, value: data.issueDate } : null,
    data.dueDateOrValidityDate
      ? { label: data.dueDateOrValidityDateLabel, value: data.dueDateOrValidityDate }
      : null,
    data.poNumber ? { label: data.poNumberLabel, value: data.poNumber } : null,
    ...data.customHeaderFields,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const renderCompanyLines = () => {
    if (!data.company) return null;

    return (
      <>
        {data.company.address ? <Text style={[styles.partyLine, { color: mutedColor }]}>{data.company.address}</Text> : null}
        {data.company.cityState ? <Text style={[styles.partyLine, { color: mutedColor }]}>{data.company.cityState}</Text> : null}
        {data.company.phone ? <Text style={[styles.partyLine, { color: mutedColor }]}>{data.company.phone}</Text> : null}
        {data.company.email ? <Text style={[styles.partyLine, { color: mutedColor }]}>{data.company.email}</Text> : null}
        {data.company.customInfo.map((item, index) => (
          <Text key={`${item.label}-${index}`} style={[styles.customInfoLine, { color: textColor }]}>
            {item.label}: {item.value}
          </Text>
        ))}
      </>
    );
  };

  const renderClientLines = () => {
    if (!data.client) return null;

    return (
      <>
        {data.client.address ? <Text style={[styles.partyLine, { color: mutedColor }]}>{data.client.address}</Text> : null}
        {data.client.cityState ? <Text style={[styles.partyLine, { color: mutedColor }]}>{data.client.cityState}</Text> : null}
        {data.client.phone ? <Text style={[styles.partyLine, { color: mutedColor }]}>{data.client.phone}</Text> : null}
        {data.client.email ? <Text style={[styles.partyLine, { color: mutedColor }]}>{data.client.email}</Text> : null}
      </>
    );
  };

  const renderCellValue = (value: any) => {
    return getCellText(value);
  };

  const renderDescriptionCell = (row: IndustryTemplateData['table']['rows'][number], columnKey: string) => {
    const value = renderCellValue(row.cells?.[columnKey]);

    return (
      <View style={styles.descriptionCellContent}>
        {row.imageUrl ? <Image src={row.imageUrl} style={styles.itemImage} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: textColor }]}>{value}</Text>
        </View>
      </View>
    );
  };

  const renderTableRow = (row: IndustryTemplateData['table']['rows'][number], rowIndex: number) => {
    if (row.isGroupHeader) {
      return (
        <View
          key={`group-header-${rowIndex}`}
          style={[styles.groupHeaderRow, { backgroundColor: accentColor, borderBottomColor: borderColor }]}
          wrap={false}
        >
          <Text style={styles.groupHeaderText}>{row.groupLabel || ''}</Text>
        </View>
      );
    }

    if (row.isGroupFooter) {
      if (!row.showSubtotal) return null;

      return (
        <View
          key={`group-footer-${rowIndex}`}
          style={[styles.groupFooterRow, { borderBottomColor: borderColor }]}
          wrap={false}
        >
          <Text style={[styles.groupFooterLabel, { color: textColor }]}>{row.groupLabel || 'Subtotal'}</Text>
          <Text style={[styles.groupFooterValue, { color: textColor }]}>{row.groupSubtotalValue || ''}</Text>
        </View>
      );
    }

    return (
      <View
        key={`row-${rowIndex}`}
        style={[
          styles.tableRow,
          rowIndex % 2 === 1 ? styles.tableRowAlt : null,
          { borderBottomColor: borderColor },
        ]}
        wrap={false}
      >
        {data.table.columns.map((column, columnIndex) => {
          const widthStyle = column.width ? { width: column.width } : { flex: column.flex || 1 };
          const isDescription = columnIndex === 0 || column.key === 'description' || column.key === 'item' || column.key === 'name';

          const cellStyle: any = {
            ...styles.tableCell,
            ...widthStyle,
            ...resolveAlignment(column.align),
          };
          if (row.isInGroup && columnIndex === 0) {
            Object.assign(cellStyle, styles.nestedCell);
            cellStyle.borderLeftColor = accentColor;
          }

          return (
            <View
              key={`${column.key}-${columnIndex}`}
              style={cellStyle}
            >
              {isDescription ? (
                renderDescriptionCell(row, column.key)
              ) : (
                <Text style={{ color: textColor, ...resolveAlignment(column.align) } as any}>
                  {renderCellValue(row.cells?.[column.key])}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const hasBankDetails = data.showBankDetails && data.paymentDetails;
  const hasNotes = Boolean(data.notes?.content);
  const hasTerms = Boolean(data.terms?.content);
  const hasAttachments = data.attachments.length > 0;
  const hasAdditionalFields = data.additionalFields.length > 0;
  const hasSignature = Boolean(data.signature);

  return (
    <Page size="A4" style={{ ...styles.page, backgroundColor: surfaceColor, color: textColor } as any}>
      <View style={styles.masthead} wrap={false}>
        <View style={styles.heroCard}>
          <View style={styles.brandRow}>
            {data.company?.companyLogoUrl ? (
              <Image src={data.company.companyLogoUrl} style={styles.logoImage} />
            ) : (
              <View style={{ ...styles.logoMark, backgroundColor: accentColor } as any}>
                <Text style={styles.logoMarkText}>{companyInitials as any}</Text>
              </View>
            )}
            <View>
              <Text style={styles.brandName}>{data.company?.name || ''}</Text>
              {data.showTagline && data.company?.tagline ? <Text style={styles.brandMeta}>{data.company.tagline}</Text> : null}
            </View>
          </View>

          <View>
            <Text style={{ ...styles.docKicker, color: accentColor } as any}>Commercial Document</Text>
            <Text style={styles.docTitle}>{data.title as any}</Text>
            {data.customTitle ? <Text style={styles.secondaryLabel}>{data.customTitle as any}</Text> : null}
          </View>
        </View>

        <View style={styles.metaPanel}>
          {metaFields.slice(0, 8).map((field, index) => {
            const tileStyle =
              index % 4 === 0
                ? styles.metaTileBronze
                : index % 4 === 1
                  ? styles.metaTileSage
                  : index % 4 === 2
                    ? styles.metaTileBlue
                    : styles.metaTilePaper;

            return (
              <View key={`${field.label}-${index}`} style={{ ...styles.metaTile, ...tileStyle, borderColor } as any}>
                <Text style={{ ...styles.metaLabel, color: mutedColor } as any}>{field.label as any}</Text>
                <Text style={{ ...styles.metaValue, color: textColor } as any}>{field.value as any}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {(data.company || data.client) && (
        <View style={styles.parties} wrap={false}>
          {data.company ? (
            <View style={[styles.partyCard, styles.partyCardLeft, { borderColor }]}>
              <Text style={styles.partyHead}>From</Text>
              <View style={styles.partyBody}>
                <Text style={[styles.partyName, { color: textColor }]}>{data.company.name}</Text>
                {renderCompanyLines()}
              </View>
            </View>
          ) : null}

          {data.client ? (
            <View style={[styles.partyCard, styles.partyCardRight, { borderColor }]}>
              <Text style={styles.partyHead}>To</Text>
              <View style={styles.partyBody}>
                <Text style={[styles.partyName, { color: textColor }]}>{data.client.name}</Text>
                {renderClientLines()}
              </View>
            </View>
          ) : null}
        </View>
      )}

      <View>
        <View style={styles.sectionHeader} wrap={false}>
          <View style={styles.sectionTitleWrap}>
            <View style={[styles.sectionPill, { backgroundColor: accentColor }]} />
            <Text style={[styles.sectionTitle, { color: textColor }]}>Items and services</Text>
          </View>
          <Text style={[styles.sectionCaption, { color: mutedColor }]}>Readable when short, stable when long</Text>
        </View>

        <View style={[styles.tableFrame, { borderColor }]}> 
          <View style={styles.tableHeader} fixed>
            {data.table.columns.map((column, index) => {
              const widthStyle = column.width ? { width: column.width } : { flex: column.flex || 1 };
              return (
                <Text
                  key={`${column.key}-header-${index}`}
                  style={[styles.tableHeaderCell, widthStyle, resolveAlignment(column.align)]}
                >
                  {column.label}
                </Text>
              );
            })}
          </View>
          {data.table.rows.map(renderTableRow)}
        </View>
      </View>

      <View style={styles.bottomArea}>
        <View style={styles.detailGrid}>
          {hasBankDetails ? (
            <View style={[styles.detailCard, styles.bankCard, { borderColor }]} wrap={false}>
              <Text style={[styles.detailTitle, { color: textColor }]}>Bank Details</Text>
              <Text style={[styles.detailText, { color: textColor }]}>Bank: {data.paymentDetails?.bankName}</Text>
              <Text style={[styles.detailText, { color: textColor }]}>Account Name: {data.paymentDetails?.accountName}</Text>
              <Text style={[styles.detailText, { color: textColor }]}>Account No: {data.paymentDetails?.accountNumber}</Text>
              {data.paymentDetails?.sortCode ? (
                <Text style={[styles.detailText, { color: textColor }]}>Sort Code: {data.paymentDetails.sortCode}</Text>
              ) : null}
            </View>
          ) : null}

          {hasNotes ? (
            <View style={[styles.detailCard, styles.notesCard, { borderColor }]} wrap={false}>
              <Text style={[styles.detailTitle, { color: textColor }]}>{data.notes?.title}</Text>
              <Text style={[styles.detailText, { color: textColor }]}>{data.notes?.content}</Text>
            </View>
          ) : null}

          {hasTerms ? (
            <View style={[styles.detailCard, styles.detailCardWide, styles.termsCard, { borderColor }]} wrap={false}>
              <Text style={[styles.detailTitle, { color: textColor }]}>{data.terms?.title}</Text>
              <Text style={[styles.detailText, { color: textColor }]}>{data.terms?.content}</Text>
            </View>
          ) : null}

          {hasAdditionalFields ? (
            <View style={[styles.detailCard, styles.detailCardWide, styles.notesCard, { borderColor }]} wrap={false}>
              <Text style={[styles.detailTitle, { color: textColor }]}>Additional Details</Text>
              {data.additionalFields.map((field, index) => (
                <Text key={`${field.label}-${index}`} style={[styles.detailText, { color: textColor }]}>
                  {field.label}: {field.value}
                </Text>
              ))}
            </View>
          ) : null}

          {hasAttachments ? (
            <View style={[styles.detailCard, styles.detailCardWide, styles.attachmentsCard, { borderColor }]} wrap={false}>
              <Text style={[styles.detailTitle, { color: textColor }]}>Attachments</Text>
              <View style={styles.attachmentWrap}>
                {data.attachments.map((attachment, index) =>
                  attachment.url ? (
                    <Link
                      key={`${attachment.label}-${index}`}
                      src={attachment.url}
                      style={[styles.attachmentPill, { borderColor, color: textColor }]}
                    >
                      {attachment.label}
                    </Link>
                  ) : (
                    <Text
                      key={`${attachment.label}-${index}`}
                      style={[styles.attachmentPill, { borderColor, color: textColor }]}
                    >
                      {attachment.label}
                    </Text>
                  )
                )}
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.summaryPanel, { borderColor: accentColor }]} wrap={false}>
          <View style={styles.summaryTop}>
            <Text style={[styles.summaryKicker, { color: accentColor }]}>Amount Summary</Text>
            {data.totals.mainLine ? (
              <View style={styles.summaryMainRow}>
                <Text style={styles.summaryMainLabel}>{data.totals.mainLine.label}</Text>
                <Text style={styles.summaryMainValue}>{data.totals.mainLine.value}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.summaryLines}>
            {data.totals.lines.map((line, index) => (
              <View key={`${line.label}-${index}`} style={[styles.summaryRow, { borderBottomColor: borderColor }]}>
                <Text style={[styles.summaryRowLabel, { color: mutedColor }]}>{line.label}</Text>
                <Text style={[styles.summaryRowValue, { color: textColor }]}>{line.value}</Text>
              </View>
            ))}

            {data.totals.amountInWords ? (
              <Text style={[styles.amountWords, { color: mutedColor }]}>{data.totals.amountInWords}</Text>
            ) : null}

            {data.totals.balanceDue ? (
              <View style={[styles.balanceDue, { backgroundColor: accentColor }]}> 
                <Text style={styles.balanceDueLabel}>{data.totals.balanceDue.label}</Text>
                <Text style={styles.balanceDueValue}>{data.totals.balanceDue.value}</Text>
              </View>
            ) : null}

            {data.advanceSummary ? (
              <View style={[styles.advanceBlock, { borderTopColor: borderColor }]}> 
                {data.advanceSummary.primaryLabel && data.advanceSummary.advanceAmount ? (
                  <View style={styles.advanceRow}>
                    <Text style={[styles.advanceLabel, { color: mutedColor }]}>{data.advanceSummary.primaryLabel}</Text>
                    <Text style={[styles.advanceValue, { color: textColor }]}>{data.advanceSummary.advanceAmount}</Text>
                  </View>
                ) : null}
                {data.advanceSummary.secondaryLabel && data.advanceSummary.balanceRemaining ? (
                  <View style={styles.advanceRow}>
                    <Text style={[styles.advanceLabel, { color: mutedColor }]}>{data.advanceSummary.secondaryLabel}</Text>
                    <Text style={[styles.advanceValue, { color: textColor }]}>{data.advanceSummary.balanceRemaining}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {hasSignature ? (
        <View style={styles.signatureBand} wrap={false}>
          <Text style={[styles.signatureCopy, { color: mutedColor }]}>Prepared for review and approval. Please keep a copy of this document for your records.</Text>
          <View style={[styles.signatureBox, { borderColor }]}> 
            {data.signature?.imageUrl ? <Image src={data.signature.imageUrl} style={styles.signatureImage} /> : null}
            <View style={styles.signatureLine}>
              {data.signature?.name ? <Text style={[styles.signatureName, { color: textColor }]}>{data.signature.name}</Text> : null}
              {data.signature?.role ? <Text style={[styles.signatureRole, { color: mutedColor }]}>{data.signature.role}</Text> : null}
            </View>
          </View>
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: borderColor }]} fixed>
        <Text style={[styles.footerLeft, { color: mutedColor }]}> 
          {data.footer.companyName} · {data.footer.documentNumber} · {data.footer.extraText}
        </Text>
        <Text
          style={[styles.footerRight, { color: mutedColor }]}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
    </Page>
  );
}
