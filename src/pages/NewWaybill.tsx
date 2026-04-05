import Layout from '../components/Layout'
import WaybillForm from '../components/waybill/WaybillForm'

export default function NewWaybill() {
  return (
    <Layout title="New Waybill" session={null}>
      <WaybillForm mode="new" />
    </Layout>
  )
}
