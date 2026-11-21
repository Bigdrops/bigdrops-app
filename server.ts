import fs from 'fs'
import path from 'path'

// Ensure authoritative production environment keys are loaded
function initializeEnvironment() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'src/lib/ai-assistant/.vault-runtime.env'),
  ]
  for (const file of envCandidates) {
    if (fs.existsSync(file)) {
      try {
        const text = fs.readFileSync(file, 'utf8')
        for (const line of text.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const idx = trimmed.indexOf('=')
          if (idx > 0) {
            const k = trimmed.slice(0, idx).trim()
            const v = trimmed.slice(idx + 1).trim()
            if (k === 'SUPABASE_SERVICE_ROLE_KEY') {
              if (v.startsWith('eyJ') && (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ'))) {
                process.env.SUPABASE_SERVICE_ROLE_KEY = v
              }
            } else if (!process.env[k]) {
              process.env[k] = v
            }
          }
        }
      } catch {}
    }
  }
}
initializeEnvironment()

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') || 'https://bigdrops-app.vercel.app'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Bolu-Source',
    'Access-Control-Expose-Headers': 'X-Bolu-Source, Content-Length, X-Bolu-Connection-Id, X-Bolu-Model, X-Bolu-Fallback',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export function withCors(response: Response, req?: Request): Response {
  const headers = new Headers(response.headers)
  const corsHeaders = getCorsHeaders(req)
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function router(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(req),
    })
  }

  if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/health') {
    const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '')
    const rawBoluKey = process.env.BOLU_ENCRYPTION_KEY || ''
    let saltCheck = 'unknown'
    try {
      const { VAULT_SALT_V1 } = await import('./src/lib/ai-assistant/bolu-secret-vault')
      saltCheck = String(VAULT_SALT_V1)
    } catch (e: any) {
      saltCheck = 'err: ' + e?.message
    }

    return withCors(
      new Response(
        JSON.stringify({
          status: 'ok',
          service: 'bouxre-ai-backend',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          diagnostics: {
            has_service_key: Boolean(rawKey),
            raw_key_len: rawKey.length,
            clean_key_len: cleanKey.length,
            has_quotes: rawKey.length !== cleanKey.length,
            key_prefix: cleanKey.slice(0, 5),
            key_suffix: cleanKey.slice(-5),
            has_bolu_key: Boolean(rawBoluKey),
            vault_salt: saltCheck,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
      req,
    )
  }

  if (url.pathname.startsWith('/api/')) {
    const routeName = url.pathname.replace(/^\/api\/?/, '').split('/')[0]
    let mod: any
    try {
      if (routeName === 'bolu-chat') {
        mod = await import('./api/bolu-chat')
      } else if (routeName === 'bolu-save') {
        mod = await import('./api/bolu-save')
      } else if (routeName === 'bolu-provider-config') {
        mod = await import('./api/bolu-provider-config')
      } else if (routeName === 'ai-usage') {
        mod = await import('./api/ai-usage')
      } else if (routeName === 'edit-payment-caption') {
        mod = await import('./api/edit-payment-caption')
      } else if (routeName === 'upload-payment-attachment') {
        mod = await import('./api/upload-payment-attachment')
      } else {
        return withCors(
          new Response(JSON.stringify({ error: 'Not Found', path: url.pathname }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
          req,
        )
      }
    } catch (importErr: any) {
      console.error(`[Bouxre API] Failed to import route ${routeName}:`, importErr)
      return withCors(
        new Response(
          JSON.stringify({
            error: 'Module Import Failed',
            message: importErr?.message || String(importErr),
            path: url.pathname,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
        req,
      )
    }

    const method = req.method.toUpperCase()
    const handler = typeof mod[method] === 'function' ? mod[method] : mod.default

    if (!handler || typeof handler !== 'function') {
      return withCors(
        new Response(JSON.stringify({ error: `Method ${method} Not Allowed on ${routeName}` }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }),
        req,
      )
    }

    try {
      const res = await handler(req)
      return withCors(res, req)
    } catch (err: any) {
      console.error(`[Bouxre API] Error in handler for ${routeName}:`, err)
      return withCors(
        new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
        req,
      )
    }
  }

  return withCors(
    new Response(JSON.stringify({ error: 'Not Found', path: url.pathname }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }),
    req,
  )
}

const port = Number(process.env.PORT) || 3000

export default {
  port,
  fetch(req: Request) {
    return router(req)
  },
}
