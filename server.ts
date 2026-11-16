export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') || 'https://bigdrops-app.vercel.app'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Bolu-Source',
    'Access-Control-Expose-Headers': 'X-Bolu-Source, Content-Length',
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
    return withCors(
      new Response(
        JSON.stringify({
          status: 'ok',
          service: 'bourxe-ai-backend',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
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
      console.error(`[Bourxe API] Failed to import route ${routeName}:`, importErr)
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
      console.error(`[Bourxe API] Error in handler for ${routeName}:`, err)
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
