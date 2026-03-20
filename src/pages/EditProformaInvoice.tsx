import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import ProformaInvoiceForm from '../components/proforma/ProformaInvoiceForm'

export default function EditProformaInvoice() {
  const { id } = useParams()

  return (
    <Layout title="Edit Proforma Invoice" session={null}>
      <ProformaInvoiceForm mode="edit" proformaId={id} />
    </Layout>
  )
}
