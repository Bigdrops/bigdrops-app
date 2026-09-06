import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sqlPath = resolve('supabase/migrations/20260906140000_accounting_remediation.sql')
const sql = readFileSync(sqlPath, 'utf8')

// We want to count the number of %I/%L/%s placeholders in each
// EXECUTE format() ... $q$ ... $q$ ...); block, and print the
// SQL string and the args string for manual review.

// The format() calls look like:
// EXECUTE format(
//     $q$
//     ... SQL string with %I, %L, %s placeholders ...
//     $q$
//     ... args ...
// );

// We'll capture the SQL string (between $q$ and the next $q$)
// and the following args (after the second $q$ up to the closing );)
// and count the placeholders.

const formatCallRegex = /EXECUTE format\(\s*\$q\$([\s\S]*?)\$q\$([\s\S]*?)\);/g
let match

console.log('=== format() blocks ===\n')
const seen = new Set()

while ((match = formatCallRegex.exec(sql)) !== null) {
  const sqlText = match[1]
  const argsText = match[2]
  const placeholders = (sqlText.match(/%[IL0-9]+/g) || []).length
  const argTokens = (argsText.match(/'[^']*'|"[^"]*"|[^,]+/g) || [])
    .filter(t => t.trim().length > 0)
  const argCount = argTokens.length

  const key = sqlText.slice(0, 100) + argsText.slice(0, 100)
  if (seen.has(key)) {
    console.log('(duplicate block skipped)')
    continue
  }
  seen.add(key)

  console.log([
    'placeholders:', placeholders,
    'arg tokens:', argCount,
    (placeholders !== argCount ? 'MISMATCH' : 'OK'),
    'SQL snippet:',
    sqlText.slice(0, 500),
    'Args snippet:',
    argsText.slice(0, 500),
    '---'
  ].join('\n'))
}

console.log('\n=== post_from_source_transaction() calls ===\n')
const postRegex = /v_post_result\s*:=\s*public\.post_from_source_transaction\(([\s\S]*?)\);/g
let postMatch
while ((postMatch = postRegex.exec(sql)) !== null) {
  console.log([
    postMatch[1].slice(0, 800),
    '---'
  ].join('\n'))
}
