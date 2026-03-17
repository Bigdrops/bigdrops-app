import Layout from '../components/Layout'
import QuotationForm from '../components/quotation/QuotationForm'

export default function NewQuotation() {
  return (
    <Layout title="New Quotation" session={null}>
      <QuotationForm mode="new" />
    </Layout>
  )
}
