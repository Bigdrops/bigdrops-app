import { Link, Text } from '@react-pdf/renderer'
import { styles } from './industryStyles'
import { buildAttachmentItems } from '../../engine/attachments'
import type { CommercialDocumentData } from '../../industryAdapter'

export function OptionalList(items: CommercialDocumentData['attachments']) {
  const attachmentItems = buildAttachmentItems(items)

  return attachmentItems.map((item, idx) => {
    if (item.url && item.label) {
      return (
        <Link key={`attach-${idx}`} src={item.formattedUrl || item.url} style={styles.attachmentLink}>
          {item.label}
        </Link>
      )
    }
    if (item.label) {
      return (
        <Text key={`attach-${idx}`} style={styles.attachmentItem}>
          - {item.label}
        </Text>
      )
    }
    if (item.url) {
      return (
        <Link key={`attach-${idx}`} src={item.formattedUrl || item.url} style={styles.attachmentLink}>
          {item.url}
        </Link>
      )
    }
    return null
  })
}
