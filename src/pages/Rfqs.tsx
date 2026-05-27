import Layout from '@/components/Layout'
import { RfqList } from '@/components/rfq/RfqList'
import { DocumentQueryProvider } from '@/context/DocumentQueryContext'

export default function Rfqs() {
  return (
    <Layout title="RFQs" session={null} hidePageHeader>
      <DocumentQueryProvider module="rfqs">
        <RfqList />
      </DocumentQueryProvider>
    </Layout>
  )
}
