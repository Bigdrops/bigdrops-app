import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#FBFAF6',
    fontFamily: 'Helvetica',
    color: '#1F2933',
    fontSize: 9,
  },

  hero: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 20,
  },

  identity: {
    flex: 1,
    backgroundColor: '#2F3A44',
    borderRadius: 18,
    padding: 22,
    minHeight: 150,
  },

  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D8C7A3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2F3A44',
  },

  logoImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 20,
    objectFit: 'contain',
  },

  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -1,
  },

  customTitle: {
    marginTop: 5,
    fontSize: 10,
    color: '#D8C7A3',
  },

  labelRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    flexWrap: 'wrap',
  },

  primaryLabel: {
    backgroundColor: '#FFFFFF',
    color: '#2F3A44',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  secondaryLabel: {
    backgroundColor: '#D8C7A3',
    color: '#2F3A44',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 20,
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  metaCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4DFD2',
    borderRadius: 18,
    padding: 16,
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#E4DFD2',
  },

  metaLabel: {
    fontSize: 7,
    color: '#7B8794',
    textTransform: 'uppercase',
  },

  metaValue: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#1F2933',
  },

  parties: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },

  panel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4DFD2',
    borderRadius: 16,
    padding: 14,
  },

  panelTitle: {
    fontSize: 7,
    textTransform: 'uppercase',
    color: '#7B8794',
    fontWeight: 'bold',
    marginBottom: 7,
  },

  partyName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1F2933',
  },

  mutedText: {
    color: '#7B8794',
    lineHeight: 1.35,
  },

  tableWrap: {
    borderWidth: 1,
    borderColor: '#E4DFD2',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 18,
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3EFE6',
    borderBottomWidth: 1,
    borderBottomColor: '#E4DFD2',
  },

  tableHeaderCell: {
    padding: 8,
    fontSize: 7,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    color: '#2F3A44',
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E4DFD2',
    minHeight: 34,
  },

  tableCell: {
    padding: 8,
    fontSize: 8,
    color: '#1F2933',
  },

  groupHeader: {
    backgroundColor: '#2F3A44',
    paddingVertical: 7,
    paddingHorizontal: 9,
  },

  groupHeaderText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },

  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: '#F3EFE6',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E4DFD2',
  },

  groupFooterText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#2F3A44',
  },

  nestedRow: {
    borderLeftWidth: 3,
    borderLeftColor: '#D8C7A3',
  },

  itemImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 7,
    objectFit: 'cover',
  },

  descriptionCell: {
    flexDirection: 'row',
  },

  lower: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },

  stack: {
    flex: 1,
    gap: 12,
  },

  totals: {
    width: 220,
    backgroundColor: '#2F3A44',
    borderRadius: 16,
    padding: 15,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },

  totalLabel: {
    color: '#FFFFFF',
    fontSize: 8,
  },

  totalValue: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  mainTotalLabel: {
    color: '#D8C7A3',
    fontSize: 12,
    fontWeight: 'bold',
  },

  mainTotalValue: {
    color: '#D8C7A3',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  amountWords: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 7,
    lineHeight: 1.35,
  },

  signatureImage: {
    width: 110,
    height: 42,
    objectFit: 'contain',
    marginBottom: 6,
  },

  signatureBlock: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  signatureLine: {
    width: 160,
    borderTopWidth: 1,
    borderTopColor: '#1F2933',
    paddingTop: 6,
    textAlign: 'center',
  },

  footer: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E4DFD2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#7B8794',
    fontSize: 7,
  },
});

export function resolveAlignment(align?: string) {
  if (align === 'right') return { textAlign: 'right' as const };
  if (align === 'center') return { textAlign: 'center' as const };
  return { textAlign: 'left' as const };
}