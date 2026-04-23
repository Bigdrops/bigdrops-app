import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    "https://xqlpekpkbszpdgtuwybh.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNTM0OCwiZXhwIjoyMDg3ODAxMzQ4fQ.sjkSgegXyaJpXlyv1IrwfOFKrPem_Lqq-GFKxX17dCc",
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const parentId = 'ce24401c-a96d-4eb2-bd3e-3bffea3a65c4'

  // Test 1: Current filter using JSONB operators
  console.log('=== Test 1: JSONB operator filter ===')
  const { data: d1, error: e1 } = await supabase
    .from('invoices')
    .select('id, invoice_number, custom_fields')
    .eq('custom_fields->advance_invoice->>parentId', parentId)
    .is('archived_at', null)
  console.log('Error:', e1)
  console.log('Count:', d1?.length || 0)
  console.log('Rows:', d1?.map(r => ({ id: r.id, num: r.invoice_number })))

  // Test 2: Like filter (text search)
  console.log('\n=== Test 2: Text ilike filter ===')
  const { data: d2, error: e2 } = await supabase
    .from('invoices')
    .select('id, invoice_number, custom_fields')
    .ilike('custom_fields', `%"parentId":"${parentId}"%`)
    .is('archived_at', null)
  console.log('Error:', e2)
  console.log('Count:', d2?.length || 0)
  console.log('Rows:', d2?.map(r => ({ id: r.id, num: r.invoice_number })))

  // Test 3: Contains filter for JSONB
  console.log('\n=== Test 3: JSONB contains filter ===')
  const { data: d3, error: e3 } = await supabase
    .from('invoices')
    .select('id, invoice_number, custom_fields')
    .contains('custom_fields', { advance_invoice: { parentId } })
    .is('archived_at', null)
  console.log('Error:', e3)
  console.log('Count:', d3?.length || 0)
  console.log('Rows:', d3?.map(r => ({ id: r.id, num: r.invoice_number })))

  // Test 4: Get column type
  console.log('\n=== Test 4: Check column type ===')
  const { data: d4, error: e4 } = await supabase.rpc('exec_sql', {
    sql: `SELECT data_type FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'custom_fields'`
  })
  console.log('Error:', e4)
  console.log('Type:', d4)
}

main().catch(console.error)
