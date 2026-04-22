import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    "https://xqlpekpkbszpdgtuwybh.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNTM0OCwiZXhwIjoyMDg3ODAxMzQ4fQ.sjkSgegXyaJpXlyv1IrwfOFKrPem_Lqq-GFKxX17dCc",
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { count, error } = await supabase
    .from('quotation_items')
    .select('*', { count: 'exact', head: true })

  if (error) throw error
  console.log('Total quotation items in DB (exact count):', count)
  
  const { count: qCount, error: qError } = await supabase
    .from('quotations')
    .select('*', { count: 'exact', head: true })
    
  if (qError) throw qError
  console.log('Total quotations in DB (exact count):', qCount)
}

main().catch(console.error)
