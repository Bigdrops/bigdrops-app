import { Link, Text } from '@react-pdf/renderer'
import type { CommercialDocumentData } from '../industryAdapter'
import { styles } from '../templates/industryStyles'

export function renderOptionalList(items: CommercialDocumentData['attachments']) {
  return items.map((item, idx) => {
    if (typeof item === 'string') return <Text key={`attach-${idx}`} style={styles.attachmentItem}>- {item}</Text>
    if (item?.url && item?.label) return <Link key={`attach-${idx}`} src={item.url} style={styles.attachmentLink}>{item.label}</Link>
    if (item?.label) return <Text key={`attach-${idx}`} style={styles.attachmentItem}>- {item.label}</Text>
    if (item?.url) return <Link key={`attach-${idx}`} src={item.url} style={styles.attachmentLink}>{item.url}</Link>
    return null
  })
}
