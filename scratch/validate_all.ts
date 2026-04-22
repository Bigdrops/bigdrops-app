import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

function parseCustomFields(value: any): any {
  if (!value) return {}
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return {} }
}

function isImported(cf: any) {
  return parseCustomFields(cf).source === 'refrens_import'
}

async function main() {
  const supabase = createClient(
    "https://xqlpekpkbszpdgtuwybh.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNTM0OCwiZXhwIjoyMDg3ODAxMzQ4fQ.sjkSgegXyaJpXlyv1IrwfOFKrPem_Lqq-GFKxX17dCc",
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const [invoicesResult, invoiceItemsResult, quotationsResult, quotationItemsResult] = await Promise.all([
    supabase.from('invoices').select('*').limit(5000),
    supabase.from('invoice_items').select('*').limit(20000),
    supabase.from('quotations').select('*').limit(5000),
    supabase.from('quotation_items').select('*').limit(20000),
  ])

  const importedInvoices = (invoicesResult.data || []).filter(r => isImported(r.custom_fields))
  const importedQuotations = (quotationsResult.data || []).filter(r => isImported(r.custom_fields))

  const invItemMap = new Map<string, any[]>()
  for (const item of (invoiceItemsResult.data || [])) {
    const list = invItemMap.get(item.invoice_id) || []
    list.push(item)
    invItemMap.set(item.invoice_id, list)
  }

  const qItemMap = new Map<string, any[]>()
  for (const item of (quotationItemsResult.data || [])) {
    const list = qItemMap.get(item.quotation_id) || []
    list.push(item)
    qItemMap.set(item.quotation_id, list)
  }

  const invWithoutTotals = importedInvoices.filter(r => !r.total || r.total === 0)
  const qWithoutTotals = importedQuotations.filter(r => !r.total || r.total === 0)

  console.log('--- Invoices ---')
  console.log(`Total: ${importedInvoices.length}, Without Totals: ${invWithoutTotals.length}`)
  if (invWithoutTotals.length > 0) {
      console.log('Invoices without totals:', invWithoutTotals.map(i => i.invoice_number).join(', '))
  }
  
  console.log('\n--- Quotations ---')
  console.log(`Total: ${importedQuotations.length}, Without Totals: ${qWithoutTotals.length}`)
  if (qWithoutTotals.length > 0) {
      console.log('Quotations without totals:', qWithoutTotals.map(q => q.quotation_number).join(', '))
  }
}

main().catch(console.error)
