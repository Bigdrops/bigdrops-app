import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data: items, error } = await supabase
    .from('quotation_items')
    .select('*')
    .ilike('description', '%Indelec preventron%')
    .limit(100)

  if (error) throw error
  console.log('Items found matching description:', items)
}

main().catch(console.error)
