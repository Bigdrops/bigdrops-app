import { resolve as pathResolve, extname, isAbsolute } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { accessSync } from 'node:fs'

const srcDir = pathResolve(fileURLToPath(new URL('.', import.meta.url)), '..')

const sourceExtensions = ['.ts', '.mts', '.tsx']
const allExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts']

function tryResolve(base) {
  const ext = extname(base)
  if (ext) {
    try { accessSync(base); return base } catch {}
    if (ext === '.js') {
      const tsBase = base.slice(0, -3)
      for (const e of sourceExtensions) {
        try { accessSync(tsBase + e); return tsBase + e } catch {}
      }
    }
    return null
  }
  for (const e of allExtensions) {
    try { accessSync(base + e); return base + e } catch {}
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
