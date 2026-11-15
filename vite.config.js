import path from 'path'
import fs from 'fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'

// Vite only exposes VITE_* vars to the client via import.meta.env. Serverless
// handlers run in Node and read process.env, which Vite never populates from
// .env files. Load them here for the SSR API context only; real process env
// always wins, and nothing is added to the client bundle.
function loadServerEnv(mode) {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function apiDevServerPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      loadServerEnv(server.config.mode)
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next()
        }

        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost:5000'}`)
        const routeName = urlObj.pathname.replace(/^\/api\/?/, '').split('/')[0]

        if (!routeName) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'API route not specified.' }))
          return
        }

        const filePath = path.resolve(__dirname, 'api', `${routeName}.ts`)
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `API route not found: /api/${routeName}` }))
          return
        }

        try {
          const chunks = []
          for await (const chunk of req) {
            chunks.push(chunk)
          }
          const bodyBuffer = Buffer.concat(chunks)

          const requestHeaders = new Headers()
          for (const [key, value] of Object.entries(req.headers)) {
            if (value !== undefined) {
              if (Array.isArray(value)) {
                value.forEach((v) => requestHeaders.append(key, v))
              } else {
                requestHeaders.set(key, value)
              }
            }
          }

          const webRequest = new Request(urlObj.toString(), {
            method: req.method,
            headers: requestHeaders,
            body: req.method !== 'GET' && req.method !== 'HEAD' && bodyBuffer.length > 0 ? bodyBuffer : undefined,
          })

          const mod = await server.ssrLoadModule(filePath)
          const handler = mod.default
          if (typeof handler !== 'function') {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Handler not exported as default in ${routeName}.ts` }))
            return
          }

          const webResponse = await handler(webRequest)

          res.statusCode = webResponse.status
          webResponse.headers.forEach((val, headerKey) => {
            res.setHeader(headerKey, val)
          })

          const arrayBuf = await webResponse.arrayBuffer()
          res.end(Buffer.from(arrayBuf))
        } catch (err) {
          console.error(`[apiDevServerPlugin] Error executing /api/${routeName}:`, err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal dev API error' }))
        }
      })
    },
  }
}

function resolveJsToTsPlugin() {
  return {
    name: 'resolve-js-to-ts',
    resolveId(source, importer) {
      if (source.endsWith('.js') && (source.startsWith('./') || source.startsWith('../') || source.startsWith('@/'))) {
        const basePath = source.startsWith('@/')
          ? path.resolve(__dirname, 'src', source.slice(2))
          : importer
            ? path.resolve(path.dirname(importer), source)
            : null
        if (basePath) {
          const tsPath = basePath.replace(/\.js$/, '.ts')
          if (fs.existsSync(tsPath)) return tsPath
          const tsxPath = basePath.replace(/\.js$/, '.tsx')
          if (fs.existsSync(tsxPath)) return tsxPath
        }
      }
      return null
    },
  }
}

export default defineConfig({
  // ponytail: wasm() exists only for @formepdf/core's wasm-pack ESM
  // output; remove it if the Forme dependency goes.
  plugins: [resolveJsToTsPlugin(), wasm(), react(), apiDevServerPlugin()],
  base: './',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
})
