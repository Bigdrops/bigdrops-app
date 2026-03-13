import Layout from '../components/Layout'
import { BarChart3 } from 'lucide-react'

export default function Reports() {
  return (
    <Layout title="Reports">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <BarChart3 size={28} color="#94A3B8" />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>Reports</h2>
        <p style={{ margin: 0, fontSize: 14, color: '#94A3B8', maxWidth: 320, lineHeight: 1.6 }}>
          Financial reports and insights are coming soon. Once your project data builds up, this will show you profit, expenses, and billing summaries.
        </p>
        <div style={{ marginTop: 20, padding: '6px 14px', backgroundColor: '#F1F5F9', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Coming Soon
        </div>
      </div>
    </Layout>
  )
}
