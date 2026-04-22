import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    "https://xqlpekpkbszpdgtuwybh.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNTM0OCwiZXhwIjoyMDg3ODAxMzQ4fQ.sjkSgegXyaJpXlyv1IrwfOFKrPem_Lqq-GFKxX17dCc",
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: inv, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', 'Sasi-6347ty7d-A')
    .single()

  if (error) throw error
  console.log('Invoice:', JSON.stringify(inv, null, 2))
  
  const { data: items, error: iError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', inv.id)
    
  if (iError) throw iError
  console.log('Items:', items)
}

main().catch(console.error)
