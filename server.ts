declare const Bun: any

export function withCors(response: Response, req?: Request): Response {
  const headers = new Headers(response.headers)
  const origin = req?.headers.get('origin') || '*'
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  headers.set('Access-Control-Expose-Headers', 'X-Bolu-Source, Content-Length')
  headers.set('Access-Control-Max-Age', '86400')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export async function router(req: Request): Promise<Response> {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return withCors(new Response(null, { status: 204 }), req)
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
    } catch {
      return withCors(
        new Response(JSON.stringify({ error: 'Not Found', path: url.pathname }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
        req,
      )
    }

    const method = req.method.toUpperCase()
    const handler = typeof mod[method] === 'function' ? mod[method] : null

    if (!handler) {
      return withCors(
        new Response(JSON.stringify({ error: `Method ${method} Not Allowed` }), {
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

if (typeof Bun !== 'undefined' && Bun?.serve) {
  console.log(`[Bourxe API] Server starting on port ${port}...`)
  Bun.serve({
    port,
    fetch(req: Request) {
      return router(req)
    },
  })
  console.log(`[Bourxe API] Server running at http://0.0.0.0:${port}`)
}
