const TEMPLATE_NAME = "Industry";

import { Page, View, Text, Image, StyleSheet, Link } from "@react-pdf/renderer";

type TemplateProps = {
  data: any;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 110,
    paddingHorizontal: 34,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    color: "#333333",
    fontSize: 11,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
  },

  headerLeft: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 16,
  },

  headerRight: {
    width: 90,
    alignItems: "flex-end",
  },

  title: {
    fontSize: 34,
    color: "#7D8A88",
    marginBottom: 18,
    letterSpacing: 1.2,
    fontFamily: "Helvetica-Bold",
  },

  metaList: {
    marginTop: 2,
  },

  metaRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  metaLabel: {
    width: 130,
    color: "#666666",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },

  metaValue: {
    flex: 1,
    color: "#333333",
    fontSize: 12,
  },

  logo: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },

  partyRow: {
    flexDirection: "row",
    marginBottom: 28,
  },

  partyBox: {
    flex: 1,
    backgroundColor: "#E8E8E8",
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 18,
    marginRight: 16,
    borderRadius: 3,
  },

  partyBoxLast: {
    marginRight: 0,
  },

  partyTitle: {
    fontSize: 16,
    color: "#7D8A88",
    marginBottom: 12,
    fontFamily: "Helvetica-Bold",
  },

  partyName: {
    fontSize: 14,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
  },

  partyLine: {
    fontSize: 11,
    color: "#444444",
    marginBottom: 3,
    lineHeight: 1.4,
  },

  partyMuted: {
    fontSize: 11,
    color: "#666666",
    marginBottom: 3,
    lineHeight: 1.4,
  },

  customInfoWrap: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
  },

  tableWrap: {
    marginBottom: 24,
  },

  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#7D8A88",
  },

  tableHeaderCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    borderRightWidth: 0.5,
    borderRightColor: "#dfe5e4",
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },

  tableRowEven: {
    backgroundColor: "#F8F8F8",
  },

  tableGroupRow: {
    backgroundColor: "#d7dbda",
  },

  tableCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 11,
    color: "#333333",
    borderRightWidth: 0.5,
    borderRightColor: "#ececec",
  },

  descriptionMain: {
    fontSize: 11,
    color: "#333333",
    marginBottom: 3,
  },

  descriptionSub: {
    fontSize: 9.5,
    color: "#666666",
    lineHeight: 1.35,
  },

  makeText: {
    fontSize: 10,
    color: "#777777",
  },

  textRight: {
    textAlign: "right",
  },

  textCenter: {
    textAlign: "center",
  },

  imageThumb: {
    width: 38,
    height: 38,
    objectFit: "cover",
    marginBottom: 5,
  },

  closingRow: {
    flexDirection: "row",
    marginBottom: 24,
  },

  bankBox: {
    width: "48%",
    backgroundColor: "#E8E8E8",
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 18,
    marginRight: "4%",
    borderRadius: 3,
  },

  totalsBox: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 15,
    color: "#7D8A88",
    marginBottom: 12,
    fontFamily: "Helvetica-Bold",
  },

  bankRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  bankLabel: {
    width: 110,
    fontSize: 11,
    color: "#555555",
    fontFamily: "Helvetica-Bold",
  },

  bankValue: {
    flex: 1,
    fontSize: 11,
    color: "#444444",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
    paddingVertical: 2,
  },

  totalLabel: {
    fontSize: 11,
    color: "#666666",
    paddingRight: 10,
  },

  totalValue: {
    fontSize: 11,
    color: "#333333",
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },

  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#333333",
  },

  totalFinalLabel: {
    fontSize: 15,
    color: "#333333",
    fontFamily: "Helvetica-Bold",
  },

  totalFinalValue: {
    fontSize: 15,
    color: "#333333",
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },

  advanceBox: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f0f0f0",
    borderLeftWidth: 4,
    borderLeftColor: "#7D8A88",
  },

  advanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  advanceLabel: {
    fontSize: 11,
    color: "#555555",
    paddingRight: 8,
  },

  advanceValue: {
    fontSize: 11,
    color: "#333333",
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },

  advanceProminentLabel: {
    fontSize: 13,
    color: "#7D8A88",
    fontFamily: "Helvetica-Bold",
  },

  advanceProminentValue: {
    fontSize: 14,
    color: "#7D8A88",
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },

  amountWords: {
    marginTop: 14,
    fontSize: 10,
    color: "#555555",
    fontStyle: "italic",
    lineHeight: 1.45,
    backgroundColor: "#f8f8f8",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 3,
  },

  balanceDue: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#7D8A88",
    borderRadius: 3,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  balanceDueText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },

  optionalSection: {
    marginBottom: 22,
  },

  optionalTitle: {
    fontSize: 15,
    color: "#7D8A88",
    marginBottom: 10,
    fontFamily: "Helvetica-Bold",
  },

  optionalText: {
    fontSize: 11,
    color: "#666666",
    lineHeight: 1.55,
  },

  attachmentsWrap: {
    marginTop: 8,
  },

  attachmentItem: {
    fontSize: 11,
    color: "#555555",
    marginBottom: 5,
    lineHeight: 1.45,
  },

  attachmentLink: {
    fontSize: 11,
    color: "#555555",
    textDecoration: "underline",
    marginBottom: 5,
    lineHeight: 1.45,
  },

  additionalWrap: {
    marginTop: 6,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#dddddd",
  },

  additionalRow: {
    flexDirection: "row",
    marginBottom: 7,
  },

  additionalLabel: {
    width: 130,
    fontSize: 11,
    color: "#666666",
  },

  additionalValue: {
    flex: 1,
    fontSize: 11,
    color: "#333333",
    fontFamily: "Helvetica-Bold",
  },

  signatureWrap: {
    marginTop: 36,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  signatureBox: {
    width: 250,
    alignItems: "center",
  },

  signatureImage: {
    width: 140,
    height: 40,
    objectFit: "contain",
    marginBottom: 10,
  },

  signatureLine: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#333333",
    marginBottom: 10,
  },

  signerName: {
    fontSize: 12,
    color: "#333333",
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    textAlign: "center",
  },

  signerRole: {
    fontSize: 10,
    color: "#666666",
    textAlign: "center",
  },

  taglineFooter: {
    marginTop: 22,
    textAlign: "center",
    fontSize: 10,
    color: "#999999",
    fontStyle: "italic",
  },

  documentFooter: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  continuationFooter: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 48,
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 26,
  },

  footerText: {
    fontSize: 10,
    color: "#888888",
  },
});

