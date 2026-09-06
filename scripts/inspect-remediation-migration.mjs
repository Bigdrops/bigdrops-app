import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = resolve('supabase/migrations/20260906140000_accounting_remediation.sql')

const sql = readFileSync(here, 'utf8')

// Split on the $function$ ... $function$ boundary
const blocks = []
let current = []
let inBlock = false
let idx = 0
for (const line of sql.split(/\r?\n/)) {
  if (line.trim() === '$function$') {
    inBlock = !inBlock
    if (!inBlock) {
      blocks.push({ idx: idx, start: current[0]?.lineNumber ?? null, text: current.join('\n') })
      current = []
      idx = 0
    }
    continue
  }
  if (inBlock) {
    idx++
    current.push({ lineNumber: idx, text: line })
  }
}

function countPlaceholders(text) {
  // %I, %L, %s placeholders inside the SQL string.
  const matches = text.match(/(?<!%)(?<!\%%)(?<!\$)(%[IL0-9]+)/g)
  return matches ? matches.length : 0
}

function parseArgs(text) {
  // placeholder to keep lint quiet
  return null
}

console.log('\n=== format() BLOCK HERE ===\n')

for (const block of blocks) {
  const text = block.text
  // Extract the format() calls
  const regex = /EXECUTE format\(\s*\$q\$(.*?)\$q\$(.*?)\)/gs
  let match
  while ((match = regex.exec(text)) !== null) {
    const sqlText = match[1]
    const argsText = match[2]
    const phCount = countPlaceholders(sqlText)
    const argTokens = argsText.match(/'[^']*'|"[^"]*"|[^,]+/g) || []
    const argCount = argTokens.filter(t => t.trim().length > 0).length

}

console.log('\n=== post_from_source_transaction() CALLS ===\n')
const postRegex = /v_post_result\s*:=\s*public\.post_from_source_transaction\((.*?)\);/gs
let postMatch
while ((postMatch = postRegex.exec(sql)) !== null) {
  console.log([
    'post_from_source_transaction call at line',
    // approximate line number from earlier block
    'line containing call:',
    postMatch[1].slice(0, 500)
  ].join('\n'))
}
