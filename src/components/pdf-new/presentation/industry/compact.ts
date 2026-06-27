import type { Style } from '@react-pdf/types'

type CompactOverrides = {
  page: Style
  header: Style
  headerLeft: Style
  metaRow: Style
  customTitle: Style
  partyRow: Style
  partyBox: Style
  partyTitle: Style
  tableWrap: Style
  tableHeaderCell: Style
  tableCell: Style
  tableGroupHeader: Style
  tableGroupFooter: Style
  closingRow: Style
  bankBox: Style
  totalsBox: Style
  totalRow: Style
  totalFinal: Style
  advanceBox: Style
  amountWords: Style
  balanceDue: Style
  optionalSection: Style
  signatureWrap: Style
  descriptionSub: Style
  tableRow: Style
  groupHeaderRow: Style
  groupFooterRow: Style
  groupSubtotalLabel: Style
  groupSubtotalValue: Style
}

export const compactCommercialDocument: Partial<CompactOverrides> = {
  page: { paddingTop: 12, paddingBottom: 48, paddingHorizontal: 20 },
  header: { marginBottom: 4 },
  customTitle: { marginBottom: 3 },
  metaRow: { marginBottom: 3 },
  partyRow: { marginBottom: 3 },
  partyBox: { paddingTop: 6, paddingBottom: 6, paddingHorizontal: 10 },
  partyTitle: { marginBottom: 4, fontSize: 12 },
  tableWrap: { marginBottom: 5 },
  tableHeaderCell: { paddingVertical: 4 },
  tableCell: { paddingVertical: 2.5, paddingHorizontal: 4 },
  tableGroupHeader: { marginTop: 4, paddingTop: 3, paddingBottom: 3 },
  tableGroupFooter: { marginBottom: 4, paddingTop: 3, paddingBottom: 3 },
  closingRow: { marginBottom: 5 },
  bankBox: { paddingTop: 8, paddingBottom: 8, paddingHorizontal: 10 },
  totalsBox: { paddingTop: 6, paddingBottom: 6, paddingHorizontal: 8 },
  totalRow: { marginBottom: 2 },
  totalFinal: { marginTop: 4, paddingTop: 4 },
  advanceBox: { marginTop: 4, paddingVertical: 6 },
  amountWords: { marginTop: 4, paddingVertical: 3 },
  balanceDue: { marginTop: 4, paddingVertical: 4 },
  optionalSection: { marginBottom: 6 },
  signatureWrap: { marginTop: 6 },
  descriptionSub: { marginTop: 1 },
  tableRow: { borderBottomWidth: 0.5 },
  groupHeaderRow: { paddingVertical: 3, paddingHorizontal: 6 },
  groupFooterRow: { paddingVertical: 3, paddingHorizontal: 6 },
  groupSubtotalLabel: { fontSize: 9 },
  groupSubtotalValue: { fontSize: 9 },
}
