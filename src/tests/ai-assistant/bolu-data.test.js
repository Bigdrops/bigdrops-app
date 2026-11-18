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


// ── Business context discovery and client resolution ────────────────────────
import { buildBoluPageContext } from '../../lib/ai-assistant/bolu-context.ts'
import {
  createBoluClient,
  resolveOperationFacts,
  searchBoluClients,
} from '../../lib/ai-assistant/bolu-data.ts'

function createClientDirectory(rowsFor, options = {}) {
  const calls = { filters: [], expressions: [] }
  let expression = ''
  const client = {
    isReady: true,
    from(table) {
      assert.equal(table, 'clients')
      const builder = {
        select() { return builder },
        is(column, value) { calls.filters.push([column, value]); return builder },
        or(value) { expression = value; calls.expressions.push(value); return builder },
        ilike(column, value) {
          expression = `${column}.ilike.${value}`
          calls.expressions.push(expression)
          return builder
        },
        async limit() {
          if (options.errorFor) return { data: null, error: { message: options.errorFor } }
          return { data: rowsFor(expression) || [], error: null }
        },
      }
      return builder
    },
  }
  return { client, calls }
}

test('client search neutralizes filter metacharacters and excludes archived clients', async () => {
  const { client, calls } = createClientDirectory(() => [])
  const result = await searchBoluClients(client, 'Solwood,archived_at.not.is.null')
  assert.equal(result.status, 'not_found')
  assert.deepEqual(calls.filters[0], ['archived_at', null])

  // The untrusted term must stay one ilike value, not add a second predicate.
  const parts = calls.expressions[0].split(',')
  assert.equal(parts.length, 4)
  // `_` is a LIKE wildcard, so it is stripped along with the predicate separators.
  assert.equal(parts[0], 'name.ilike.%Solwood archived at.not.is.null%')
})

test('client search resolves a multi-word name by its distinctive word, not an invented alias', async () => {
  const { client } = createClientDirectory((expression) =>
    expression.includes('Tecno')
      ? [{ id: 'c-tecno', name: 'Tecno Power Solutions', phone: null, email: null, contact_person: null }]
      : [],
  )
  const result = await searchBoluClients(client, 'Tecno Power Ventures')
  assert.equal(result.status, 'single_match')
  assert.equal(result.client.id, 'c-tecno')
  assert.equal(result.client.name, 'Tecno Power Solutions')
})

test('client search reports multiple plausible records as ambiguous', async () => {
  const { client } = createClientDirectory(() => [
    { id: 'c-1', name: 'Dangote Cement Plc', phone: null, email: null, contact_person: null },
    { id: 'c-2', name: 'Dangote Sugar Refinery', phone: null, email: null, contact_person: null },
    { id: 'c-3', name: 'Dangote Fertiliser', phone: null, email: null, contact_person: null },
  ])
  const result = await searchBoluClients(client, 'Dangote')
  assert.equal(result.status, 'ambiguous')
  assert.equal(result.matches.length, 3)
})

test('client search reports a database failure instead of claiming no match', async () => {
  const { client } = createClientDirectory(() => [], { errorFor: 'connection reset' })
  const result = await searchBoluClients(client, 'Solwood')
  assert.equal(result.status, 'search_error')
  assert.match(result.error, /connection reset/)
})

test('write intent still discovers the verified client before proposal construction', async () => {
  const { client } = createClientDirectory((expression) =>
    expression.includes('Solwood')
      ? [{ id: 'c-sol', name: 'Solwood Ventures', phone: '0803', email: null, contact_person: null }]
      : [],
  )
  const facts = await resolveOperationFacts({
    text: 'create an invoice for Solwood Ventures with 10 cables',
    tenantClient: client,
    pageContext: buildBoluPageContext('/', 'dashboard'),
    canRead: () => true,
  })
  assert.ok(facts)
  assert.equal(facts.kind, 'message')
  assert.match(facts.text, /Verified client/)
  assert.match(facts.text, /c-sol/)
  assert.match(facts.text, /Solwood Ventures/)
})

test('unrelated requests do not invent client facts', async () => {
  const { client } = createClientDirectory(() => [])
  const facts = await resolveOperationFacts({
    text: 'thanks, that is all for now',
    tenantClient: client,
    pageContext: buildBoluPageContext('/', 'dashboard'),
    canRead: () => true,
  })
  assert.equal(facts, null)
})

test('client creation rejects an invalid name without touching the database', async () => {
  const client = { isReady: true, from() { throw new Error('must not query') } }
  const result = await createBoluClient(client, { name: 'A' })
  assert.equal(result.ok, false)
  assert.equal(result.client, null)
  assert.match(result.error, /at least 2 characters/i)
})
