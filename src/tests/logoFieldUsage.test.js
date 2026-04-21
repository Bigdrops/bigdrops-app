import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const allowedLegacyFiles = new Set([
  path.resolve(srcDir, 'hooks/useSettings.js'),
])

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(fullPath))
      continue
    }
    files.push(fullPath)
  }

  return files
}

test('legacy logo field names are isolated from active src logic', () => {
  const offenders = []

  for (const filePath of walk(srcDir)) {
    if (!/\.(js|jsx|ts|tsx)$/.test(filePath)) continue
    if (filePath.includes(`${path.sep}tests${path.sep}`)) continue
    if (allowedLegacyFiles.has(filePath)) continue

    const source = fs.readFileSync(filePath, 'utf8')
    if (/\blogo_url\b/.test(source) || /\blogoUrl\b/.test(source)) {
      offenders.push(path.relative(srcDir, filePath))
    }
  }

  assert.deepEqual(offenders, [])
})
