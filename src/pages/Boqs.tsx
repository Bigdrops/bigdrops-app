import Layout from '@/components/Layout'
import { BoqList } from '@/components/boq/BoqList'

export default function Boqs() {
  return (
    <Layout title="BOQs" session={null} hidePageHeader>
      <BoqList />
    </Layout>
  )
}
