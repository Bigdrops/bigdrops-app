import Layout from '../components/Layout'
import ProformaInvoiceForm from '../components/proforma/ProformaInvoiceForm'

export default function NewProformaInvoice() {
  return (
    <Layout title="New Proforma Invoice" session={null}>
      <ProformaInvoiceForm mode="new" />
    </Layout>
  )
}
