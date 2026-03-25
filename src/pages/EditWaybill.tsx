import { useParams } from 'react-router-dom'

import Layout from '../components/Layout'
import WaybillForm from '../components/waybill/WaybillForm'

export default function EditWaybill() {
  const { id } = useParams<{ id: string }>()

  return (
    <Layout title="Edit Waybill">
      <WaybillForm mode="edit" waybillId={id} />
    </Layout>
  )
}
