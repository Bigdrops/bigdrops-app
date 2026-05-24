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

export const compactIndustry: Partial<CompactOverrides> = {
  page: { paddingTop: 18, paddingBottom: 24 },
  header: { marginBottom: 10 },
  customTitle: { marginBottom: 8 },
  metaRow: { marginBottom: 4 },
  partyRow: { marginBottom: 10 },
  partyBox: { paddingTop: 10, paddingBottom: 10, paddingHorizontal: 10 },
  partyTitle: { marginBottom: 6 },
  tableWrap: { marginBottom: 10 },
  tableHeaderCell: { paddingVertical: 5 },
  tableCell: { paddingVertical: 4 },
  tableGroupHeader: { marginTop: 6, paddingTop: 4, paddingBottom: 4 },
  tableGroupFooter: { marginBottom: 6, paddingTop: 4, paddingBottom: 4 },
  closingRow: { marginBottom: 10 },
  bankBox: { paddingTop: 10, paddingBottom: 10, paddingHorizontal: 10 },
  totalsBox: { paddingTop: 8, paddingBottom: 8, paddingHorizontal: 8 },
  totalRow: { marginBottom: 3 },
  totalFinal: { marginTop: 4, paddingTop: 4 },
  advanceBox: { marginTop: 6, paddingVertical: 8 },
  amountWords: { marginTop: 6, paddingVertical: 4 },
  balanceDue: { marginTop: 6, paddingVertical: 5 },
  optionalSection: { marginBottom: 8 },
  signatureWrap: { marginTop: 8 },
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

export const compactBolt: Partial<CompactOverrides> = {
  page: { paddingTop: 16, paddingBottom: 24 },
  header: { marginBottom: 8 },
  partyRow: { marginBottom: 10 },
  partyBox: { paddingTop: 10, paddingBottom: 10, paddingHorizontal: 12 },
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
