import { StyleSheet } from '@react-pdf/renderer'

export const partyCardStyles = StyleSheet.create({
  partyBox: {
    flex: 1,
    backgroundColor: '#e8e8e8',
    borderWidth: 1,
    borderColor: '#d4d4d4',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    marginRight: 14,
    borderRadius: 3,
  },
  partyBoxLast: {
    marginRight: 0,
  },
  partyTitle: {
    fontSize: 14,
    color: '#7d8a88',
    marginBottom: 10,
    fontFamily: 'Helvetica-Bold',
  },
  partyName: {
    fontSize: 12.5,
    marginBottom: 5,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
  },
  partyLine: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 2,
    lineHeight: 1.35,
  },
})