import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Layout from '../components/Layout'

export default function Dashboard() {
  const [counts, setCounts] = useState({ invoices: 0, quotations: 0, csrs: 0, clients: 0 })

  useEffect(() => {
    supabase.from('invoices').select('id', { count: 'exact' }).then(({ count }) =>
      setCounts(c => ({ ...c, invoices: count || 0 })))
    supabase.from('clients').select('id', { count: 'exact' }).then(({ count }) =>
      setCounts(c => ({ ...c, clients: count || 0 })))
  }, [])

  return (
    <Layout title="Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {[
          { label: 'Total Invoices', value: counts.invoices, color: '#CC0000' },
          { label: 'Quotations', value: counts.quotations, color: '#0056B3' },
          { label: 'CSRs Filed', value: counts.csrs, color: '#333' },
          { label: 'Active Clients', value: counts.clients, color: '#16A34A' },
        ].map(card => (
          <div key={card.label} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `4px solid ${card.color}` }}>
            <div style={{ color: '#888', fontSize: '13px', marginBottom: '8px' }}>{card.label}</div>
            <div style={{ color: card.color, fontSize: '32px', fontWeight: 'bold' }}>{card.value}</div>
          </div>
        ))}
      </div>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1a1a1a' }}>Recent Documents</h3>
        <p style={{ color: '#888', fontSize: '14px' }}>No documents yet. Create your first invoice to get started.</p>
      </div>
    </Layout>
  )
}