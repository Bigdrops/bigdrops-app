import { StyleSheet } from '@react-pdf/renderer'

export const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    paddingBottom: 44,
  },
  heroBand: {
    height: 88,
    width: '100%',
  },
  content: {
    paddingHorizontal: 36,
    paddingTop: 30,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  meta: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 4,
  },
  message: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 1.6,
    color: '#334155',
    maxWidth: 420,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 36,
    paddingVertical: 10,
    borderTop: '1px solid #e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
  },
})
