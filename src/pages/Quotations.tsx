import Layout from '../components/Layout'
import QuotationList from '../components/quotation/QuotationList'

export default function Quotations() {
  return (
    <Layout title="Quotations" session={null}>
      <QuotationList />
    </Layout>
  )
}
