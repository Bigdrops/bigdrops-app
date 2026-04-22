import { readFile } from 'node:fs/promises'

async function main() {
  const data = JSON.parse(await readFile('docs/quotations.cleaned.final.json', 'utf8'))
  const nums = new Set(data.map((q: any) => String(q.invoice_number || '').trim()))
  console.log('Total source quotations:', data.length)
  console.log('Unique source quotation numbers:', nums.size)
  
  // Also count how many have items
  const withItems = data.filter((q: any) => (q.items || []).length > 0)
  console.log('Source quotations with items:', withItems.length)
  
  const uniqueWithItems = new Set(withItems.map((q: any) => String(q.invoice_number || '').trim()))
  console.log('Unique source quotation numbers with items:', uniqueWithItems.size)
}

main().catch(console.error)
