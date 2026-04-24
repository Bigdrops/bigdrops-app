import { Image, Link, Page, Text, View } from '@react-pdf/renderer'
import type { IndustryTemplateData } from '../industryAdapter'
import { lightenHex } from '@/lib/pdfDesignPreset'
import {
  getCellText,
  getDescriptionMain,
  getDescriptionSub,
  resolveIndustryColumnStyle,
  resolveTextAlignmentStyle,
  styles,
} from './industryStyles'
import {
  getAccentTint,
  IndustryGroupFooterRow,
  IndustryGroupHeaderRow,
  IndustryPartyCard,
  renderOptionalList,
} from './industryTemplateBlocks'

type TemplateProps = { data: IndustryTemplateData }

export default function IndustryTemplate({ data }: TemplateProps) {
  const design: IndustryTemplateData['design'] = data?.design || {
    accentColor: null,
    textColor: null,
    mutedColor: null,
    borderColor: null,
    surfaceColor: null,
    headerFont: null,
    bodyFont: null,
    useCustomFonts: false,
    useCustomColors: false,
  }
  const accentColor = design.useCustomColors && design.accentColor ? design.accentColor : null
  const textColor = design.useCustomColors && design.textColor ? design.textColor : null
  const mutedColor = design.useCustomColors && design.mutedColor ? design.mutedColor : null
  const borderColor = design.useCustomColors && design.borderColor ? design.borderColor : null
  const surfaceColor = design.useCustomColors && design.surfaceColor ? design.surfaceColor : null
  const headerFontFamily = design.useCustomFonts && design.headerFont ? design.headerFont : undefined
  const bodyFontFamily = design.useCustomFonts && design.bodyFont ? design.bodyFont : undefined
  const panelSurfaceColor = surfaceColor || (accentColor ? lightenHex(accentColor, 45) : null)
  const subtleSurfaceColor = accentColor ? getAccentTint(accentColor, panelSurfaceColor || '#f5f7f6') : panelSurfaceColor
  const panelBorderColor = borderColor || (accentColor ? lightenHex(accentColor, 28) : null)
  const groupRuleColor = accentColor || panelBorderColor
  const sectionTitleStyle = [
    styles.optionalTitle,
    accentColor ? { color: accentColor } : textColor ? { color: textColor } : null,
    headerFontFamily ? { fontFamily: headerFontFamily } : null,
  ]

  const metaRows = [
    data.documentNumber
      ? { label: data.documentNumberLabel, value: data.documentNumber }
      : null,
    data.issueDate ? { label: data.issueDateLabel, value: data.issueDate } : null,
    data.dueDateOrValidityDate
      ? { label: data.dueDateOrValidityDateLabel, value: data.dueDateOrValidityDate }
      : null,
    data.poNumber ? { label: data.poNumberLabel, value: data.poNumber } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>
  const hasBankDetails = data.showBankDetails && Boolean(data.paymentDetails)
  const footerVisible = Boolean(
    data.footer.extraText ||
    data.showTagline ||
    data.footer.documentNumber ||
    data.footer.companyName,
  )

  return (
    <Page size="A4" style={styles.page}>
      {(data.title || metaRows.length > 0 || data.company?.companyLogoUrl) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text
              style={[
                styles.title,
                textColor ? { color: textColor } : null,
                headerFontFamily ? { fontFamily: headerFontFamily } : null,
              ]}
            >
              {data.title}
            </Text>
            {data.customTitle ? (
              <Text
                style={[
                  styles.customTitle,
                  mutedColor ? { color: mutedColor } : null,
                  bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                ]}
              >
                {data.customTitle}
              </Text>
            ) : null}

            {metaRows.length > 0 ? (
              <View style={styles.metaList}>
                {metaRows.map((row, idx) => (
                  <View key={`meta-${idx}`} style={styles.metaRow}>
                    <Text
                      style={[
                        styles.metaLabel,
                        mutedColor ? { color: mutedColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {row.label}
                    </Text>
                    <Text
                      style={[
                        styles.metaValue,
                        textColor ? { color: textColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {data.customHeaderFields.map((field, idx) => (
              <View key={`custom-meta-${idx}`} style={styles.metaRow}>
                <Text
                  style={[
                    styles.metaLabel,
                    mutedColor ? { color: mutedColor } : null,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {field.label}
                </Text>
                <Text
                  style={[
                    styles.metaValue,
                    textColor ? { color: textColor } : null,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {field.value}
                </Text>
              </View>
            ))}
          </View>

          {data.company?.companyLogoUrl ? (
            <View style={styles.headerRight}>
              <Image src={data.company.companyLogoUrl} style={styles.logo} />
            </View>
          ) : null}
        </View>
      )}

      {(data.company || data.client) ? (
        <View style={styles.partyRow}>
          {data.company ? (
            <IndustryPartyCard
              title="From"
              party={data.company}
              surfaceColor={panelSurfaceColor}
              borderColor={panelBorderColor}
              accentColor={accentColor}
              textColor={textColor}
              mutedColor={mutedColor}
              headerFontFamily={headerFontFamily}
              bodyFontFamily={bodyFontFamily}
            />
          ) : null}

          {data.client ? (
            <IndustryPartyCard
              title="To"
              party={data.client}
              isLast
              surfaceColor={panelSurfaceColor}
              borderColor={panelBorderColor}
              accentColor={accentColor}
              textColor={textColor}
              mutedColor={mutedColor}
              headerFontFamily={headerFontFamily}
              bodyFontFamily={bodyFontFamily}
            />
          ) : null}
        </View>
      ) : null}

      {data.table.columns.length > 0 && data.table.rows.length > 0 ? (
        <View style={styles.tableWrap}>
          <View
            style={[
              styles.tableHeaderRow,
              accentColor ? { backgroundColor: accentColor, borderBottomColor: accentColor } : null,
            ]}
            fixed
          >
            {data.table.columns.map((column, idx) => {
              const columnStyle = resolveIndustryColumnStyle(column)
              const alignStyle = resolveTextAlignmentStyle(column)

              return (
                <Text
                  key={`head-${idx}`}
                  style={[
                    styles.tableHeaderCell,
                    columnStyle,
                    alignStyle,
                    !accentColor && panelSurfaceColor ? { backgroundColor: panelSurfaceColor } : null,
                    headerFontFamily ? { fontFamily: headerFontFamily } : null,
                  ]}
                >
                  {column.label}
                </Text>
              )
            })}
          </View>

          {data.table.rows.map((row, rowIdx) => {
            if (row.isGroupHeader) {
              return (
                <IndustryGroupHeaderRow
                  key={`group-h-${rowIdx}`}
                  row={row}
                  rowIdx={rowIdx}
                  ruleColor={groupRuleColor}
                  surfaceColor={subtleSurfaceColor}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  headerFontFamily={headerFontFamily}
                  bodyFontFamily={bodyFontFamily}
                />
              )
            }

            if (row.isGroupFooter) {
              return (
                <IndustryGroupFooterRow
                  key={`group-f-${rowIdx}`}
                  row={row}
                  rowIdx={rowIdx}
                  ruleColor={groupRuleColor}
                  surfaceColor={subtleSurfaceColor}
                  textColor={textColor}
                  mutedColor={mutedColor}
                  headerFontFamily={headerFontFamily}
                  bodyFontFamily={bodyFontFamily}
                />
              )
            }

            return (
              <View
                key={`row-${rowIdx}`}
                style={[
                  styles.tableRow,
                  rowIdx % 2 === 1 ? styles.tableRowEven : null,
                  row.isInGroup ? styles.tableRowInGroup : null,
                  row.isInGroup && accentColor ? { borderLeftColor: accentColor } : null,
                ] as any}
                wrap={false}
              >
                {data.table.columns.map((column, colIdx) => {
                  const cell = row.cells?.[column.key]
                  const columnStyle = resolveIndustryColumnStyle(column)
                  const alignStyle = resolveTextAlignmentStyle(column)
                  const isDescription = column.key === 'description'
                  const isMake = column.key === 'make'
                  const isTightSingleLineCell = column.key === 'quantity' || column.key === 'unit'

                  return (
                    <View
                      key={`cell-${rowIdx}-${colIdx}`}
                      style={[styles.tableCell, columnStyle, alignStyle]}
                    >
                      {isDescription ? (
                        <>
                          <Text style={styles.descriptionMain}>{getDescriptionMain(cell)}</Text>
                          {getDescriptionSub(cell) ? (
                            <Text style={styles.descriptionSub}>{getDescriptionSub(cell)}</Text>
                          ) : null}
                          {row.imageUrl ? (
                            <>
                              <Image src={row.imageUrl} style={styles.imageThumb} />
                              <Link src={row.imageUrl} style={styles.imageLink}>
                                Open image
                              </Link>
                            </>
                          ) : null}
                        </>
                      ) : isMake ? (
                        <Text style={styles.makeText}>{getCellText(cell)}</Text>
                      ) : isTightSingleLineCell ? (
                        <Text style={[styles.tightCellText, alignStyle]}>{getCellText(cell)}</Text>
                      ) : (
                        <Text style={alignStyle}>{getCellText(cell)}</Text>
                      )}
                    </View>
                  )
                })}
              </View>
            )
          })}
        </View>
      ) : null}

      {(hasBankDetails || data.totals.lines.length > 0 || data.advanceSummary || data.totals.mainLine || data.totals.amountInWords || data.totals.balanceDue) ? (
        <View style={[styles.closingRow, !hasBankDetails ? styles.closingRowNoBank : null]} wrap={false}>
          {hasBankDetails && data.paymentDetails ? (
            <View
              style={[
                styles.bankBox,
                panelSurfaceColor ? { backgroundColor: panelSurfaceColor } : null,
                panelBorderColor ? { borderColor: panelBorderColor } : null,
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  accentColor ? { color: accentColor } : textColor ? { color: textColor } : null,
                  headerFontFamily ? { fontFamily: headerFontFamily } : null,
                ]}
              >
                Bank Details
              </Text>
              {data.paymentDetails.bankName ? (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Bank</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.bankName}</Text>
                </View>
              ) : null}
              {data.paymentDetails.accountName ? (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account Name</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.accountName}</Text>
                </View>
              ) : null}
              {data.paymentDetails.accountNumber ? (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account Number</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.accountNumber}</Text>
                </View>
              ) : null}
              {data.paymentDetails.sortCode ? (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Sort Code</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.sortCode}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View
            style={[
              styles.totalsBox,
              !hasBankDetails ? styles.totalsBoxSolo : null,
              panelSurfaceColor ? { backgroundColor: panelSurfaceColor } : null,
              panelBorderColor ? { borderColor: panelBorderColor } : null,
            ]}
          >
            {data.totals.lines.map((line, idx) => (
              <View key={`total-${idx}`} style={styles.totalRow}>
                <Text
                  style={[
                    styles.totalLabel,
                    mutedColor ? { color: mutedColor } : null,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {line.label}
                </Text>
                <Text
                  style={[
                    styles.totalValue,
                    textColor ? { color: textColor } : null,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {line.value}
                </Text>
              </View>
            ))}

            {data.totals.mainLine ? (
              <View
                style={[
                  styles.totalFinal,
                  accentColor ? { borderTopColor: accentColor } : null,
                ]}
              >
                <Text
                  style={[
                    styles.totalFinalLabel,
                    textColor ? { color: textColor } : null,
                    headerFontFamily ? { fontFamily: headerFontFamily } : null,
                  ]}
                >
                  {data.totals.mainLine.label}
                </Text>
                <Text
                  style={[
                    styles.totalFinalValue,
                    textColor ? { color: textColor } : null,
                    headerFontFamily ? { fontFamily: headerFontFamily } : null,
                  ]}
                >
                  {data.totals.mainLine.value}
                </Text>
              </View>
            ) : null}

            {data.totals.amountInWords ? (
              <Text
                style={[
                  styles.amountWords,
                  mutedColor ? { color: mutedColor } : null,
                  subtleSurfaceColor ? { backgroundColor: subtleSurfaceColor } : null,
                  panelBorderColor ? { borderColor: panelBorderColor, borderWidth: 1 } : null,
                  bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                ]}
              >
                {data.totals.amountInWords}
              </Text>
            ) : null}

            {data.totals.balanceDue ? (
              <View
                style={[
                  styles.balanceDue,
                  accentColor ? { backgroundColor: accentColor } : null,
                ]}
              >
                <Text
                  style={[
                    styles.balanceDueText,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {data.totals.balanceDue.label}
                </Text>
                <Text
                  style={[
                    styles.balanceDueValue,
                    bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                  ]}
                >
                  {data.totals.balanceDue.value}
                </Text>
              </View>
            ) : null}

            {data.advanceSummary ? (
              <View
                style={[
                  styles.advanceBox,
                  groupRuleColor ? { borderLeftColor: groupRuleColor } : null,
                  subtleSurfaceColor ? { backgroundColor: subtleSurfaceColor } : null,
                ]}
              >
                {data.advanceSummary.advanceAmount ? (
                  <View style={styles.advanceRow}>
                    <Text
                      style={[
                        styles.advanceProminentLabel,
                        textColor ? { color: textColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {data.advanceSummary.primaryLabel}
                    </Text>
                    <Text
                      style={[
                        styles.advanceProminentValue,
                        accentColor ? { color: accentColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {data.advanceSummary.advanceAmount}
                    </Text>
                  </View>
                ) : null}

                {data.advanceSummary.balanceRemaining ? (
                  <View style={styles.advanceRow}>
                    <Text
                      style={[
                        styles.advanceLabel,
                        mutedColor ? { color: mutedColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {data.advanceSummary.secondaryLabel}
                    </Text>
                    <Text
                      style={[
                        styles.advanceValue,
                        textColor ? { color: textColor } : null,
                        bodyFontFamily ? { fontFamily: bodyFontFamily } : null,
                      ]}
                    >
                      {data.advanceSummary.balanceRemaining}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {data.notes?.content ? (
        <View style={styles.optionalSection}>
          {data.notes.title ? <Text style={sectionTitleStyle}>{data.notes.title}</Text> : null}
          <Text style={styles.optionalText}>{data.notes.content}</Text>
        </View>
      ) : null}

      {data.terms?.content ? (
        <View style={styles.optionalSection}>
          {data.terms.title ? <Text style={sectionTitleStyle}>{data.terms.title}</Text> : null}
          <Text style={styles.optionalText}>{data.terms.content}</Text>
        </View>
      ) : null}

      {data.attachments.length > 0 ? (
        <View style={styles.optionalSection}>
          <Text style={sectionTitleStyle}>Attachments</Text>
          <View style={styles.attachmentsWrap}>{renderOptionalList(data.attachments)}</View>
        </View>
      ) : null}

      {data.additionalFields.length > 0 ? (
        <View style={styles.optionalSection}>
          <View
            style={[
              styles.additionalWrap,
              subtleSurfaceColor ? { backgroundColor: subtleSurfaceColor } : null,
              panelBorderColor ? { borderColor: panelBorderColor } : null,
            ]}
          >
            {data.additionalFields.map((field, idx) => (
              <View key={`add-${idx}`} style={styles.additionalRow}>
                <Text style={[styles.additionalLabel, mutedColor ? { color: mutedColor } : null]}>{field.label}</Text>
                <Text style={[styles.additionalValue, textColor ? { color: textColor } : null]}>{field.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {data.signature && (data.signature.imageUrl || data.signature.name) ? (
        <View style={styles.signatureWrap}>
          <View style={styles.signatureBox}>
            {data.signature.imageUrl ? (
              <Image src={data.signature.imageUrl} style={styles.signatureImage} />
            ) : null}
            <View style={styles.signatureLine} />
            {data.signature.name ? <Text style={styles.signerName}>{data.signature.name}</Text> : null}
            {data.signature.role ? <Text style={styles.signerRole}>{data.signature.role}</Text> : null}
          </View>
        </View>
      ) : null}

      {footerVisible ? (
        <View style={styles.footerZone} fixed>
          {data.footer.extraText ? <Text style={styles.footerExtraText}>{data.footer.extraText}</Text> : null}
          {data.showTagline && data.company?.tagline ? (
            <Text style={styles.taglineFooter}>{data.company.tagline}</Text>
          ) : null}
          <View style={styles.documentFooter}>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
              fixed
            />
            <Text style={styles.footerText}>{data.footer.documentNumber || data.documentNumber}</Text>
            <Text style={styles.footerText}>{data.footer.companyName || data.company?.name || ''}</Text>
          </View>
        </View>
      ) : null}
    </Page>
  )
}
