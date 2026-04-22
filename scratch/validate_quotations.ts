import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

function toNumber(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseCustomFields(value: string | Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'string') return JSON.parse(parsed)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function isImported(customFields: any) {
  return parseCustomFields(customFields).source === 'refrens_import'
}

async function main() {
  const supabase = createClient(
    "https://xqlpekpkbszpdgtuwybh.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNTM0OCwiZXhwIjoyMDg3ODAxMzQ4fQ.sjkSgegXyaJpXlyv1IrwfOFKrPem_Lqq-GFKxX17dCc",
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const [quotationRowsResult, quotationItemsResult] = await Promise.all([
    supabase.from('quotations').select('*').limit(5000),
    supabase.from('quotation_items').select('*').limit(20000),
  ])

  if (quotationRowsResult.error) throw quotationRowsResult.error
  if (quotationItemsResult.error) throw quotationItemsResult.error

  const sourcePath = path.join(projectRoot, 'docs/quotations.cleaned.final.json')
  const sourceQuotations = JSON.parse(await readFile(sourcePath, 'utf8')) as any[]
  const sourceMap = new Map<string, any>()
  for (const q of sourceQuotations) {
    const num = String(q.invoice_number || q.quotation_number || '').trim()
    if (num) sourceMap.set(num, q)
  }

  const importedQuotations = quotationRowsResult.data.filter(row => isImported(row.custom_fields))
  const quotationItems = quotationItemsResult.data

  const itemMap = new Map<string, any[]>()
  for (const item of quotationItems) {
    const qid = item.quotation_id
    if (!qid) continue
    const existing = itemMap.get(qid) || []
    existing.push(item)
    itemMap.set(qid, existing)
  }

  const withoutTotals = importedQuotations.filter(q => !q.total || q.total === 0)
  const withTotals = importedQuotations.filter(q => q.total && q.total > 0)

  console.log(`Total imported quotations in Supabase: ${importedQuotations.length}`)
  console.log(`Quotations with totals: ${withTotals.length}`)
  console.log(`Quotations without totals: ${withoutTotals.length}`)

  const causes: Record<string, number> = {
    'zero_items_in_source': 0,
    'items_lost_during_repair_or_never_imported': 0,
    'malformed_item_rows': 0,
    'zero_value_item_totals': 0,
    'other': 0
  }

  for (const q of withoutTotals) {
    const dbItems = itemMap.get(q.id) || []
    const sourceQ = sourceMap.get(q.quotation_number)
    const sourceItems = sourceQ?.items || []

    if (dbItems.length === 0) {
      if (sourceItems.length === 0) {
        causes.zero_items_in_source++
      } else {
        causes.items_lost_during_repair_or_never_imported++
      }
      continue
    }

    const itemTotal = dbItems.reduce((sum, item) => sum + toNumber(item.amount), 0)
    if (itemTotal === 0) {
      const allZero = dbItems.every(item => toNumber(item.quantity) === 0 && toNumber(item.unit_price) === 0)
      if (allZero) {
        causes.zero_value_item_totals++
      } else {
        causes.malformed_item_rows++
      }
    } else {
      causes.other++
    }
  }

  console.log('\nCauses for missing totals:')
  console.log(JSON.stringify(causes, null, 2))


main().catch(console.error)
