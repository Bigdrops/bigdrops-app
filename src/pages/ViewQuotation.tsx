import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import QuotationDetail from '../components/quotation/QuotationDetail'

export default function ViewQuotation() {
  const { id } = useParams()
  return (
    <Layout title="Quotation" session={null} hidePageHeader contentClassName="w-full px-4 pb-32 pt-4 md:px-6 md:pt-6">
      <QuotationDetail quotationId={id || ''} />
    </Layout>
  )
}
