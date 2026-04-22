import { readFile } from 'node:fs/promises'

async function main() {
  const data = JSON.parse(await readFile('docs/quotations.cleaned.final.json', 'utf8'))
  
  const withoutItems = data.filter((q: any) => !(q.items && q.items.length > 0))
  console.log('Source quotations without items:', withoutItems.length)
  
  const withZeroSubtotal = data.filter((q: any) => {
    const items = q.items || []
    const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0)
    return subtotal === 0
  })
  console.log('Source quotations with zero computed subtotal:', withZeroSubtotal.length)
  
  if (withZeroSubtotal.length > 0) {
      console.log('Sample zero subtotal quotation:', JSON.stringify(withZeroSubtotal[0].invoice_number, null, 2))
  }
}

main().catch(console.error)
