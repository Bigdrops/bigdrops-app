import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { serialize, Document, Page } from '@formepdf/react'

import { ProjectDocumentFormeDocument } from '../../components/pdf/forme/ProjectDocumentFormeDocument'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn/adapter'

const settings = {
  company_name: 'BOUXRE Engineering Ltd',
  company_address: 'Plot 14 Victoria Island, Lagos',
  company_phone: '+234 801 234 5678',
  company_email: 'operations@bouxre.ng',
}

const purchaseOrder = {
  type: 'purchase_order',
  title: 'Copper Armored Cable 4mm²',
  reference_number: 'PO-2026-0881',
  issue_date: '2026-11-10',
  from_party: 'BOUXRE Engineering Ltd',
  to_party: 'Dangote Industries Ltd',
  subtotal: 4900000,
  vat: 367500,
  total: 5267500,
  data: {
    notes: 'Payment terms 30 days.',
    items: [
      { description: 'Copper Armored Cable 4mm²', quantity: 500, unit: 'Meters', unit_price: 8500, amount: 4250000 },
    ],
  },
} as unknown as Parameters<typeof ProjectDocumentFormeDocument>[0]['document']

function extractFormeText(node: any, output: string[] = []): string[] {
  if (node === null || node === undefined) return output
  if (typeof node === 'string') {
    output.push(node)
    return output
  }
  if (Array.isArray(node)) {
    node.forEach((entry) => extractFormeText(entry, output))
    return output
  }
  if (typeof node !== 'object') return output
  const kind = node.kind
  if (kind && typeof kind === 'object') {
    if (typeof kind.content === 'string' && kind.content) output.push(kind.content)
    if (Array.isArray(kind.runs)) {
      kind.runs.forEach((run: any) => {
        if (run && typeof run.content === 'string' && run.content) output.push(run.content)
      })
    }
  }
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'kind') extractFormeText(value, output)
  }
  return output
}

test('Project Document serializes header, details, items and notes', () => {
  const element = React.createElement(ProjectDocumentFormeDocument, {
    document: purchaseOrder,
    projectName: 'Dangote Refinery Shutdown',
    settings,
  })
  const text = extractFormeText(serialize(element)).join(' ')

  assert.ok(text.includes('BOUXRE Engineering Ltd'), 'company name must be present')
  assert.ok(text.includes('PO-2026-0881'), 'reference number must be present')
  assert.ok(text.includes('Purchase Order'), 'document type must be present')
  assert.ok(text.includes('5,267,500'), 'formatted total must be present')
  assert.ok(text.includes('Copper Armored Cable'), 'item description must be present')
  assert.ok(text.includes('Payment terms 30 days.'), 'notes must be present')
})

test('Project Document with missing optional fields omits Items and Notes', () => {
  const element = React.createElement(ProjectDocumentFormeDocument, {
    document: { type: 'other', title: 'Site clarification memo', data: { description: 'Feasibility accepted.' } } as any,
    settings,
  })
  const text = extractFormeText(serialize(element)).join(' ')

  assert.ok(text.includes('Site clarification memo'), 'main label must be present')
  assert.ok(!text.includes('Items'), 'items heading must be omitted')
  assert.ok(!text.includes('Notes'), 'notes heading must be omitted')
})

test('Project Document generates valid PDF bytes', async () => {
  const element = React.createElement(ProjectDocumentFormeDocument, {
    document: purchaseOrder,
    projectName: 'Dangote Refinery Shutdown',
    settings,
  })

  const bytes = await renderPdfcnToBytes(element)

  assert.ok(bytes instanceof Uint8Array, 'Forme must return a Uint8Array')
  assert.ok(bytes.length > 1000, `PDF bytes must be non-empty (got ${bytes.length} bytes)`)
  const header = Buffer.from(bytes.slice(0, 5)).toString('utf8')
  assert.equal(header, '%PDF-', 'PDF bytes must start with standard PDF header')
})
