import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import QuotationForm from '../components/quotation/QuotationForm'

export default function EditQuotation() {
  const { id } = useParams()
  return (
    <Layout title="Edit Quotation" session={null}>
      <QuotationForm mode="edit" quotationId={id} />
    </Layout>
  )
}