function getCellText(cell: any): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "string" || typeof cell === "number") return String(cell);
  if (typeof cell === "object") {
    if (cell.value !== undefined && cell.value !== null) return String(cell.value);
    if (cell.text !== undefined && cell.text !== null) return String(cell.text);
    if (cell.main !== undefined && cell.main !== null) return String(cell.main);
  }
  return "";
}

function getDescriptionMain(cell: any): string {
  if (!cell) return "";
  if (typeof cell === "object" && cell.main) return String(cell.main);
  return getCellText(cell);
}

function getDescriptionSub(cell: any): string {
  if (!cell || typeof cell !== "object") return "";
  if (cell.sub !== undefined && cell.sub !== null) return String(cell.sub);
  if (cell.subDescription !== undefined && cell.subDescription !== null) return String(cell.subDescription);
  return "";
}

function resolveColumnWidthStyle(column: any) {
  const width = Number(column?.width || 0);
  const flex = Number(column?.flex || 0);
  const key = String(column?.key || "");

  if (width > 0) {
    return { width, flexGrow: 0, flexShrink: 0 };
  }

  if (key === "description") {
    return { flexBasis: 0, flexGrow: Math.max(flex, 2.7), flexShrink: 1, minWidth: 170 };
  }

  if (["unit_price", "amount", "install_rate"].includes(key)) {
    return { flexBasis: 0, flexGrow: Math.max(flex, 1.15), flexShrink: 0, minWidth: 64 };
  }

  if (["num", "quantity", "unit", "vat_rate", "discount_rate"].includes(key)) {
    return { flexBasis: 0, flexGrow: Math.max(flex, 0.75), flexShrink: 0, minWidth: 34 };
  }

  return { flexBasis: 0, flexGrow: Math.max(flex, 1), flexShrink: 1, minWidth: 52 };
}

