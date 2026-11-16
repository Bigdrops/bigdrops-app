import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { router, withCors } from '../../../server'

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
      assert.equal(body.service, 'bourxe-ai-backend')
      assert.equal(typeof body.uptime, 'number')
      assert.equal(typeof body.timestamp, 'string')
    }
  })

  it('returns 404 for unknown routes with CORS headers', async () => {
    const req = new Request('http://localhost:8080/api/unknown-endpoint', {
      method: 'GET',
      headers: { origin: 'https://bourxe.com' },
    })

    const res = await router(req)
    assert.equal(res.status, 404)
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://bourxe.com')

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
})
