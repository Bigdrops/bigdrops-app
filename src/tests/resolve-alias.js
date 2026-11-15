/**
 * Node test loader for the critical harness.
 *
 * Responsibilities
 *   1. Resolve the `@/` alias and extensionless relative specifiers, including
 *      the `.js` -> `.ts`/`.tsx` mapping the app relies on.
 *   2. Compile `.ts`/`.tsx` modules through esbuild so component modules that
 *      the suite inspects can actually be imported (Node strips types but
 *      cannot read JSX).
 *   3. Replace `import.meta.env` with a guarded global. Vite injects it in the
 *      app; Node has no such object, so any module that reads it used to throw
 *      before a single assertion ran.
 *   4. Return an empty module for style and asset imports, which Node cannot
 *      evaluate.
 *
 * This file only affects the test process. It never runs in the app bundle.
 */

import { resolve as pathResolve, extname } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { accessSync, readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'

const srcDir = pathResolve(fileURLToPath(new URL('.', import.meta.url)), '..')

const sourceExtensions = ['.ts', '.mts', '.tsx']
const allExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts']

/** Style and asset modules are not evaluated by Node. */
const ASSET_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less'])
const ASSET_FILE =
  /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|html|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|pdf)(\?.*)?$/i

function tryResolve(base) {
  const ext = extname(base)
  if (ext) {
    try {
      accessSync(base)
      return base
    } catch {}
    if (ext === '.js') {
      const tsBase = base.slice(0, -3)
      for (const e of sourceExtensions) {
        try {
          accessSync(tsBase + e)
          return tsBase + e
        } catch {}
      }
    }
    return null
  }
  for (const e of allExtensions) {
    try {
      accessSync(base + e)
      return base + e
    } catch {}
  }
  // Directory barrel imports (e.g. '@/domain/invoice' -> '@/domain/invoice/index.ts').
  for (const e of allExtensions) {
    try {
      accessSync(base + '/index' + e)
      return base + '/index' + e
    } catch {}
  }
  return null
}

function resolveAlias(specifier, context, nextResolve) {
  const base = pathResolve(srcDir, specifier.slice(2))
  const found = tryResolve(base)
  if (found) return nextResolve(pathToFileURL(found).href, context)
  return nextResolve(specifier, context)
}

function resolveRelative(specifier, context, nextResolve) {
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const parent = fileURLToPath(context.parentURL)
    const base = pathResolve(pathResolve(parent, '..'), specifier)
    const found = tryResolve(base)
    if (found) return nextResolve(pathToFileURL(found).href, context)
  }
  return nextResolve(specifier, context)
}

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) return resolveAlias(specifier, context, nextResolve)
  return resolveRelative(specifier, context, nextResolve)
}

/**
 * `import.meta.env` is a Vite virtual. Node leaves it undefined, so a module
 * that reads `import.meta.env.VITE_SUPABASE_URL` throws on import. Point it at
 * a shared, empty-by-default object that tests may populate.
 */
const ENV_SHIM =
  'import.meta.env ?? (import.meta.env = (globalThis.__VITE_TEST_ENV__ ||= {' +
  " VITE_SUPABASE_URL: 'http://127.0.0.1:54321'," +
  " VITE_SUPABASE_ANON_KEY: 'test-anon-key'," +
  " VITE_SUPABASE_PUBLISHABLE_KEY: 'test-anon-key'" +
  ' }))'

function shimViteEnv(source) {
  if (!source.includes('import.meta.env')) return source
  // Only guard bare reads. `import.meta.env.X` and `import.meta.env?.[...]`
  // keep working once the object exists.
  return source.replace(/\bimport\.meta\.env\b(?!\s*\?\?|\s*\|\||\s*=)/g, `(${ENV_SHIM})`)
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && ASSET_FILE.test(url)) {
    return { format: 'module', source: 'export default {}', shortCircuit: true }
  }

  if (url.startsWith('file:')) {
    const filePath = fileURLToPath(url.split('?')[0])
    const ext = extname(filePath)
    if (ext === '.ts' || ext === '.tsx' || ext === '.mts') {
      const raw = readFileSync(filePath, 'utf8')
      const compiled = transformSync(raw, {
        loader: ext === '.tsx' ? 'tsx' : 'ts',
        format: 'esm',
        target: 'node22',
        jsx: 'automatic',
        sourcefile: filePath,
        sourcemap: 'inline',
        // Type-only syntax is erased; nothing here changes runtime behaviour.
        tsconfigRaw: { compilerOptions: { jsx: 'react-jsx' } },
      })
      return {
        format: 'module',
        source: shimViteEnv(compiled.code),
        shortCircuit: true,
      }
    }
  }

  const result = await nextLoad(url, context)
  if (result.format === 'module' && typeof result.source !== 'undefined' && result.source) {
    const text = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8')
    if (text.includes('import.meta.env')) {
      return { ...result, source: shimViteEnv(text), shortCircuit: true }
    }
  }
  return result
}

export { ASSET_EXTENSIONS }
