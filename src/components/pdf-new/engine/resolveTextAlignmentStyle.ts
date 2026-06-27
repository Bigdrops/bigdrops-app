import { StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  textRight: { textAlign: 'right' },
  textCenter: { textAlign: 'center' },
})

export function resolveTextAlignmentStyle(column: { align?: string }) {
  if (column.align === 'right') return styles.textRight
  if (column.align === 'center') return styles.textCenter
  return null
}

export { styles as textAlignmentStyles }