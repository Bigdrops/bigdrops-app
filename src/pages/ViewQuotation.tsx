import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import QuotationDetail from '../components/quotation/QuotationDetail'

export default function ViewQuotation() {
  const { id } = useParams()
  return (
    <Layout title="Quotation" session={null}>
      <QuotationDetail quotationId={id || ''} />
    </Layout>
  )
}
