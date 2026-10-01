import Layout from '@/components/Layout'
import { CpsList } from '@/components/cps/CpsList'
import { DocumentQueryProvider } from '@/context/DocumentQueryContext'

export default function CostPricingSheets() {
  return (
    <Layout title="Cost & Pricing Sheets" session={null} hidePageHeader>
      <DocumentQueryProvider module="cps_sheets">
        <CpsList />
      </DocumentQueryProvider>
    </Layout>
  )
}
