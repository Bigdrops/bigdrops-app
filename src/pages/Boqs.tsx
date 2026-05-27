import Layout from '@/components/Layout'
import { BoqList } from '@/components/boq/BoqList'
import { DocumentQueryProvider } from '@/context/DocumentQueryContext'

export default function Boqs() {
  return (
    <Layout title="BOQs" session={null} hidePageHeader>
      <DocumentQueryProvider module="boqs">
        <BoqList />
      </DocumentQueryProvider>
    </Layout>
  )
}
