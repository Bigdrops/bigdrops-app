import type { TenantClient } from '@/lib/tenantClient'

/**
 * Inert tenant client for the Design Lab experiments.
 *
 * The production document form mounts presentation components that call
 * `useEntity()` (`ClientSelector`, and the item suggestion engine behind a line
 * item). Those components cannot run without a tenant session, and the Design
 * Lab must not start a production read.
 *
 * This client is network-free:
 *
 *  - `from` returns a chainable stub that resolves an empty result, so a lookup
 *    finds nothing instead of failing.
 *  - `rpc` resolves an empty result.
 *  - No Supabase client exists and no request leaves the browser.
 *
 * The mounted components therefore behave as they do for a tenant whose library
 * is empty: suggestions find nothing, client lists are empty, and the form keeps
 * its representative preview data.
 *
 * This module holds no components, so it stays out of the fast-refresh surface.
 */

const EMPTY_LIST_RESULT = { data: [] as unknown[], error: null, count: 0, status: 200 }
const EMPTY_ROW_RESULT = { data: null, error: null, status: 200 }

type AnyQueryBuilder = Record<string, unknown>

/** Every builder call chains to the same stub; every terminal resolves empty. */
function createInertQueryBuilder(): AnyQueryBuilder {
  const builder: AnyQueryBuilder = {
    then: (
      onFulfilled?: (value: typeof EMPTY_LIST_RESULT) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(EMPTY_LIST_RESULT).then(onFulfilled, onRejected),
    catch: (onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(EMPTY_LIST_RESULT).catch(onRejected),
    finally: (onFinally?: () => void) => Promise.resolve(EMPTY_LIST_RESULT).finally(onFinally),
    single: () => Promise.resolve(EMPTY_ROW_RESULT),
    maybeSingle: () => Promise.resolve(EMPTY_ROW_RESULT),
  }

  return new Proxy(builder, {
    get(target, property) {
      if (typeof property === 'symbol') return undefined
      if (property in target) return target[property]
      return () => createInertQueryBuilder()
    },
  })
}

export const previewTenantClient: TenantClient = {
  schemaName: 'design-lab-preview',
  version: 'design-lab-preview',
  isReady: true,
  from: (() => createInertQueryBuilder()) as unknown as TenantClient['from'],
  rpc: (() => Promise.resolve(EMPTY_ROW_RESULT)) as unknown as TenantClient['rpc'],
}
