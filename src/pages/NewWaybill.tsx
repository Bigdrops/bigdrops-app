import Layout from '../components/Layout'
import WaybillForm from '../components/waybill/WaybillForm'

export default function NewWaybill() {
  return (
    <Layout title="New Waybill">
      <WaybillForm mode="new" />
    </Layout>
  )
}