export default function IndustryTemplate({ data }: TemplateProps) {
  const metaRows = [
    data?.documentNumber
      ? { label: data?.documentNumberLabel, value: data.documentNumber }
      : null,
    data?.issueDate ? { label: data?.issueDateLabel, value: data.issueDate } : null,
    data?.dueDateOrValidityDate
      ? { label: data?.dueDateOrValidityDateLabel, value: data.dueDateOrValidityDate }
      : null,
    data?.poNumber ? { label: data?.poNumberLabel, value: data.poNumber } : null,
  ].filter(Boolean);

  const footerParts = [
    data?.footer?.pageNumber,
    data?.footer?.documentNumber,
    data?.footer?.companyName,
  ].filter(Boolean);

  return (
    <Page size="A4" orientation={data?.pageLayout?.orientation || "portrait"} style={styles.page}>
      {(data?.title || metaRows.length > 0 || data?.company?.logoUrl) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {data?.title && <Text style={styles.title}>{data.title}</Text>}

            {metaRows.length > 0 && (
              <View style={styles.metaList}>
                {metaRows.map((row: any, idx: number) => (
                  <View key={`meta-${idx}`} style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{row.label}</Text>
                    <Text style={styles.metaValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {data?.customHeaderFields &&
              data.customHeaderFields.map((field: any, idx: number) => (
                <View key={`custom-meta-${idx}`} style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{field?.label}</Text>
                  <Text style={styles.metaValue}>{field?.value}</Text>
                </View>
              ))}
          </View>

          <View style={styles.headerRight}>
            {data?.company?.logoUrl && (
              <Image src={data.company.logoUrl} style={styles.logo} />
            )}
          </View>
        </View>
      )}

      {(data?.company || data?.client) && (
        <View style={styles.partyRow}>
          {data?.company && (
            <View style={styles.partyBox}>
              <Text style={styles.partyTitle}>From</Text>

              {data.company?.name && (
                <Text style={styles.partyName}>{data.company.name}</Text>
              )}

              {data?.showTagline && data.company?.tagline && (
                <Text style={styles.partyMuted}>{data.company.tagline}</Text>
              )}

              {data.company?.address && (
                <Text style={styles.partyLine}>{data.company.address}</Text>
              )}
              {data.company?.cityState && (
                <Text style={styles.partyLine}>{data.company.cityState}</Text>
              )}
              {data.company?.phone && (
                <Text style={styles.partyLine}>{data.company.phone}</Text>
              )}
              {data.company?.email && (
                <Text style={styles.partyLine}>{data.company.email}</Text>
              )}
              {data.company?.website && (
                <Text style={styles.partyLine}>{data.company.website}</Text>
              )}

              {data.company?.customInfo && data.company.customInfo.length > 0 && (
                <View style={styles.customInfoWrap}>
                  {data.company.customInfo.map((entry: any, idx: number) => (
                    <Text key={`company-custom-${idx}`} style={styles.partyMuted}>
                      {entry?.label ? `${entry.label}: ` : ""}
                      {entry?.value || ""}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {data?.client && (
            <View style={[styles.partyBox, styles.partyBoxLast]}>
              <Text style={styles.partyTitle}>To</Text>

              {data.client?.name && (
                <Text style={styles.partyName}>{data.client.name}</Text>
              )}
              {data.client?.address && (
                <Text style={styles.partyLine}>{data.client.address}</Text>
              )}
              {data.client?.cityState && (
                <Text style={styles.partyLine}>{data.client.cityState}</Text>
              )}
              {data.client?.phone && (
                <Text style={styles.partyLine}>{data.client.phone}</Text>
              )}
              {data.client?.email && (
                <Text style={styles.partyLine}>{data.client.email}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {data?.table?.columns && data?.table?.rows && (
        <View style={styles.tableWrap}>
          <View style={styles.tableHeaderRow} fixed>
            {data.table.columns.map((col: any, idx: number) => (
              <Text
                key={`head-${idx}`}
                style={[
                  styles.tableHeaderCell,
                  col?.key === "num" && styles.textCenter,
                  col?.key === "quantity" && styles.textCenter,
                  col?.key === "unit" && styles.textCenter,
                  (col?.key === "unit_price" || col?.key === "amount") && styles.textRight,
                  resolveColumnWidthStyle(col),
                ]}
              >
                {col?.label}
              </Text>
            ))}
          </View>

          {data.table.rows.map((row: any, rowIdx: number) => {
            const isGroup =
              row?.type === "group_header" ||
              row?.rowType === "group_header" ||
              row?.isGroupHeader;

            if (isGroup) {
              return (
                <View key={`group-${rowIdx}`} style={[styles.tableRow, styles.tableGroupRow]}>
                  <Text style={[styles.tableCell, { flex: 1, fontFamily: "Helvetica-Bold" }]}>
                    {row?.groupName || row?.groupLabel || ""}
                  </Text>
                </View>
              );
            }

            return (
              <View
                key={`row-${rowIdx}`}
                style={[styles.tableRow, rowIdx % 2 === 1 ? styles.tableRowEven : null]}
                wrap={false}
              >
                {data.table.columns.map((col: any, colIdx: number) => {
                  const cell = row?.cells?.[col.key];
                  const isDescription = col?.key === "description";
                  const isMake = col?.key === "make";
                  const alignStyle =
                    col?.align === "right"
                      ? styles.textRight
                      : col?.align === "center"
                        ? styles.textCenter
                        : null;

                  return (
                    <View
                      key={`cell-${rowIdx}-${colIdx}`}
                      style={[
                        styles.tableCell,
                        resolveColumnWidthStyle(col),
                        alignStyle,
                      ]}
                    >
                      {isDescription ? (
                        <>
                          {row?.imageUrl && (
                            <Image src={row.imageUrl} style={styles.imageThumb} />
                          )}
                          <Text style={styles.descriptionMain}>
                            {getDescriptionMain(cell)}
                          </Text>
                          {getDescriptionSub(cell) ? (
                            <Text style={styles.descriptionSub}>
                              {getDescriptionSub(cell)}
                            </Text>
                          ) : null}
                        </>
                      ) : isMake ? (
                        <Text style={styles.makeText}>{getCellText(cell)}</Text>
                      ) : (
                        <Text style={alignStyle}>{getCellText(cell)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}

      {(data?.paymentDetails ||
        data?.totals ||
        data?.advanceSummary ||
        data?.amountInWords ||
        data?.balanceDue) && (
        <View style={styles.closingRow}>
          {data?.showBankDetails && data?.paymentDetails && (
            <View style={styles.bankBox}>
              <Text style={styles.sectionTitle}>Bank Details</Text>

              {data.paymentDetails?.bankName && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Bank</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.bankName}</Text>
                </View>
              )}
              {data.paymentDetails?.accountName && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account Name</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.accountName}</Text>
                </View>
              )}
              {data.paymentDetails?.accountNumber && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Account Number</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.accountNumber}</Text>
                </View>
              )}
              {data.paymentDetails?.sortCode && (
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>Sort Code</Text>
                  <Text style={styles.bankValue}>{data.paymentDetails.sortCode}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.totalsBox}>
            {data?.totals?.lines &&
              data.totals.lines.map((line: any, idx: number) => (
                <View key={`total-${idx}`} style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{line?.label}</Text>
                  <Text style={styles.totalValue}>{line?.value}</Text>
                </View>
              ))}

            {data?.advanceSummary && (
              <View style={styles.advanceBox}>
                {data.advanceSummary?.contractValue && (
                  <View style={styles.advanceRow}>
                    <Text style={styles.advanceLabel}>
                      {data.advanceSummary?.contractValueLabel}
                    </Text>
                    <Text style={styles.advanceValue}>
                      {data.advanceSummary.contractValue}
                    </Text>
                  </View>
                )}

                {data.advanceSummary?.advanceAmount && (
                  <View style={styles.advanceRow}>
                    <Text style={styles.advanceProminentLabel}>
                      {data.advanceSummary?.primaryLabel}
                    </Text>
                    <Text style={styles.advanceProminentValue}>
                      {data.advanceSummary.advanceAmount}
                    </Text>
                  </View>
                )}

                {data.advanceSummary?.balanceRemaining && (
                  <View style={styles.advanceRow}>
                    <Text style={styles.advanceLabel}>
                      {data.advanceSummary?.secondaryLabel}
                    </Text>
                    <Text style={styles.advanceValue}>
                      {data.advanceSummary.balanceRemaining}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {data?.totals?.mainLine && (
              <View style={styles.totalFinal}>
                <Text style={styles.totalFinalLabel}>{data.totals.mainLine.label}</Text>
                <Text style={styles.totalFinalValue}>{data.totals.mainLine.value}</Text>
              </View>
            )}

            {data?.totals?.amountInWords && (
              <Text style={styles.amountWords}>{data.totals.amountInWords}</Text>
            )}

            {data?.totals?.balanceDue && (
              <View style={styles.balanceDue}>
                <Text style={styles.balanceDueText}>{data.totals.balanceDue.label}</Text>
                <Text style={styles.balanceDueText}>{data.totals.balanceDue.value}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {(data?.notes ||
        data?.terms ||
        data?.attachments ||
        data?.additionalFields) && (
        <View>
          {data?.notes?.content && (
            <View style={styles.optionalSection}>
              {data?.notes?.title && (
                <Text style={styles.optionalTitle}>{data.notes.title}</Text>
              )}
              <Text style={styles.optionalText}>{data.notes.content}</Text>
            </View>
          )}

          {data?.terms?.content && (
            <View style={styles.optionalSection}>
              {data?.terms?.title && (
                <Text style={styles.optionalTitle}>{data.terms.title}</Text>
              )}
              <Text style={styles.optionalText}>{data.terms.content}</Text>
            </View>
          )}

          {data?.attachments && data.attachments.length > 0 && (
            <View style={styles.optionalSection}>
              <Text style={styles.optionalTitle}>Attachments</Text>
              <View style={styles.attachmentsWrap}>
                {data.attachments.map((item: any, idx: number) => {
                  if (typeof item === "string") {
                    return (
                      <Text key={`attach-${idx}`} style={styles.attachmentItem}>
                        - {item}
                      </Text>
                    );
                  }

                  if (item?.url && item?.label) {
                    return (
                      <Link
                        key={`attach-${idx}`}
                        src={item.url}
                        style={styles.attachmentLink}
                      >
                        {item.label}
                      </Link>
                    );
                  }

                  if (item?.label) {
                    return (
                      <Text key={`attach-${idx}`} style={styles.attachmentItem}>
                        - {item.label}
                      </Text>
                    );
                  }

                  if (item?.url) {
                    return (
                      <Link
                        key={`attach-${idx}`}
                        src={item.url}
                        style={styles.attachmentLink}
                      >
                        {item.url}
                      </Link>
                    );
                  }

                  return null;
                })}
              </View>
            </View>
          )}

          {data?.additionalFields && data.additionalFields.length > 0 && (
            <View style={styles.optionalSection}>
              <View style={styles.additionalWrap}>
                {data.additionalFields.map((field: any, idx: number) => (
                  <View key={`add-${idx}`} style={styles.additionalRow}>
                    <Text style={styles.additionalLabel}>{field?.label}</Text>
                    <Text style={styles.additionalValue}>{field?.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {data?.signature && (data.signature?.imageUrl || data.signature?.name) && (
        <View style={styles.signatureWrap}>
          <View style={styles.signatureBox}>
            {data.signature?.imageUrl && (
              <Image src={data.signature.imageUrl} style={styles.signatureImage} />
            )}
            <View style={styles.signatureLine} />
            {data.signature?.name && (
              <Text style={styles.signerName}>{data.signature.name}</Text>
            )}
            {data.signature?.role && (
              <Text style={styles.signerRole}>{data.signature.role}</Text>
            )}
          </View>
        </View>
      )}

      {data?.showTagline && data?.company?.tagline && (
        <Text style={styles.taglineFooter}>{data.company.tagline}</Text>
      )}

      {(data?.footer?.documentNumber ||
        data?.footer?.companyName ||
        data?.documentNumber ||
        data?.company?.name ||
        data?.footer?.extraText ||
        footerParts.length > 0) && (
        <View style={styles.documentFooter}>
          <Text style={styles.footerText}>
            {data?.footer?.pageNumber || ""}
          </Text>
          <Text style={styles.footerText}>
            {data?.footer?.documentNumber || data?.documentNumber || ""}
          </Text>
          <Text style={styles.footerText}>
            {data?.footer?.companyName || data?.company?.name || data?.footer?.extraText || ""}
          </Text>
        </View>
      )}

      <View style={styles.continuationFooter} fixed>
        <Text
          style={styles.footerText}
          render={({ pageNumber }) => (pageNumber > 1 ? `Page ${pageNumber}` : "")}
        />
        <Text
          style={styles.footerText}
          render={({ pageNumber }) =>
            pageNumber > 1 ? (data?.footer?.documentNumber || data?.documentNumber || "") : ""
          }
        />
        <Text
          style={styles.footerText}
          render={({ pageNumber }) =>
            pageNumber > 1
              ? (data?.footer?.companyName || data?.company?.name || data?.footer?.extraText || "")
              : ""
          }
        />
      </View>
    </Page>
  );
}
