import test from 'node:test'
import assert from 'node:assert/strict'

import { searchBoluInvoices, readBoluInvoice } from '../../lib/ai-assistant/bolu-data.ts'

test('invoice search fails closed when tenant is not ready', async () => {
  const client = { isReady: false, from() { throw new Error('must not query') }, rpc() { throw new Error('must not query') } }
  await assert.rejects(
    searchBoluInvoices(client, 'INV-001', () => true),
    /not available yet/i,
  )
})

test('invoice search checks authorization before calling tenant RPC', async () => {
  let queried = false
  const client = {
    isReady: true,
    from() { throw new Error('unexpected table query') },
    async rpc() { queried = true; return { data: [], error: null } },
  }
  await assert.rejects(
    searchBoluInvoices(client, 'INV-001', () => false),
    /permission/i,
  )
  assert.equal(queried, false)
})

test('invoice detail fails closed without view permission', async () => {
  const client = { isReady: true, from() { throw new Error('must not query') }, rpc() { throw new Error('must not query') } }
  await assert.rejects(readBoluInvoice(client, 'record-id', () => false), /permission/i)
})
