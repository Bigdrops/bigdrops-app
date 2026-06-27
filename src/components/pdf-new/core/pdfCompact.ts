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
}

export const compactLedger: Partial<CompactOverrides> = {
  page: { padding: 20 },
  header: { marginBottom: 10 },
  partyRow: { marginBottom: 10 },
  partyBox: { padding: 12 },
  tableWrap: { marginBottom: 10 },
  tableHeaderCell: { paddingVertical: 5 },
  tableCell: { paddingVertical: 4 },
  closingRow: { marginBottom: 10 },
  totalsBox: { paddingTop: 8, paddingBottom: 8, paddingHorizontal: 12 },
  totalRow: { marginBottom: 3 },
  totalFinal: { marginTop: 4, paddingTop: 4 },
  optionalSection: { marginBottom: 8 },
  signatureWrap: { marginTop: 8 },
  tableRow: { borderBottomWidth: 0.5 },
}

export const compactObsidian: Partial<CompactOverrides> = {
  page: { padding: 16 },
  partyRow: { marginBottom: 8 },
  partyBox: { padding: 10 },
  tableWrap: { marginBottom: 8 },
  tableHeaderCell: { paddingVertical: 5 },
  tableCell: { paddingVertical: 3 },
  closingRow: { marginBottom: 8 },
  totalsBox: { paddingTop: 8, paddingBottom: 8, paddingHorizontal: 10 },
  totalRow: { marginBottom: 2 },
  totalFinal: { marginTop: 4, paddingTop: 4 },
  optionalSection: { marginBottom: 8 },
  signatureWrap: { marginTop: 8 },
  tableRow: { borderBottomWidth: 0.5 },
}
