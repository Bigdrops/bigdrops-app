import test from 'node:test'
import assert from 'node:assert/strict'

import { searchBoluInvoices, readBoluInvoice, validateBoluClient } from '../../lib/ai-assistant/bolu-data.ts'

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

test('validateBoluClient: returns not_found when tenantClient is null or not ready', async () => {
  const res1 = await validateBoluClient(null, 'Solwood')
  assert.equal(res1.status, 'not_found')

  const unreadyClient = { isReady: false, from() { throw new Error('not ready') } }
  const res2 = await validateBoluClient(unreadyClient, 'Solwood')
  assert.equal(res2.status, 'not_found')
})

test('validateBoluClient: returns exact_match on exact case-insensitive match', async () => {
  const mockClient = {
    isReady: true,
    from(table) {
      assert.equal(table, 'clients')
      return {
        select() { return this },
        is() { return this },
        ilike() { return this },
        async limit() {
          return {
            data: [
              { id: 'c-1', name: 'Solwood Ventures', email: 'info@solwood.ng', phone: '08012345678' },
              { id: 'c-2', name: 'Solwood', email: 'hello@solwood.com', phone: null },
            ],
            error: null,
          }
        },
      }
    },
  }
  const result = await validateBoluClient(mockClient, 'solwood')
  assert.equal(result.status, 'exact_match')
  if (result.status === 'exact_match') {
    assert.equal(result.client.id, 'c-2')
    assert.equal(result.client.name, 'Solwood')
  }
})

test('validateBoluClient: returns exact_match on solitary partial match', async () => {
  const mockClient = {
    isReady: true,
    from(table) {
      assert.equal(table, 'clients')
      return {
        select() { return this },
        is() { return this },
        ilike() { return this },
        async limit() {
          return {
            data: [
              { id: 'c-sol', name: 'Solwood Integrated Ltd', email: null, phone: null },
            ],
            error: null,
          }
        },
      }
    },
  }
  const result = await validateBoluClient(mockClient, 'Solwood')
  assert.equal(result.status, 'exact_match')
  if (result.status === 'exact_match') {
    assert.equal(result.client.id, 'c-sol')
    assert.equal(result.client.name, 'Solwood Integrated Ltd')
  }
})

test('validateBoluClient: returns ambiguous with candidates when multiple partial matches exist', async () => {
  const mockClient = {
    isReady: true,
    from(table) {
      assert.equal(table, 'clients')
      return {
        select() { return this },
        is() { return this },
        ilike() { return this },
        async limit() {
          return {
            data: [
              { id: 'c-1', name: 'Solwood Engineering', email: null, phone: null },
              { id: 'c-2', name: 'Solwood Logistics Ltd', email: null, phone: null },
            ],
            error: null,
          }
        },
      }
    },
  }
  const result = await validateBoluClient(mockClient, 'Solwood')
  assert.equal(result.status, 'ambiguous')
  if (result.status === 'ambiguous') {
    assert.equal(result.matches.length, 2)
    assert.equal(result.matches[0].name, 'Solwood Engineering')
    assert.equal(result.matches[1].name, 'Solwood Logistics Ltd')
  }
})

test('validateBoluClient: returns not_found when database returns 0 records', async () => {
  const mockClient = {
    isReady: true,
    from() {
      return {
        select() { return this },
        is() { return this },
        ilike() { return this },
        async limit() {
          return { data: [], error: null }
        },
      }
    },
  }
  const result = await validateBoluClient(mockClient, 'NonExistentClient')
  assert.equal(result.status, 'not_found')
})

