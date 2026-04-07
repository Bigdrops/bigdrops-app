import Layout from '@/components/Layout'
import { RfqList } from '@/components/rfq/RfqList'

export default function Rfqs() {
  return (
    <Layout title="RFQs" session={null} hidePageHeader>
      <RfqList />
    </Layout>
  );
}
