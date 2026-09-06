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

// compactCommercialDocument moved to presentation/industry/compact.ts
// compactLedger and compactObsidian remain here for Ledger/Obsidian templates

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
