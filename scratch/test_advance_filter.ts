import { createClient } from '@supabase/supabase-js'

/**
 * Scratch test script for advance child lookup queries.
 *
 * NOTE: The invoices.custom_fields column is TEXT (not JSONB).
 * JSON operators (->, ->>, @>, contains) WILL FAIL on TEXT columns.
 * Use ilike() or .or() with ilike patterns instead.
 *
 * Run: npx tsx scratch/test_advance_filter.ts
 * Related: npm run audit:supabase-queries (checks for forbidden patterns)
 */

async function main() {
  const supabase = createClient(
    "https://xqlpekpkbszpdgtuwybh.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNTM0OCwiZXhwIjoyMDg3ODAxMzQ4fQ.sjkSgegXyaJpXlyv1IrwfOFKrPem_Lqq-GFKxX17dCc",
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const parentId = 'ce24401c-a96d-4eb2-bd3e-3bffea3a65c4'

  // Test 1: TEXT-safe ilike filter (correct pattern for TEXT columns)
  console.log('=== Test 1: TEXT-safe ilike filter ===')
  const { data: d1, error: e1 } = await supabase
    .from('invoices')
    .select('id, invoice_number, custom_fields')
    .ilike('custom_fields', `%"parentId":"${parentId}"%`)
    .is('archived_at', null)
  console.log('Error:', e1)
  console.log('Count:', d1?.length || 0)
  console.log('Rows:', d1?.map(r => ({ id: r.id, num: r.invoice_number })))

  // Test 2: or()-based text filter (alternative TEXT-safe pattern)
  console.log('\n=== Test 2: or() text ilike filter ===')
  const { data: d2, error: e2 } = await supabase
    .from('invoices')
    .select('id, invoice_number, custom_fields')
    .ilike('custom_fields', `%"parentId":"${parentId}"%`)
    .is('archived_at', null)
  console.log('Error:', e2)
  console.log('Count:', d2?.length || 0)
  console.log('Rows:', d2?.map(r => ({ id: r.id, num: r.invoice_number })))

  // Test 3: TEXT-safe exclusion filter (exclude advance children from lists)
  console.log('\n=== Test 3: TEXT-safe advance exclusion filter ===')
  const { data: d3, error: e3 } = await supabase
    .from('invoices')
    .select('id, invoice_number, custom_fields')
    .or('custom_fields.is.null,custom_fields.not.ilike.%"role":"advance"%')
    .is('archived_at', null)
    .limit(10)
  console.log('Error:', e3)
  console.log('Count:', d3?.length || 0)

  // Test 4: Get column type (metadata query — always safe)
  console.log('\n=== Test 4: Check column type ===')
  const { data: d4, error: e4 } = await supabase.rpc('exec_sql', {
    sql: `SELECT data_type FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'custom_fields'`
  })
  console.log('Error:', e4)
  console.log('Type:', d4)

  // Test 5: Legacy role filter (find all rows with role=advance for cleanup)
  console.log('\n=== Test 5: Legacy role filter ===')
  const { data: d5, error: e5 } = await supabase
    .from('invoices')
    .select('id, invoice_number, custom_fields, archived_at, parent_invoice_id')
    .ilike('custom_fields', '%"role":"advance"%')
    .limit(10)
  console.log('Error:', e5)
  console.log('Count:', d5?.length || 0)
}

main().catch(console.error)
