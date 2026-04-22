import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

type RawImportRow = {
  invoice_number?: string | null
  due_date?: string | null
  items?: Array<{
    description?: string | null
    quantity?: number | string | null
    rate?: number | string | null
    unit?: string | null
  }> | null
}

type ImportedInvoiceRow = {
  id: string
  invoice_number: string | null
  due_date: string | null
  status: string | null
  custom_fields: string | Record<string, unknown> | null
  created_at: string | null
}

type ImportedQuotationRow = {
  id: string
  quotation_number: string | null
  valid_until: string | null
  status: string | null
  custom_fields: string | Record<string, unknown> | null
  created_at: string | null
}

type ImportedInvoiceItemRow = {
  id: string
  invoice_id: string | null
  item_id: string | null
  description: string | null
  quantity: number | string | null
  unit: string | null
  unit_price: number | string | null
  amount: number | string | null
  sort_order: number | string | null
}

type ImportedQuotationItemRow = {
  id: string
  quotation_id: string | null
  item_id: string | null
  description: string | null
  quantity: number | string | null
  unit: string | null
  unit_price: number | string | null
  amount: number | string | null
  sort_order: number | string | null
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeItemSignature(row: {
  item_id?: string | null
  description?: string | null
  quantity?: number | string | null
  unit?: string | null
  unit_price?: number | string | null
  amount?: number | string | null
}) {
  return JSON.stringify({
    item_id: String(row.item_id || ''),
    description: String(row.description || '').trim(),
    quantity: toNumber(row.quantity),
    unit: String(row.unit || '').trim(),
    unit_price: toNumber(row.unit_price),
    amount: toNumber(row.amount),
  })
}

function buildSourceMap(rows: RawImportRow[]) {
  const map = new Map<string, RawImportRow>()
  for (const row of rows) {
    const number = String(row.invoice_number || '').trim()
    if (number) map.set(number, row)
  }
  return map
}

function parseCustomFields(value: string | Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object') return value

  try {
    const parsed = JSON.parse(value)
    if (typeof parsed === 'string') {
      return JSON.parse(parsed)
    }
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function isImported(customFields: string | Record<string, unknown> | null | undefined) {
  return parseCustomFields(customFields).source === 'refrens_import'
}

function getCanonicalRow<T extends { id: string; created_at: string | null }>(rows: T[]) {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(left.created_at || 0).getTime() || 0
    const rightTime = new Date(right.created_at || 0).getTime() || 0
    return leftTime - rightTime
  })[0]
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const filePath = path.join(projectRoot, relativePath)
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function main() {
  const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const [sourceInvoices, sourceQuotations] = await Promise.all([
    readJsonFile<RawImportRow[]>('docs/invoices.cleaned.final.json'),
    readJsonFile<RawImportRow[]>('docs/quotations.cleaned.final.json'),
  ])

  const invoiceSourceMap = buildSourceMap(sourceInvoices)
  const quotationSourceMap = buildSourceMap(sourceQuotations)

  const [invoiceRowsResult, quotationRowsResult, invoiceItemsResult, quotationItemsResult] = await Promise.all([
    supabase.from('invoices').select('id, invoice_number, due_date, status, custom_fields, created_at').limit(5000),
    supabase.from('quotations').select('id, quotation_number, valid_until, status, custom_fields, created_at').limit(5000),
    supabase.from('invoice_items').select('id, invoice_id, item_id, description, quantity, unit, unit_price, amount, sort_order').limit(20000),
    supabase.from('quotation_items').select('id, quotation_id, item_id, description, quantity, unit, unit_price, amount, sort_order').limit(20000),
  ])

  if (invoiceRowsResult.error) throw invoiceRowsResult.error
  if (quotationRowsResult.error) throw quotationRowsResult.error
  if (invoiceItemsResult.error) throw invoiceItemsResult.error
  if (quotationItemsResult.error) throw quotationItemsResult.error

  const importedInvoices = (invoiceRowsResult.data || []).filter((row) => isImported(row.custom_fields)) as ImportedInvoiceRow[]
  const importedQuotations = (quotationRowsResult.data || []).filter((row) => isImported(row.custom_fields)) as ImportedQuotationRow[]
  const invoiceItems = (invoiceItemsResult.data || []) as ImportedInvoiceItemRow[]
  const quotationItems = (quotationItemsResult.data || []) as ImportedQuotationItemRow[]

  const invoiceItemMap = new Map<string, ImportedInvoiceItemRow[]>()
  for (const item of invoiceItems) {
    const invoiceId = String(item.invoice_id || '')
    if (!invoiceId) continue
    const existing = invoiceItemMap.get(invoiceId) || []
    existing.push(item)
    invoiceItemMap.set(invoiceId, existing)
  }

  const quotationItemMap = new Map<string, ImportedQuotationItemRow[]>()
  for (const item of quotationItems) {
    const quotationId = String(item.quotation_id || '')
    if (!quotationId) continue
    const existing = quotationItemMap.get(quotationId) || []
    existing.push(item)
    quotationItemMap.set(quotationId, existing)
  }

  const invoiceUpdates: Array<{ id: string; due_date: string | null; subtotal: number; total: number }> = []
  const quotationUpdates: Array<{ id: string; valid_until: string | null; subtotal: number; total: number }> = []
  const duplicateInvoiceIdsToDelete: string[] = []
  const duplicateQuotationIdsToDelete: string[] = []
  const duplicateInvoiceItemIdsToDelete: string[] = []
  const duplicateQuotationItemIdsToDelete: string[] = []
  const movedInvoiceItems: Array<Record<string, unknown>> = []
  const movedQuotationItems: Array<Record<string, unknown>> = []

  const invoicesByNumber = new Map<string, ImportedInvoiceRow[]>()
  for (const row of importedInvoices) {
    const number = String(row.invoice_number || '').trim()
    if (!number) continue
    const existing = invoicesByNumber.get(number) || []
    existing.push(row)
    invoicesByNumber.set(number, existing)
  }

  for (const [invoiceNumber, rows] of invoicesByNumber.entries()) {
    const canonical = getCanonicalRow(rows)
    const canonicalItems = [...(invoiceItemMap.get(canonical.id) || [])]
    const canonicalSignatures = new Set(canonicalItems.map((item) => normalizeItemSignature(item)))

    const sourceRow = invoiceSourceMap.get(invoiceNumber)
    
    // Restoration: If canonical row has no items and source has them, restore from source
    if (canonicalItems.length === 0 && sourceRow?.items && sourceRow.items.length > 0) {
      for (const item of sourceRow.items) {
        const qty = toNumber(item.quantity)
        const rate = toNumber(item.rate)
        const movedItem = {
          invoice_id: canonical.id,
          item_id: null,
          description: item.description || '',
          quantity: qty,
          unit: item.unit || null,
          unit_price: rate,
          amount: qty * rate,
          sort_order: canonicalItems.length,
        }
        movedInvoiceItems.push(movedItem)
        canonicalItems.push(movedItem as any)
      }
    }

    for (const row of rows) {
      if (row.id === canonical.id) continue
      const duplicateItems = invoiceItemMap.get(row.id) || []

      for (const item of duplicateItems) {
        const signature = normalizeItemSignature(item)
        if (!canonicalSignatures.has(signature)) {
          movedInvoiceItems.push({
            invoice_id: canonical.id,
            item_id: item.item_id || null,
            description: item.description || '',
            quantity: toNumber(item.quantity),
            unit: item.unit || null,
            unit_price: toNumber(item.unit_price),
            amount: toNumber(item.amount),
            sort_order: canonicalItems.length,
          })
          canonicalItems.push(item)
          canonicalSignatures.add(signature)
        }
      }

      duplicateInvoiceItemIdsToDelete.push(...duplicateItems.map((item) => item.id))
      duplicateInvoiceIdsToDelete.push(row.id)
    }

    const computedSubtotal = canonicalItems.reduce((sum, item) => sum + toNumber(item.amount), 0)
    invoiceUpdates.push({
      id: canonical.id,
      due_date: sourceRow?.due_date || canonical.due_date || null,
      subtotal: computedSubtotal,
      total: computedSubtotal,
    })
  }

  const quotationsByNumber = new Map<string, ImportedQuotationRow[]>()
  for (const row of importedQuotations) {
    const number = String(row.quotation_number || '').trim()
    if (!number) continue
    const existing = quotationsByNumber.get(number) || []
    existing.push(row)
    quotationsByNumber.set(number, existing)
  }

  for (const [quotationNumber, rows] of quotationsByNumber.entries()) {
    const canonical = getCanonicalRow(rows)
    const canonicalItems = [...(quotationItemMap.get(canonical.id) || [])]
    const canonicalSignatures = new Set(canonicalItems.map((item) => normalizeItemSignature(item)))

    const sourceRow = quotationSourceMap.get(quotationNumber)

    // Restoration: If canonical row has no items and source has them, restore from source
    if (canonicalItems.length === 0 && sourceRow?.items && sourceRow.items.length > 0) {
      for (const item of sourceRow.items) {
        const qty = toNumber(item.quantity)
        const rate = toNumber(item.rate)
        const movedItem = {
          quotation_id: canonical.id,
          item_id: null,
          description: item.description || '',
          quantity: qty,
          unit: item.unit || null,
          unit_price: rate,
          amount: qty * rate,
          sort_order: canonicalItems.length,
        }
        movedQuotationItems.push(movedItem)
        canonicalItems.push(movedItem as any)
      }
    }

    for (const row of rows) {
      if (row.id === canonical.id) continue
      const duplicateItems = quotationItemMap.get(row.id) || []

      for (const item of duplicateItems) {
        const signature = normalizeItemSignature(item)
        if (!canonicalSignatures.has(signature)) {
          movedQuotationItems.push({
            quotation_id: canonical.id,
            item_id: item.item_id || null,
            description: item.description || '',
            quantity: toNumber(item.quantity),
            unit: item.unit || null,
            unit_price: toNumber(item.unit_price),
            amount: toNumber(item.amount),
            sort_order: canonicalItems.length,
          })
          canonicalItems.push(item)
          canonicalSignatures.add(signature)
        }
      }

      duplicateQuotationItemIdsToDelete.push(...duplicateItems.map((item) => item.id))
      duplicateQuotationIdsToDelete.push(row.id)
    }

    const computedSubtotal = canonicalItems.reduce((sum, item) => sum + toNumber(item.amount), 0)
    quotationUpdates.push({
      id: canonical.id,
      valid_until: sourceRow?.due_date || canonical.valid_until || null,
      subtotal: computedSubtotal,
      total: computedSubtotal,
    })
  }

  if (movedInvoiceItems.length > 0) {
    const { error } = await supabase.from('invoice_items').insert(movedInvoiceItems)
    if (error) throw error
  }

  if (movedQuotationItems.length > 0) {
    const { error } = await supabase.from('quotation_items').insert(movedQuotationItems)
    if (error) throw error
  }

  for (const update of invoiceUpdates) {
    const { error } = await supabase
      .from('invoices')
      .update({
        due_date: update.due_date,
        subtotal: update.subtotal,
        total: update.total,
      })
      .eq('id', update.id)
    if (error) throw error
  }

  for (const update of quotationUpdates) {
    const { error } = await supabase
      .from('quotations')
      .update({
        valid_until: update.valid_until,
        subtotal: update.subtotal,
        total: update.total,
      })
      .eq('id', update.id)
    if (error) throw error
  }

  for (const ids of chunkArray(duplicateInvoiceItemIdsToDelete, 200)) {
    const { error } = await supabase.from('invoice_items').delete().in('id', ids)
    if (error) throw error
  }

  for (const ids of chunkArray(duplicateQuotationItemIdsToDelete, 200)) {
    const { error } = await supabase.from('quotation_items').delete().in('id', ids)
    if (error) throw error
  }

  for (const ids of chunkArray(duplicateInvoiceIdsToDelete, 100)) {
    const { error } = await supabase.from('invoices').delete().in('id', ids)
    if (error) throw error
  }

  for (const ids of chunkArray(duplicateQuotationIdsToDelete, 100)) {
    const { error } = await supabase.from('quotations').delete().in('id', ids)
    if (error) throw error
  }

  console.log(JSON.stringify({
    importedInvoicesFound: importedInvoices.length,
    importedQuotationsFound: importedQuotations.length,
    invoiceRowsUpdated: invoiceUpdates.length,
    quotationRowsUpdated: quotationUpdates.length,
    duplicateInvoicesRemoved: duplicateInvoiceIdsToDelete.length,
    duplicateQuotationsRemoved: duplicateQuotationIdsToDelete.length,
    invoiceItemsMoved: movedInvoiceItems.length,
    quotationItemsMoved: movedQuotationItems.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

