import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { router, withCors } from '../../../server'
import {
  OPTIONS as providerOptions,
  GET as providerGet,
  POST as providerPost,
} from '../../../api/bolu-provider-config'
import {
  fetchWithRetry,
  isTransientNetworkError,
  isTransientResponseStatus,
} from '../../pages/settings/bolu-provider/api'

describe('server.ts — Bun HTTP Server Router & CORS', () => {
  it('handles OPTIONS preflight with 204 and universal CORS headers', async () => {
    const req = new Request('http://localhost:8080/api/bolu-chat', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://bigdrops-app.vercel.app',
      },
    })

    const res = await router(req)
    assert.equal(res.status, 204)
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://bigdrops-app.vercel.app')
    assert.equal(res.headers.get('Access-Control-Allow-Credentials'), 'true')
    assert.ok(res.headers.get('Access-Control-Allow-Methods')?.includes('POST'))
    assert.ok(res.headers.get('Access-Control-Allow-Headers')?.includes('Authorization'))
    assert.equal(res.headers.get('Access-Control-Max-Age'), '86400')
  })

  it('permits Capacitor Android origins (http://localhost, https://localhost, capacitor://localhost)', async () => {
    const capacitorOrigins = ['http://localhost', 'https://localhost', 'capacitor://localhost']

    for (const origin of capacitorOrigins) {
      // Test OPTIONS preflight on bolu-provider-config
      const preflightReq = new Request('http://localhost:8080/api/bolu-provider-config', {
        method: 'OPTIONS',
        headers: { origin },
      })
      const preflightRes = await router(preflightReq)
      assert.equal(preflightRes.status, 204)
      assert.equal(preflightRes.headers.get('Access-Control-Allow-Origin'), origin)
      assert.equal(preflightRes.headers.get('Access-Control-Allow-Credentials'), 'true')

      // Test GET on bolu-provider-config with origin header (unauthorized -> 401 with CORS)
      const getReq = new Request('http://localhost:8080/api/bolu-provider-config', {
        method: 'GET',
        headers: { origin },
      })
      const getRes = await router(getReq)
      assert.equal(getRes.headers.get('Access-Control-Allow-Origin'), origin)
      assert.equal(getRes.headers.get('Access-Control-Allow-Credentials'), 'true')
    }
  })

  it('serves health check endpoints on /, /health, and /api/health with 200 ok', async () => {
    for (const path of ['/', '/health', '/api/health']) {
      const req = new Request(`http://localhost:8080${path}`, {
        method: 'GET',
        headers: { origin: 'http://localhost:3000' },
      })

      const res = await router(req)
      assert.equal(res.status, 200)
      assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3000')

      const body = (await res.json()) as { status: string; service: string; uptime: number; timestamp: string }
      assert.equal(body.status, 'ok')
      assert.equal(body.service, 'bouxre-ai-backend')
      assert.equal(typeof body.uptime, 'number')
      assert.equal(typeof body.timestamp, 'string')
    }
  })

  it('returns 404 for unknown routes with CORS headers', async () => {
    const req = new Request('http://localhost:8080/api/unknown-endpoint', {
      method: 'GET',
      headers: { origin: 'https://bouxre.com' },
    })

    const res = await router(req)
    assert.equal(res.status, 404)
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://bouxre.com')

    const body = (await res.json()) as { error: string; path: string }
    assert.equal(body.error, 'Not Found')
    assert.equal(body.path, '/api/unknown-endpoint')
  })

  it('returns 405 Method Not Allowed for disallowed HTTP methods on API routes', async () => {
    const chatGet = new Request('http://localhost:8080/api/bolu-chat', {
      method: 'GET',
    })
    const chatRes = await router(chatGet)
    assert.equal(chatRes.status, 405)

    const providerDelete = new Request('http://localhost:8080/api/bolu-provider-config', {
      method: 'DELETE',
    })
    const providerRes = await router(providerDelete)
    assert.equal(providerRes.status, 405)

    const usagePost = new Request('http://localhost:8080/api/ai-usage', {
      method: 'POST',
    })
    const usageRes = await router(usagePost)
    assert.equal(usageRes.status, 405)

    const saveGet = new Request('http://localhost:8080/api/bolu-save', {
      method: 'GET',
    })
    const saveRes = await router(saveGet)
    assert.equal(saveRes.status, 405)
  })

  it('routes POST /api/bolu-save and returns 401 when unauthorized', async () => {
    const saveReq = new Request('http://localhost:8080/api/bolu-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin: 'https://bigdrops-app.vercel.app',
      },
      body: JSON.stringify({ proposal: { opId: 'test-123', status: 'approved_pending_save' } }),
    })
    const saveRes = await router(saveReq)
    assert.equal(saveRes.status, 401)
    assert.equal(saveRes.headers.get('Access-Control-Allow-Origin'), 'https://bigdrops-app.vercel.app')
    const body = (await saveRes.json()) as { error: string; code: string }
    assert.equal(body.code, 'unauthorized')
  })

  it('withCors injects CORS headers while preserving status and body', async () => {
    const originalRes = new Response(JSON.stringify({ test: true }), {
      status: 201,
      headers: { 'X-Custom-Header': 'foobar' },
    })

    const req = new Request('http://localhost:8080/test', {
      headers: { origin: 'https://test.client.com' },
    })

    const wrapped = withCors(originalRes, req)
    assert.equal(wrapped.status, 201)
    assert.equal(wrapped.headers.get('X-Custom-Header'), 'foobar')
    assert.equal(wrapped.headers.get('Access-Control-Allow-Origin'), 'https://test.client.com')
    assert.ok(wrapped.headers.get('Access-Control-Expose-Headers')?.includes('X-Bolu-Source'))

    const body = (await wrapped.json()) as { test: boolean }
    assert.equal(body.test, true)
  })

  it('api/bolu-provider-config direct handlers return CORS headers for Capacitor Android origins', async () => {
    const origins = ['http://localhost', 'https://localhost', 'capacitor://localhost']

    for (const origin of origins) {
      // Direct OPTIONS preflight
      const optReq = new Request('http://localhost:8080/api/bolu-provider-config', {
        method: 'OPTIONS',
        headers: { origin },
      })
      const optRes = await providerOptions(optReq)
      assert.equal(optRes.status, 204)
      assert.equal(optRes.headers.get('Access-Control-Allow-Origin'), origin)
      assert.equal(optRes.headers.get('Access-Control-Allow-Credentials'), 'true')
      assert.ok(optRes.headers.get('Access-Control-Allow-Headers')?.includes('Authorization'))
      assert.ok(optRes.headers.get('Access-Control-Allow-Headers')?.includes('Content-Type'))

      // Direct GET (unauthenticated -> 401 with CORS)
      const getReq = new Request('http://localhost:8080/api/bolu-provider-config', {
        method: 'GET',
        headers: { origin },
      })
      const getRes = await providerGet(getReq)
      assert.equal(getRes.status, 401)
      assert.equal(getRes.headers.get('Access-Control-Allow-Origin'), origin)
      assert.equal(getRes.headers.get('Access-Control-Allow-Credentials'), 'true')

      // Direct POST (unauthenticated -> 401 with CORS)
      const postReq = new Request('http://localhost:8080/api/bolu-provider-config', {
        method: 'POST',
        headers: { origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })
      const postRes = await providerPost(postReq)
      assert.equal(postRes.status, 401)
      assert.equal(postRes.headers.get('Access-Control-Allow-Origin'), origin)
      assert.equal(postRes.headers.get('Access-Control-Allow-Credentials'), 'true')
    }
  })

  it('fetchWithRetry retries on transient network errors and succeeds on subsequent attempt', async () => {
    let callCount = 0
    const originalFetch = globalThis.fetch

    globalThis.fetch = (async () => {
      callCount++
      if (callCount < 3) {
        throw new TypeError('Failed to fetch')
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    }) as typeof fetch

    try {
      const res = await fetchWithRetry(
        'https://bourxe-api.cloudzyro.app/api/bolu-provider-config',
        {},
        {
          timeoutMs: 2000,
          maxRetries: 3,
          retryDelays: [10, 20, 30],
        },
      )
      assert.equal(res.status, 200)
      assert.equal(callCount, 3)
      const data = (await res.json()) as { ok: boolean }
      assert.equal(data.ok, true)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('fetchWithRetry retries on serverless cold-start HTTP 503 and returns success', async () => {
    let callCount = 0
    const originalFetch = globalThis.fetch

    globalThis.fetch = (async () => {
      callCount++
      if (callCount === 1) {
        return new Response(JSON.stringify({ error: 'Service Unavailable' }), { status: 503 })
      }
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
    }) as typeof fetch

    try {
      const res = await fetchWithRetry(
        'https://bourxe-api.cloudzyro.app/api/bolu-provider-config',
        {},
        {
          timeoutMs: 2000,
          maxRetries: 3,
          retryDelays: [10, 20],
        },
      )
      assert.equal(res.status, 200)
      assert.equal(callCount, 2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('isTransientNetworkError correctly classifies errors', () => {
    assert.equal(isTransientNetworkError(new TypeError('Failed to fetch')), true)
    assert.equal(isTransientNetworkError(new Error('NetworkError when attempting to fetch resource.')), true)
    assert.equal(isTransientNetworkError(new DOMException('The operation timed out.', 'TimeoutError')), true)
    assert.equal(isTransientNetworkError(new DOMException('The user aborted a request.', 'AbortError')), true)
    assert.equal(isTransientNetworkError(new Error('Connection timed out')), true)
    assert.equal(isTransientNetworkError(new Error('Invalid token')), false)
  })

  it('isTransientResponseStatus identifies cold-start gateway errors', () => {
    assert.equal(isTransientResponseStatus(502), true)
    assert.equal(isTransientResponseStatus(503), true)
    assert.equal(isTransientResponseStatus(504), true)
    assert.equal(isTransientResponseStatus(200), false)
    assert.equal(isTransientResponseStatus(401), false)
    assert.equal(isTransientResponseStatus(404), false)
  })
})
