import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xqlpekpkbszpdgtuwybh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNTM0OCwiZXhwIjoyMDg3ODAxMzQ4fQ.sjkSgegXyaJpXlyv1IrwfOFKrPem_Lqq-GFKxX17dCc'
)

async function main() {
  // 1. Invoice SASINV055 — all columns
  const { data: inv, error: ie } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', 'SASINV055')
    .single()
  if (ie) { console.error('Invoice error:', ie); return }
  console.log('=== INVOICE SASINV055 ===')
  console.log(JSON.stringify(inv, null, 2))

  // 2. All audit_logs for this invoice, chronological
  const { data: audit } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', 'invoice')
    .eq('entity_id', inv.id)
    .order('created_at', { ascending: true })
  console.log(`\n=== ALL AUDIT LOGS FOR SASINV055 (${audit?.length || 0}) ===`)
  for (const row of audit) {
    console.log(JSON.stringify(row, null, 2))
    console.log('---')
  }

  // 3. Try to get user email from auth schema
  const actorIds = [...new Set(audit.map(r => r.actor_id).filter(Boolean))]
  console.log(`\n=== ACTOR IDS FOUND: ${actorIds.join(', ')} ===`)
  
  // Query public.users (the app's users table)
  if (actorIds.length) {
    const { data: pubUsers } = await supabase
      .from('users')
      .select('id, email')
      .in('id', actorIds)
    console.log('Public users:', JSON.stringify(pubUsers, null, 2))
  }

  // Try REST API directly on auth.users
  const supaUrl = 'https://xqlpekpkbszpdgtuwybh.supabase.co'
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNTM0OCwiZXhwIjoyMDg3ODAxMzQ4fQ.sjkSgegXyaJpXlyv1IrwfOFKrPem_Lqq-GFKxX17dCc'
  
  for (const aid of actorIds) {
    const resp = await fetch(`${supaUrl}/rest/v1/rpc/get_user_email_by_id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_user_id: aid })
    })
    const text = await resp.text()
    console.log(`\nRPC get_user_email_by_id(${aid}): ${text}`)
  }
}

main().catch(console.error)
