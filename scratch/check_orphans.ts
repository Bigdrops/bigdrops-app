import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const [quotationRowsResult, quotationItemsResult] = await Promise.all([
    supabase.from('quotations').select('id, quotation_number, custom_fields').limit(5000),
    supabase.from('quotation_items').select('id, quotation_id, description').limit(20000),
  ])

  if (quotationRowsResult.error) throw quotationRowsResult.error
  if (quotationItemsResult.error) throw quotationItemsResult.error

  const qIds = new Set(quotationRowsResult.data.map(q => q.id))
  const items = quotationItemsResult.data
  
  const orphanedItems = items.filter(item => !qIds.has(item.quotation_id))
  
  console.log(`Total quotations in DB: ${quotationRowsResult.data.length}`)
  console.log(`Total quotation items in DB: ${items.length}`)
  console.log(`Orphaned quotation items: ${orphanedItems.length}`)

  if (orphanedItems.length > 0) {
      console.log('Sample orphaned items:', orphanedItems.slice(0, 5))
  }
}

main().catch(console.error)
