import Layout from '../components/Layout'
import QuotationList from '../components/quotation/QuotationList'
import { DocumentQueryProvider } from '@/context/DocumentQueryContext'

export default function Quotations() {
  return (
    <Layout title="Quotations" session={null} hidePageHeader>
      <DocumentQueryProvider module="quotations">
        <QuotationList />
      </DocumentQueryProvider>
    </Layout>
  )
}
