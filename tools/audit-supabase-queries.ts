/**
 * Supabase Query Pattern Auditor
 *
 * Scans the codebase for Supabase query patterns that use JSON operators
 * (->, ->>, @>, ?) on the TEXT-backed `custom_fields` column.
 * These patterns silently fail or return empty on Supabase TEXT columns.
 *
 * Run: npx tsx tools/audit-supabase-queries.ts
 * CI:  node --loader ts-node/esm tools/audit-supabase-queries.ts
 *
 * Returns exit code 1 if any violation is found.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SRC_DIR = resolve(__dirname, '..', 'src')

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx'])

const FORBIDDEN_PATTERNS: Array<{
  regex: RegExp
  label: string
  severity: 'error' | 'warn'
}> = [
  {
    regex: /custom_fields\s*->\s*'advance_invoice'\s*->>\s*'parentId'/g,
    label: 'custom_fields->advance_invoice->>parentId (JSONB arrow operator on TEXT column)',
    severity: 'error',
  },
  {
    regex: /custom_fields\s*->>\s*'advance_invoice'/g,
    label: 'custom_fields->>advance_invoice (JSONB ->> operator on TEXT column)',
    severity: 'error',
  },
  {
    regex: /custom_fields\s*->\s*'advance_invoice'/g,
    label: 'custom_fields->advance_invoice (JSONB -> operator on TEXT column)',
    severity: 'error',
  },
  {
    regex: /\.eq\(\s*'custom_fields\s*->/g,
    label: '.eq("custom_fields->...") uses JSONB operator on TEXT column',
    severity: 'error',
  },
  {
    regex: /\.filter\(\s*'custom_fields'\s*,\s*'/g,
    label: '.filter("custom_fields", "...") may use operator on TEXT column',
    severity: 'error',
  },
]

const ALLOWLIST_FILES = new Set([
  relative(process.cwd(), resolve(__dirname, 'audit-supabase-queries.ts')),
])

function walkDir(dir: string, fileList: string[] = []): string[] {
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === 'dist' || entry === 'build') {
        continue
      }
      walkDir(fullPath, fileList)
    } else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf('.')))) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

function audit() {
  if (!statSync(SRC_DIR, { throwIfNoEntry: false })) {
    console.error(`ERROR: src directory not found at ${SRC_DIR}`)
    process.exit(1)
  }

  const files = walkDir(SRC_DIR)
  let totalViolations = 0
  const violationsByFile = new Map<string, Array<{ line: number; pattern: string; severity: string }>>()

  for (const filePath of files) {
    const relativePath = relative(process.cwd(), filePath)
    if (ALLOWLIST_FILES.has(relativePath)) continue

    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    for (const pattern of FORBIDDEN_PATTERNS) {
      pattern.regex.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = pattern.regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length
        const fullLine = lines[lineNumber - 1]?.trim() || ''

        if (!violationsByFile.has(relativePath)) {
          violationsByFile.set(relativePath, [])
        }
        violationsByFile.get(relativePath)!.push({
          line: lineNumber,
          pattern: pattern.label,
          severity: pattern.severity,
        })
        totalViolations++
      }
    }
  }

  if (totalViolations === 0) {
    console.log(`\n✓ No forbidden Supabase query patterns found in ${files.length} source files.\n`)
    return 0
  }

  console.error(`\n✗ Found ${totalViolations} forbidden Supabase query pattern(s):\n`)

  for (const [file, violations] of violationsByFile.entries()) {
    console.error(`  ${file}:`)
    for (const violation of violations) {
      console.error(`    L${violation.line}: ${violation.pattern} [${violation.severity}]`)
    }
    console.error()
  }

  console.error(
    'The custom_fields column is TEXT in Supabase. Use ilike() or .or() with ilike patterns.\n' +
    'Example: .ilike("custom_fields", \'%"parentId":"' + '${id}' + '"%\')n'
  )

  return 1
}

const exitCode = audit()
process.exit(exitCode)
